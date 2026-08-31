import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, POStatus, WorkflowModule } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { startWorkflowInstance } from '../services/workflowEngine';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

export const poRouter = Router();

// List Purchase Orders
poRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, supplierId } = req.query;

  let query = `
    SELECT p.*, s.legal_name as supplier_name, s.supplier_code,
           u.first_name as creator_first, u.last_name as creator_last,
           (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = p.id) as item_count,
           (SELECT COUNT(*) FROM goods_receipts WHERE po_id = p.id) as grn_count,
           (SELECT COUNT(*) FROM invoices WHERE po_id = p.id) as invoice_count
    FROM purchase_orders p
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = p.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` AND p.supplier_id = ? AND p.status NOT IN ('Draft', 'Approval')`;
    params.push(req.user.supplier_id);
  } else if (supplierId) {
    query += ` AND p.supplier_id = ?`;
    params.push(supplierId);
  }

  if (status) {
    query += ` AND p.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY p.created_at DESC`;
  const pos = db.prepare(query).all(...params);

  return res.json(pos);
});

// Single PO Details
poRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const poId = req.params.id;

  const po = db.prepare(`
    SELECT p.*, s.legal_name as supplier_name, s.supplier_code, s.tax_number, s.address as supplier_address,
           s.country as supplier_country,
           u.first_name as creator_first, u.last_name as creator_last, u.email as creator_email,
           c.contract_number, pr.request_number
    FROM purchase_orders p
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = p.created_by
    LEFT JOIN contracts c ON c.id = p.contract_id
    LEFT JOIN procurement_requests pr ON pr.id = p.requisition_id
    WHERE p.id = ?
  `).get(poId) as any;

  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  // Security Check
  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id !== po.supplier_id) {
    return res.status(403).json({ error: 'Unauthorized to view this purchase order' });
  }

  const items = db.prepare(`SELECT * FROM purchase_order_items WHERE po_id = ? ORDER BY item_number ASC`).all(poId);
  const receipts = db.prepare(`SELECT * FROM goods_receipts WHERE po_id = ? ORDER BY delivery_date DESC`).all(poId);
  const invoices = db.prepare(`SELECT * FROM invoices WHERE po_id = ? ORDER BY invoice_date DESC`).all(poId);

  return res.json({ po, items, receipts, invoices });
});

// Create Purchase Order
poRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      supplierId,
      contractId,
      eventId,
      requisitionId,
      deliveryAddress,
      deliveryDate,
      paymentTerms,
      currency = 'USD',
      items = [],
      isDraft = false
    } = req.body;

    if (!supplierId || !deliveryAddress || !deliveryDate || items.length === 0) {
      return res.status(400).json({ error: 'Missing mandatory purchase order fields or items' });
    }

    const poId = crypto.randomUUID();
    const poNumber = getNextNumber('PO');

    let totalAmount = 0;
    let taxAmount = 0;

    for (const it of items) {
      const lineNet = (it.quantity || 0) * (it.unitPrice || 0);
      const lineTax = lineNet * ((it.taxRate || 0) / 100);
      totalAmount += lineNet;
      taxAmount += lineTax;
    }
    const grandTotal = totalAmount + taxAmount;
    const initialStatus = isDraft ? POStatus.DRAFT : POStatus.APPROVAL;

    db.prepare(`
      INSERT INTO purchase_orders (
        id, po_number, supplier_id, contract_id, event_id, requisition_id,
        total_amount, tax_amount, grand_total, currency, delivery_address,
        delivery_date, payment_terms, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      poId,
      poNumber,
      supplierId,
      contractId || null,
      eventId || null,
      requisitionId || null,
      totalAmount,
      taxAmount,
      grandTotal,
      currency,
      deliveryAddress,
      deliveryDate,
      paymentTerms || 'Net 30',
      initialStatus,
      req.user!.id
    );

    // Insert Line Items
    items.forEach((it: any, idx: number) => {
      const lineTotal = (it.quantity || 0) * (it.unitPrice || 0);
      db.prepare(`
        INSERT INTO purchase_order_items (
          id, po_id, item_number, description, quantity, unit, unit_price, tax_rate, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        poId,
        idx + 1,
        it.description,
        it.quantity,
        it.unit || 'Units',
        it.unitPrice,
        it.taxRate || 0,
        lineTotal
      );
    });

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: isDraft ? 'CREATE_PO_DRAFT' : 'SUBMIT_PO',
      module: 'PURCHASE_ORDER',
      recordId: poId,
      comments: `Created PO ${poNumber} for $${grandTotal}`
    });

    // If submitted, trigger dynamic approval workflow
    if (!isDraft) {
      startWorkflowInstance({
        module: WorkflowModule.PURCHASE_ORDER,
        recordId: poId,
        referenceNumber: poNumber,
        requestedBy: req.user!.id,
        amount: grandTotal
      });
    }

    return res.status(201).json({
      message: isDraft ? 'PO saved as draft.' : 'PO submitted for approval workflow!',
      poId,
      poNumber,
      grandTotal,
      status: initialStatus
    });
  } catch (err: any) {
    console.error('PO creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create purchase order' });
  }
});

// Supplier Accept / Reject Purchase Order
poRouter.post('/:id/respond', authenticateToken, (req: AuthRequest, res: Response) => {
  const poId = req.params.id;
  const { action, reason } = req.body; // 'Accept' | 'Reject'

  if (!req.user?.supplier_id) {
    return res.status(403).json({ error: 'Only authorized suppliers can acknowledge POs.' });
  }

  const po = db.prepare(`SELECT * FROM purchase_orders WHERE id = ? AND supplier_id = ?`).get(poId, req.user.supplier_id) as any;
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const newStatus = action === 'Accept' ? POStatus.SUPPLIER_ACCEPTED : POStatus.SUPPLIER_REJECTED;

  db.prepare(`
    UPDATE purchase_orders 
    SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(newStatus, reason || null, poId);

  // Notify buyer / creator
  sendNotification(
    po.created_by,
    `PO ${po.po_number} ${action}ed by Supplier`,
    `Supplier has ${action.toLowerCase()}ed PO ${po.po_number}.${reason ? ' Reason: ' + reason : ''}`,
    action === 'Accept' ? 'SUCCESS' : 'WARNING',
    'PURCHASE_ORDER',
    poId
  );

  logAudit({
    userId: req.user.id,
    userEmail: req.user.email,
    userRole: req.user.role,
    action: `PO_SUPPLIER_${action.toUpperCase()}`,
    module: 'PURCHASE_ORDER',
    recordId: poId,
    comments: `Supplier response: ${action}. ${reason || ''}`
  });

  return res.json({ message: `PO successfully ${action.toLowerCase()}ed!`, status: newStatus });
});

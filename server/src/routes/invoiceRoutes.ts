import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, InvoiceStatus, WorkflowModule } from '../config/constants';
import { perform3WayMatch } from '../services/matchingEngine';
import { startWorkflowInstance } from '../services/workflowEngine';
import { logAudit } from '../services/auditService';

export const invoiceRouter = Router();

// List Invoices
invoiceRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, supplierId, matchingStatus } = req.query;

  let query = `
    SELECT i.*, s.legal_name as supplier_name, s.supplier_code,
           p.po_number, p.grand_total as po_total,
           (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i
    JOIN suppliers s ON s.id = i.supplier_id
    JOIN purchase_orders p ON p.id = i.po_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` AND i.supplier_id = ?`;
    params.push(req.user.supplier_id);
  } else if (supplierId) {
    query += ` AND i.supplier_id = ?`;
    params.push(supplierId);
  }

  if (status) {
    query += ` AND i.status = ?`;
    params.push(status);
  }
  if (matchingStatus) {
    query += ` AND i.matching_status = ?`;
    params.push(matchingStatus);
  }

  query += ` ORDER BY i.created_at DESC`;
  const invoices = db.prepare(query).all(...params);

  return res.json(invoices);
});

// Single Invoice Details with 3-Way Discrepancy Breakdown
invoiceRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const invoiceId = req.params.id;

  const invoice = db.prepare(`
    SELECT i.*, s.legal_name as supplier_name, s.supplier_code, s.tax_number,
           p.po_number, p.grand_total as po_total, p.created_at as po_date
    FROM invoices i
    JOIN suppliers s ON s.id = i.supplier_id
    JOIN purchase_orders p ON p.id = i.po_id
    WHERE i.id = ?
  `).get(invoiceId) as any;

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare(`
    SELECT ii.*, poi.description as po_description, poi.quantity as po_quantity, poi.unit_price as po_unit_price, poi.unit
    FROM invoice_items ii
    JOIN purchase_order_items poi ON poi.id = ii.po_item_id
    WHERE ii.invoice_id = ?
  `).all(invoiceId);

  const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ?`).all(invoiceId);

  return res.json({ invoice, items, payments });
});

// Submit Invoice (Supplier or AP User)
invoiceRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      invoiceNumber,
      poId,
      contractId,
      supplierId: reqSupplierId,
      invoiceDate,
      dueDate,
      items = [],
      currency = 'USD'
    } = req.body;

    const supplierId = req.user?.supplier_id || reqSupplierId;

    if (!invoiceNumber || !poId || !supplierId || !invoiceDate || !dueDate || items.length === 0) {
      return res.status(400).json({ error: 'Missing mandatory invoice fields or line items' });
    }

    const invoiceId = crypto.randomUUID();

    let subtotal = 0;
    let taxAmount = 0;

    for (const it of items) {
      const lineNet = (it.quantity || 0) * (it.unitPrice || 0);
      const lineTax = lineNet * ((it.taxRate || 0) / 100);
      subtotal += lineNet;
      taxAmount += lineTax;
    }
    const totalAmount = subtotal + taxAmount;

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, supplier_id, po_id, contract_id, invoice_date, due_date,
        subtotal, tax_amount, total_amount, currency, status, matching_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'Under Verification')
    `).run(
      invoiceId,
      invoiceNumber,
      supplierId,
      poId,
      contractId || null,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      currency
    );

    // Insert Invoice Items
    for (const it of items) {
      const lineTotal = (it.quantity || 0) * (it.unitPrice || 0);
      db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, po_item_id, description, quantity, unit_price, tax_rate, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        invoiceId,
        it.poItemId,
        it.description,
        it.quantity,
        it.unitPrice,
        it.taxRate || 0,
        lineTotal
      );
    }

    // Automatically Trigger 3-Way Matching Engine!
    const matchResult = perform3WayMatch(invoiceId);

    // If fully matched, trigger invoice dynamic approval workflow
    if (matchResult.isMatched) {
      startWorkflowInstance({
        module: WorkflowModule.INVOICE,
        recordId: invoiceId,
        referenceNumber: invoiceNumber,
        requestedBy: req.user!.id,
        amount: totalAmount
      });
    }

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'SUBMIT_INVOICE',
      module: 'INVOICE',
      recordId: invoiceId,
      comments: `Submitted invoice ${invoiceNumber} for $${totalAmount}. 3-Way Match: ${matchResult.status}`
    });

    return res.status(201).json({
      message: matchResult.isMatched
        ? 'Invoice submitted and 3-Way Matched successfully! Sent for approval.'
        : 'Invoice submitted but 3-Way Match identified exceptions. Moved to Exception Queue.',
      invoiceId,
      matchResult
    });
  } catch (err: any) {
    console.error('Invoice creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit invoice' });
  }
});

// Re-run 3-Way Match Manual Trigger
invoiceRouter.post('/:id/run-match', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const matchResult = perform3WayMatch(req.params.id);
    return res.json({ message: `3-Way match executed: ${matchResult.status}`, matchResult });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Match error' });
  }
});

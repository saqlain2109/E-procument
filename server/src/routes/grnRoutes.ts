import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, POStatus } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

export const grnRouter = Router();

// List GRNs
grnRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { poId } = req.query;

  let query = `
    SELECT gr.*, p.po_number, s.legal_name as supplier_name, s.supplier_code,
           u.first_name as receiver_first, u.last_name as receiver_last,
           (SELECT COUNT(*) FROM goods_receipt_items WHERE grn_id = gr.id) as item_count
    FROM goods_receipts gr
    JOIN purchase_orders p ON p.id = gr.po_id
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = gr.received_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` AND p.supplier_id = ?`;
    params.push(req.user.supplier_id);
  }

  if (poId) {
    query += ` AND gr.po_id = ?`;
    params.push(poId);
  }

  query += ` ORDER BY gr.created_at DESC`;
  const grns = db.prepare(query).all(...params);

  return res.json(grns);
});

// Create GRN / Goods Receipt (Buyer verifies delivered items)
grnRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { poId, deliveryNumber, deliveryDate, notes, items = [] } = req.body;

    if (!poId || !deliveryNumber || !deliveryDate || items.length === 0) {
      return res.status(400).json({ error: 'Missing mandatory GRN fields or items' });
    }

    const po = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(poId) as any;
    if (!po) return res.status(404).json({ error: 'PO not found' });

    const grnId = crypto.randomUUID();
    const grnNumber = getNextNumber('GRN');

    db.prepare(`
      INSERT INTO goods_receipts (id, grn_number, po_id, delivery_number, delivery_date, received_by, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed')
    `).run(
      grnId,
      grnNumber,
      poId,
      deliveryNumber,
      deliveryDate,
      req.user!.id,
      notes || null
    );

    // Insert line items & update delivered quantity in PO items
    for (const it of items) {
      db.prepare(`
        INSERT INTO goods_receipt_items (
          id, grn_id, po_item_id, ordered_quantity, delivered_quantity, accepted_quantity, rejected_quantity, rejection_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        grnId,
        it.poItemId,
        it.orderedQuantity,
        it.deliveredQuantity,
        it.acceptedQuantity,
        it.rejectedQuantity || 0,
        it.rejectionReason || null
      );

      // Increment delivered quantity on PO item
      db.prepare(`
        UPDATE purchase_order_items 
        SET delivered_quantity = delivered_quantity + ? 
        WHERE id = ?
      `).run(it.acceptedQuantity, it.poItemId);
    }

    // Check if PO is fully delivered or partially delivered
    const poItems = db.prepare(`SELECT quantity, delivered_quantity FROM purchase_order_items WHERE po_id = ?`).all(poId) as any[];
    const isFull = poItems.every((pi) => pi.delivered_quantity >= pi.quantity);
    const newPoStatus = isFull ? POStatus.COMPLETED : POStatus.PARTIALLY_DELIVERED;

    db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newPoStatus, poId);

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'CREATE_GRN',
      module: 'GOODS_RECEIPT',
      recordId: grnId,
      comments: `Recorded GRN ${grnNumber} for PO ${po.po_number}. Delivery status: ${newPoStatus}`
    });

    return res.status(201).json({
      message: `Goods receipt note ${grnNumber} generated successfully!`,
      grnId,
      grnNumber,
      poStatus: newPoStatus
    });
  } catch (err: any) {
    console.error('GRN creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create goods receipt note' });
  }
});

import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

export const paymentRouter = Router();

// List Payments
paymentRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { supplierId } = req.query;

  let query = `
    SELECT py.*, s.legal_name as supplier_name, s.supplier_code, i.invoice_number, p.po_number
    FROM payments py
    JOIN suppliers s ON s.id = py.supplier_id
    JOIN invoices i ON i.id = py.invoice_id
    JOIN purchase_orders p ON p.id = i.po_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` AND py.supplier_id = ?`;
    params.push(req.user.supplier_id);
  } else if (supplierId) {
    query += ` AND py.supplier_id = ?`;
    params.push(supplierId);
  }

  query += ` ORDER BY py.payment_date DESC`;
  const payments = db.prepare(query).all(...params);

  return res.json(payments);
});

// Process Payment (Finance User)
paymentRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod = 'Wire Transfer', paymentReference, bankAccountId, notes } = req.body;

    if (!invoiceId || !amount || !paymentDate || !paymentReference) {
      return res.status(400).json({ error: 'Missing mandatory payment details' });
    }

    const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const paymentId = crypto.randomUUID();
    const paymentNumber = getNextNumber('PAY');

    db.prepare(`
      INSERT INTO payments (
        id, payment_number, invoice_id, supplier_id, amount, currency, payment_date,
        payment_method, payment_reference, bank_account_id, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?)
    `).run(
      paymentId,
      paymentNumber,
      invoiceId,
      invoice.supplier_id,
      amount,
      invoice.currency || 'USD',
      paymentDate,
      paymentMethod,
      paymentReference,
      bankAccountId || null,
      notes || null,
      req.user!.id
    );

    // Update invoice status to Paid
    db.prepare(`UPDATE invoices SET status = 'Paid' WHERE id = ?`).run(invoiceId);

    // Notify supplier
    const supplierUser = db.prepare(`SELECT id FROM users WHERE supplier_id = ? LIMIT 1`).get(invoice.supplier_id) as any;
    if (supplierUser) {
      sendNotification(
        supplierUser.id,
        `Payment Processed: Invoice ${invoice.invoice_number}`,
        `Payment ${paymentNumber} of $${amount} has been disbursed. Ref: ${paymentReference}`,
        'SUCCESS',
        'PAYMENT',
        paymentId
      );
    }

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'PROCESS_PAYMENT',
      module: 'PAYMENT',
      recordId: paymentId,
      comments: `Processed payment ${paymentNumber} for invoice ${invoice.invoice_number} - Amount: $${amount}`
    });

    return res.status(201).json({
      message: 'Payment processed and disbursed successfully!',
      paymentId,
      paymentNumber
    });
  } catch (err: any) {
    console.error('Payment error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process payment' });
  }
});

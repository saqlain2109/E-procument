import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, WorkflowModule } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { logAudit } from '../services/auditService';
import { startWorkflowInstance } from '../services/workflowEngine';

export const contractRouter = Router();

// List Contracts
contractRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, supplierId } = req.query;

  let query = `
    SELECT c.*, s.legal_name as supplier_name, s.supplier_code,
           u.first_name as manager_first, u.last_name as manager_last,
           (SELECT COUNT(*) FROM contract_milestones WHERE contract_id = c.id) as milestone_count,
           (SELECT COUNT(*) FROM contract_amendments WHERE contract_id = c.id) as amendment_count
    FROM contracts c
    JOIN suppliers s ON s.id = c.supplier_id
    JOIN users u ON u.id = c.contract_manager_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` AND c.supplier_id = ? AND c.status = 'Active'`;
    params.push(req.user.supplier_id);
  } else if (supplierId) {
    query += ` AND c.supplier_id = ?`;
    params.push(supplierId);
  }

  if (status) {
    query += ` AND c.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY c.created_at DESC`;
  const contracts = db.prepare(query).all(...params);

  return res.json(contracts);
});

// Single Contract Details
contractRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const contractId = req.params.id;

  const contract = db.prepare(`
    SELECT c.*, s.legal_name as supplier_name, s.supplier_code, s.tax_number,
           u.first_name as manager_first, u.last_name as manager_last, u.email as manager_email,
           e.title as event_title, e.event_number
    FROM contracts c
    JOIN suppliers s ON s.id = c.supplier_id
    JOIN users u ON u.id = c.contract_manager_id
    LEFT JOIN procurement_events e ON e.id = c.event_id
    WHERE c.id = ?
  `).get(contractId) as any;

  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const milestones = db.prepare(`SELECT * FROM contract_milestones WHERE contract_id = ? ORDER BY due_date ASC`).all(contractId);
  const amendments = db.prepare(`SELECT * FROM contract_amendments WHERE contract_id = ? ORDER BY created_at DESC`).all(contractId);

  return res.json({ contract, milestones, amendments });
});

// Create Contract
contractRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      supplierId,
      eventId,
      awardId,
      contractValue,
      currency = 'USD',
      startDate,
      endDate,
      paymentTerms,
      deliveryTerms,
      renewalTerms,
      noticePeriodDays = 30,
      milestones = []
    } = req.body;

    if (!title || !supplierId || !contractValue || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing mandatory contract fields' });
    }

    const contractId = crypto.randomUUID();
    const contractNumber = getNextNumber('CON');

    db.prepare(`
      INSERT INTO contracts (
        id, contract_number, title, supplier_id, event_id, award_id, contract_value, currency,
        start_date, end_date, payment_terms, delivery_terms, contract_manager_id, renewal_terms,
        notice_period_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `).run(
      contractId,
      contractNumber,
      title,
      supplierId,
      eventId || null,
      awardId || null,
      contractValue,
      currency,
      startDate,
      endDate,
      paymentTerms || null,
      deliveryTerms || null,
      req.user!.id,
      renewalTerms || null,
      noticePeriodDays
    );

    // Insert milestones
    milestones.forEach((m: any, idx: number) => {
      db.prepare(`
        INSERT INTO contract_milestones (id, contract_id, milestone_number, title, description, due_date, amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
      `).run(
        crypto.randomUUID(),
        contractId,
        idx + 1,
        m.title,
        m.description || null,
        m.dueDate,
        m.amount
      );
    });

    logAudit({
      userId: req.user!.id,
      action: 'CREATE_CONTRACT',
      module: 'CONTRACT',
      recordId: contractId,
      comments: `Created contract ${contractNumber} (${title}) for $${contractValue}`
    });

    return res.status(201).json({
      message: 'Contract executed successfully!',
      contractId,
      contractNumber
    });
  } catch (err: any) {
    console.error('Contract creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create contract' });
  }
});

// Add Contract Amendment
contractRouter.post('/:id/amendments', authenticateToken, (req: AuthRequest, res: Response) => {
  const contractId = req.params.id;
  const { reason, valueChange = 0, extendedEndDate } = req.body;

  const amendId = crypto.randomUUID();
  const amendNum = `AMD-${Date.now().toString().slice(-4)}`;

  db.prepare(`
    INSERT INTO contract_amendments (id, contract_id, amendment_number, reason, value_change, extended_end_date, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(amendId, contractId, amendNum, reason, valueChange, extendedEndDate || null, req.user!.email);

  if (valueChange !== 0) {
    db.prepare(`UPDATE contracts SET contract_value = contract_value + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(valueChange, contractId);
  }
  if (extendedEndDate) {
    db.prepare(`UPDATE contracts SET end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(extendedEndDate, contractId);
  }

  logAudit({
    userId: req.user!.id,
    action: 'AMEND_CONTRACT',
    module: 'CONTRACT',
    recordId: contractId,
    comments: `Amendment ${amendNum}: ${reason} (Value diff: $${valueChange})`
  });

  return res.json({ message: 'Contract amendment recorded successfully!' });
});

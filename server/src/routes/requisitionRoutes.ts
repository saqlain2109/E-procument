import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getNextNumber } from '../services/numberGenerator';
import { startWorkflowInstance } from '../services/workflowEngine';
import { logAudit } from '../services/auditService';
import { WorkflowModule } from '../config/constants';

export const requisitionRouter = Router();

// List Requisitions
requisitionRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, departmentId } = req.query;

  let query = `
    SELECT pr.*, d.name as department_name, u.first_name, u.last_name, u.email as requester_email,
           (SELECT COUNT(*) FROM procurement_request_items WHERE request_id = pr.id) as item_count
    FROM procurement_requests pr
    JOIN departments d ON d.id = pr.requesting_department_id
    JOIN users u ON u.id = pr.requester_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ` AND pr.status = ?`;
    params.push(status);
  }
  if (departmentId) {
    query += ` AND pr.requesting_department_id = ?`;
    params.push(departmentId);
  }

  query += ` ORDER BY pr.created_at DESC`;
  const requisitions = db.prepare(query).all(...params);

  return res.json(requisitions);
});

// Get Single Requisition Details
requisitionRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const pr = db.prepare(`
    SELECT pr.*, d.name as department_name, u.first_name, u.last_name, u.email as requester_email,
           cc.name as cost_center_name, cc.code as cost_center_code
    FROM procurement_requests pr
    JOIN departments d ON d.id = pr.requesting_department_id
    JOIN users u ON u.id = pr.requester_id
    LEFT JOIN cost_centers cc ON cc.id = pr.cost_center_id
    WHERE pr.id = ?
  `).get(req.params.id) as any;

  if (!pr) return res.status(404).json({ error: 'Purchase requisition not found' });

  const items = db.prepare(`SELECT * FROM procurement_request_items WHERE request_id = ? ORDER BY item_number ASC`).all(pr.id);

  return res.json({ pr, items });
});

// Create Requisition
requisitionRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      requestingDepartmentId,
      procurementCategory,
      description,
      requiredDate,
      deliveryLocation,
      costCenterId,
      justification,
      items,
      isDraft
    } = req.body;

    if (!title || !requestingDepartmentId || !requiredDate || !deliveryLocation || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required purchase requisition fields or line items' });
    }

    const prId = crypto.randomUUID();
    const requestNumber = getNextNumber('PR');
    const status = isDraft ? 'Draft' : 'Submitted';

    let estimatedTotal = 0;
    for (const item of items) {
      estimatedTotal += (item.quantity || 0) * (item.estimatedUnitPrice || 0);
    }

    db.prepare(`
      INSERT INTO procurement_requests (
        id, request_number, title, requesting_department_id, requester_id, procurement_category,
        description, estimated_total, required_date, delivery_location, cost_center_id, justification, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prId,
      requestNumber,
      title,
      requestingDepartmentId,
      req.user!.id,
      procurementCategory || 'General',
      description || null,
      estimatedTotal,
      requiredDate,
      deliveryLocation,
      costCenterId || null,
      justification || null,
      status
    );

    // Insert Items
    items.forEach((item: any, idx: number) => {
      const lineTotal = (item.quantity || 0) * (item.estimatedUnitPrice || 0);
      db.prepare(`
        INSERT INTO procurement_request_items (
          id, request_id, item_number, description, specification, quantity, unit, estimated_unit_price, estimated_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        prId,
        idx + 1,
        item.description,
        item.specification || null,
        item.quantity,
        item.unit || 'Units',
        item.estimatedUnitPrice,
        lineTotal
      );
    });

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: isDraft ? 'CREATE_PR_DRAFT' : 'SUBMIT_PR',
      module: 'PURCHASE_REQUISITION',
      recordId: prId,
      comments: `Created requisition ${requestNumber} (${title}) for $${estimatedTotal}`
    });

    // If submitted, trigger dynamic approval workflow based on threshold
    if (!isDraft) {
      startWorkflowInstance({
        module: WorkflowModule.PURCHASE_REQUISITION,
        recordId: prId,
        referenceNumber: requestNumber,
        requestedBy: req.user!.id,
        amount: estimatedTotal,
        category: procurementCategory
      });
    }

    return res.status(201).json({
      message: isDraft ? 'Requisition draft saved.' : 'Requisition submitted for multi-level approval.',
      prId,
      requestNumber,
      estimatedTotal,
      status
    });
  } catch (err: any) {
    console.error('Requisition create error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create requisition' });
  }
});

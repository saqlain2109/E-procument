import { Router, Response } from 'express';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';
import { processApprovalAction, getApprovalTimeline } from '../services/workflowEngine';

export const approvalRouter = Router();

// Get Pending Approval Tasks for Current User
approvalRouter.get('/my-tasks', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;

  // Super Admin can view all tasks or role tasks
  let query = `
    SELECT t.*, i.module, i.record_id, i.reference_number, i.amount, i.requested_by, i.sla_deadline, i.created_at as submitted_at,
           l.level_name, l.sla_hours,
           u.first_name as requester_first, u.last_name as requester_last, u.email as requester_email,
           w.name as workflow_name,
           -- Resolved Entity fields
           s.legal_name as supplier_name, s.registration_number as supplier_reg_no, s.tax_number as supplier_tax_no, s.country as supplier_country,
           pr.title as pr_title, pr.procurement_category as pr_category, pr_dept.name as pr_dept_name,
           po.po_number, po_sup.legal_name as po_supplier_name,
           inv.invoice_number, inv_sup.legal_name as inv_supplier_name, inv.matching_status,
           awd_sup.legal_name as awd_supplier_name, awd_evt.title as awd_event_title
    FROM approval_tasks t
    JOIN approval_instances i ON i.id = t.instance_id
    JOIN approval_workflow_levels l ON l.id = t.level_id
    JOIN approval_workflows w ON w.id = i.workflow_id
    LEFT JOIN users u ON u.id = i.requested_by
    LEFT JOIN suppliers s ON s.id = i.record_id
    LEFT JOIN procurement_requests pr ON pr.id = i.record_id
    LEFT JOIN departments pr_dept ON pr_dept.id = pr.requesting_department_id
    LEFT JOIN purchase_orders po ON po.id = i.record_id
    LEFT JOIN suppliers po_sup ON po_sup.id = po.supplier_id
    LEFT JOIN invoices inv ON inv.id = i.record_id
    LEFT JOIN suppliers inv_sup ON inv_sup.id = inv.supplier_id
    LEFT JOIN awards awd ON awd.id = i.record_id
    LEFT JOIN suppliers awd_sup ON awd_sup.id = awd.supplier_id
    LEFT JOIN procurement_events awd_evt ON awd_evt.id = awd.event_id
    WHERE t.status = 'Pending' AND i.status = 'Pending'
  `;
  const params: any[] = [];

  if (user.role !== RoleName.SUPER_ADMIN) {
    query += ` AND (t.assigned_to_user_id = ? OR t.assigned_to_role_id = ? OR t.assigned_to_role_id IN (SELECT id FROM roles WHERE name = ?))`;
    params.push(user.id, user.role_id, user.role);
  }

  query += ` ORDER BY t.created_at DESC`;
  const rawTasks = db.prepare(query).all(...params) as any[];

  // Format clean entity labels
  const tasks = rawTasks.map((t) => {
    let entityTitle = t.reference_number;
    let entitySubtitle = t.workflow_name;
    let requesterDisplay = t.requester_first ? `${t.requester_first} ${t.requester_last}` : 'System User';
    let requesterEmail = t.requester_email || '';
    let isSelfRegistered = false;

    if (t.module === 'SUPPLIER_REGISTRATION' || t.module === 'SUPPLIER_SUSPENSION') {
      entityTitle = t.supplier_name || 'Vendor Registration';
      entitySubtitle = `${t.supplier_reg_no ? `Reg: ${t.supplier_reg_no}` : ''} ${t.supplier_tax_no ? `• Tax: ${t.supplier_tax_no}` : ''} • ${t.supplier_country || 'Global'}`;
      requesterDisplay = `Self-Registered: ${t.supplier_name || 'New Vendor'}`;
      requesterEmail = 'Online Supplier Application';
      isSelfRegistered = true;
    } else if (t.module === 'PURCHASE_REQUISITION') {
      entityTitle = t.pr_title || t.reference_number;
      entitySubtitle = `${t.pr_dept_name || 'Dept'} • ${t.pr_category || 'General'}`;
    } else if (t.module === 'PURCHASE_ORDER') {
      entityTitle = `PO for ${t.po_supplier_name || 'Supplier'}`;
      entitySubtitle = `Order #${t.po_number || t.reference_number}`;
    } else if (t.module === 'INVOICE') {
      entityTitle = `Invoice ${t.invoice_number || t.reference_number}`;
      entitySubtitle = `Vendor: ${t.inv_supplier_name || 'Vendor'} • 3-Way Match: ${t.matching_status || 'Pending'}`;
    } else if (t.module === 'BID_AWARD') {
      entityTitle = `Award: ${t.awd_supplier_name || 'Winner'}`;
      entitySubtitle = `Sourcing Event: ${t.awd_event_title || 'Tender'}`;
    }

    // Get previous approval history for this instance
    const history = db.prepare(`
      SELECT level_name, action, actor_name, actor_role, comments, timestamp
      FROM approval_history
      WHERE instance_id = ?
      ORDER BY timestamp ASC
    `).all(t.instance_id);

    return {
      ...t,
      entity_title: entityTitle,
      entity_subtitle: entitySubtitle,
      requester_display: requesterDisplay,
      requester_email_display: requesterEmail,
      is_self_registered: isSelfRegistered,
      history: history || []
    };
  });

  return res.json(tasks);
});

// Get Detailed Inspection Payload for a Task
approvalRouter.get('/task-details/:taskId', authenticateToken, (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;

  const task = db.prepare(`
    SELECT t.*, i.module, i.record_id, i.reference_number, i.amount, i.requested_by, i.sla_deadline, i.created_at as submitted_at,
           i.current_level, i.total_levels, i.workflow_id,
           l.level_name, l.sla_hours, w.name as workflow_name
    FROM approval_tasks t
    JOIN approval_instances i ON i.id = t.instance_id
    JOIN approval_workflow_levels l ON l.id = t.level_id
    JOIN approval_workflows w ON w.id = i.workflow_id
    WHERE t.id = ?
  `).get(taskId) as any;

  if (!task) {
    return res.status(404).json({ error: 'Approval task not found' });
  }

  // Fetch full multi-level approval history and all configured levels
  const approvalHistory = db.prepare(`
    SELECT * FROM approval_history 
    WHERE instance_id = ? 
    ORDER BY timestamp ASC
  `).all(task.instance_id);

  const allWorkflowLevels = db.prepare(`
    SELECT * FROM approval_workflow_levels 
    WHERE workflow_id = ? 
    ORDER BY level_number ASC
  `).all(task.workflow_id);

  let detail: any = { 
    task,
    approvalHistory: approvalHistory || [],
    allWorkflowLevels: allWorkflowLevels || []
  };


  try {
    if (task.module === 'SUPPLIER_REGISTRATION' || task.module === 'SUPPLIER_SUSPENSION') {
      const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(task.record_id);
      const contacts = db.prepare(`SELECT * FROM supplier_contacts WHERE supplier_id = ?`).all(task.record_id);
      const bankAccounts = db.prepare(`SELECT * FROM supplier_bank_accounts WHERE supplier_id = ?`).all(task.record_id);
      const categories = db.prepare(`SELECT * FROM supplier_categories WHERE supplier_id = ?`).all(task.record_id);
      const risk = db.prepare(`SELECT * FROM supplier_risk WHERE supplier_id = ?`).get(task.record_id);
      const documents = db.prepare(`SELECT * FROM supplier_documents WHERE supplier_id = ?`).all(task.record_id);

      detail = {
        ...detail,
        supplier,
        contacts,
        bankAccounts,
        categories,
        risk,
        documents
      };
    } else if (task.module === 'PURCHASE_REQUISITION') {
      const pr = db.prepare(`
        SELECT pr.*, d.name as department_name, u.first_name, u.last_name, u.email as requester_email
        FROM procurement_requests pr
        JOIN departments d ON d.id = pr.requesting_department_id
        JOIN users u ON u.id = pr.requester_id
        WHERE pr.id = ?
      `).get(task.record_id);
      const items = db.prepare(`SELECT * FROM procurement_request_items WHERE request_id = ? ORDER BY item_number ASC`).all(task.record_id);

      detail = { ...detail, pr, items };
    } else if (task.module === 'PURCHASE_ORDER') {
      const po = db.prepare(`
        SELECT po.*, s.legal_name as supplier_name, s.supplier_code, s.country as supplier_country
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = ?
      `).get(task.record_id);
      const items = db.prepare(`SELECT * FROM purchase_order_items WHERE po_id = ?`).all(task.record_id);

      detail = { ...detail, po, items };
    } else if (task.module === 'INVOICE') {
      const invoice = db.prepare(`
        SELECT inv.*, s.legal_name as supplier_name, po.po_number, po.grand_total as po_total
        FROM invoices inv
        JOIN suppliers s ON s.id = inv.supplier_id
        LEFT JOIN purchase_orders po ON po.id = inv.po_id
        WHERE inv.id = ?
      `).get(task.record_id);
      const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(task.record_id);

      detail = { ...detail, invoice, items };
    } else if (task.module === 'BID_AWARD') {
      const award = db.prepare(`
        SELECT a.*, e.title as event_title, e.event_number, s.legal_name as supplier_name, s.supplier_code,
               b.bid_number, b.total_bid_amount as bid_price, b.technical_score, b.commercial_score, b.total_weighted_score, b.final_rank
        FROM awards a
        JOIN procurement_events e ON e.id = a.event_id
        JOIN suppliers s ON s.id = a.supplier_id
        JOIN bids b ON b.id = a.bid_id
        WHERE a.id = ?
      `).get(task.record_id);

      detail = { ...detail, award };
    }
  } catch (err: any) {
    console.error('Error fetching module inspection detail:', err);
  }

  return res.json(detail);
});


// Process Approval Task (Approve, Reject, Send Back, Clarification, Delegate)
approvalRouter.post('/tasks/:taskId/action', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { action, comments, delegatedToUserId, supportingDocPath } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const result = processApprovalAction(
      taskId,
      req.user!.id,
      action,
      comments,
      delegatedToUserId,
      supportingDocPath
    );

    return res.json(result);
  } catch (err: any) {
    console.error('Approval action error:', err);
    return res.status(400).json({ error: err.message || 'Failed to process approval action' });
  }
});

// Get Approval Timeline for a Record
approvalRouter.get('/timeline/:module/:recordId', authenticateToken, (req: AuthRequest, res: Response) => {
  const { module, recordId } = req.params;
  const timeline = getApprovalTimeline(module, recordId);
  return res.json(timeline || { message: 'No active approval workflow found for this record' });
});


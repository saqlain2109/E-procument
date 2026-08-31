import { db } from '../config/database';
import crypto from 'crypto';
import { logAudit } from './auditService';
import { sendNotification, notifyRole } from './notificationService';
import { checkSegregationOfDuties } from '../middleware/sod';

export interface StartWorkflowParams {
  module: string;
  recordId: string;
  referenceNumber: string;
  requestedBy: string;
  amount?: number;
  category?: string;
  metadata?: any;
}

export function startWorkflowInstance(params: StartWorkflowParams): string {
  // Find active workflow for this module
  const workflow = db.prepare(`
    SELECT * FROM approval_workflows 
    WHERE module = ? AND is_active = 1 
    ORDER BY version DESC LIMIT 1
  `).get(params.module) as any;

  if (!workflow) {
    // If no workflow defined, create a default 1-level manager approval or auto-approve
    console.warn(`No active workflow found for module ${params.module}. Auto-approving.`);
    return autoApproveRecord(params.module, params.recordId, params.requestedBy);
  }

  // Fetch all levels for this workflow ordered by sequence_order
  const levels = db.prepare(`
    SELECT * FROM approval_workflow_levels 
    WHERE workflow_id = ? 
    ORDER BY sequence_order ASC, level_number ASC
  `).all(workflow.id) as any[];

  // Filter levels based on condition (e.g. amount thresholds)
  const applicableLevels = levels.filter((lvl) => {
    if (!lvl.condition_field || !lvl.condition_value) return true;

    if (lvl.condition_field === 'amount' && params.amount !== undefined) {
      const targetVal = parseFloat(lvl.condition_value);
      if (lvl.condition_operator === '>' && params.amount <= targetVal) return false;
      if (lvl.condition_operator === '>=' && params.amount < targetVal) return false;
      if (lvl.condition_operator === '<' && params.amount >= targetVal) return false;
      if (lvl.condition_operator === '<=' && params.amount > targetVal) return false;
    }

    if (lvl.condition_field === 'category' && params.category) {
      if (lvl.condition_operator === '==' && params.category !== lvl.condition_value) return false;
    }

    return true;
  });

  if (applicableLevels.length === 0) {
    return autoApproveRecord(params.module, params.recordId, params.requestedBy);
  }

  const instanceId = crypto.randomUUID();
  const slaDeadline = new Date(Date.now() + (applicableLevels[0].sla_hours || 48) * 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO approval_instances (id, workflow_id, module, record_id, reference_number, requested_by, amount, current_level, total_levels, status, sla_deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'Pending', ?)
  `).run(
    instanceId,
    workflow.id,
    params.module,
    params.recordId,
    params.referenceNumber,
    params.requestedBy,
    params.amount || 0,
    applicableLevels.length,
    slaDeadline
  );

  // Generate tasks for level 1
  createTasksForLevel(instanceId, applicableLevels[0], params.module, params.recordId);

  logAudit({
    userId: params.requestedBy,
    action: 'START_WORKFLOW',
    module: params.module,
    recordId: params.recordId,
    comments: `Initiated approval workflow '${workflow.name}' with ${applicableLevels.length} levels.`
  });

  return instanceId;
}

function createTasksForLevel(instanceId: string, level: any, module: string, recordId: string) {
  const taskId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO approval_tasks (id, instance_id, level_id, level_number, assigned_to_user_id, assigned_to_role_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
  `).run(
    taskId,
    instanceId,
    level.id,
    level.level_number,
    level.user_id || null,
    level.role_id || null
  );

  // Notify assigned user or role
  const inst = db.prepare(`SELECT * FROM approval_instances WHERE id = ?`).get(instanceId) as any;
  const taskMsg = `Approval task assigned for ${module} (${inst?.reference_number || recordId}) at level '${level.level_name}'`;

  if (level.user_id) {
    sendNotification(level.user_id, 'New Approval Task Assigned', taskMsg, 'ACTION_REQUIRED', module, recordId);
  } else if (level.role_id) {
    notifyRole(level.role_id, 'New Approval Task Assigned', taskMsg, 'ACTION_REQUIRED', module, recordId);
  }
}

export function processApprovalAction(
  taskId: string,
  userId: string,
  action: 'Approved' | 'Rejected' | 'Sent Back' | 'Clarification Requested' | 'Delegated',
  comments?: string,
  delegatedToUserId?: string,
  supportingDocPath?: string
): { success: boolean; message: string; instanceStatus?: string } {
  const task = db.prepare(`
    SELECT t.*, i.module, i.record_id, i.workflow_id, i.current_level, i.total_levels, i.requested_by, l.level_name, l.workflow_id as w_id
    FROM approval_tasks t
    JOIN approval_instances i ON i.id = t.instance_id
    JOIN approval_workflow_levels l ON l.id = t.level_id
    WHERE t.id = ?
  `).get(taskId) as any;

  if (!task) {
    throw new Error('Approval task not found');
  }

  if (task.status !== 'Pending') {
    throw new Error(`Task has already been processed with status: ${task.status}`);
  }

  // Segregation of duties check for Approve action
  if (action === 'Approved') {
    const sod = checkSegregationOfDuties(task.module, task.record_id, userId, 'APPROVE');
    if (!sod.allowed) {
      throw new Error(sod.reason);
    }
  }

  const user = db.prepare(`SELECT u.*, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(userId) as any;
  const userName = user ? `${user.first_name} ${user.last_name}` : 'Approver';
  const userRole = user?.role_name || 'Approver';

  // 1. Update task
  db.prepare(`
    UPDATE approval_tasks 
    SET status = ?, action_by_user_id = ?, delegated_to_user_id = ?, comments = ?, action_date = CURRENT_TIMESTAMP, supporting_doc_path = ?
    WHERE id = ?
  `).run(action, userId, delegatedToUserId || null, comments || null, supportingDocPath || null, taskId);

  // 2. Record history
  db.prepare(`
    INSERT INTO approval_history (id, instance_id, level_name, action, actor_id, actor_name, actor_role, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), task.instance_id, task.level_name, action, userId, userName, userRole, comments || null);

  logAudit({
    userId,
    userEmail: user?.email,
    userRole,
    action: `WORKFLOW_${action.toUpperCase()}`,
    module: task.module,
    recordId: task.record_id,
    comments: `Level: ${task.level_name}. Comments: ${comments || 'None'}`
  });

  // 3. Handle Action Cases
  if (action === 'Delegated' && delegatedToUserId) {
    const newTaskId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO approval_tasks (id, instance_id, level_id, level_number, assigned_to_user_id, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `).run(newTaskId, task.instance_id, task.level_id, task.level_number, delegatedToUserId);

    sendNotification(
      delegatedToUserId,
      'Approval Task Delegated to You',
      `Approval task for ${task.module} has been delegated to you by ${userName}.`,
      'ACTION_REQUIRED',
      task.module,
      task.record_id
    );

    return { success: true, message: `Task successfully delegated.`, instanceStatus: 'Pending' };
  }

  if (action === 'Rejected') {
    db.prepare(`
      UPDATE approval_instances 
      SET status = 'Rejected', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(task.instance_id);

    // Apply Rejection on the Target Module
    applyRecordStatusChange(task.module, task.record_id, 'Rejected', comments);

    sendNotification(
      task.requested_by,
      'Approval Request Rejected',
      `Your ${task.module} request was rejected at level '${task.level_name}'. Reason: ${comments || 'No comment provided.'}`,
      'WARNING',
      task.module,
      task.record_id
    );

    return { success: true, message: 'Request rejected.', instanceStatus: 'Rejected' };
  }

  if (action === 'Sent Back' || action === 'Clarification Requested') {
    sendNotification(
      task.requested_by,
      `Action Needed: ${action} on your request`,
      `Approver ${userName} marked your ${task.module} request as '${action}'. Note: ${comments || ''}`,
      'ACTION_REQUIRED',
      task.module,
      task.record_id
    );

    applyRecordStatusChange(task.module, task.record_id, 'Clarification Required', comments);
    return { success: true, message: `Request marked as ${action}.`, instanceStatus: 'Pending' };
  }

  if (action === 'Approved') {
    // Check if there are subsequent levels
    const nextLevels = db.prepare(`
      SELECT * FROM approval_workflow_levels
      WHERE workflow_id = ? AND sequence_order > (
        SELECT sequence_order FROM approval_workflow_levels WHERE id = ?
      )
      ORDER BY sequence_order ASC, level_number ASC
    `).all(task.w_id, task.level_id) as any[];

    if (nextLevels.length > 0) {
      const nextLevel = nextLevels[0];
      db.prepare(`UPDATE approval_instances SET current_level = current_level + 1 WHERE id = ?`).run(task.instance_id);
      createTasksForLevel(task.instance_id, nextLevel, task.module, task.record_id);

      return {
        success: true,
        message: `Level ${task.level_name} approved. Progressed to ${nextLevel.level_name}.`,
        instanceStatus: 'Pending'
      };
    } else {
      // Final level approved!
      db.prepare(`
        UPDATE approval_instances 
        SET status = 'Approved', completed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(task.instance_id);

      applyRecordStatusChange(task.module, task.record_id, 'Approved', comments);

      sendNotification(
        task.requested_by,
        'Approval Request Completed & Approved',
        `Your ${task.module} request has completed all required approval levels successfully!`,
        'SUCCESS',
        task.module,
        task.record_id
      );

      return {
        success: true,
        message: 'Final approval completed successfully! Record state updated.',
        instanceStatus: 'Approved'
      };
    }
  }

  return { success: true, message: 'Action completed.' };
}

function applyRecordStatusChange(module: string, recordId: string, status: string, notes?: string) {
  try {
    switch (module) {
      case 'SUPPLIER_REGISTRATION':
        if (status === 'Approved') {
          db.prepare(`
            UPDATE suppliers 
            SET status = 'Active', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(recordId);

          // Activate supplier users
          db.prepare(`UPDATE users SET is_active = 1 WHERE supplier_id = ?`).run(recordId);
        } else if (status === 'Rejected') {
          db.prepare(`
            UPDATE suppliers 
            SET status = 'Rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(notes || 'Registration rejected', recordId);
        } else if (status === 'Clarification Required') {
          db.prepare(`UPDATE suppliers SET status = 'Clarification Required', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
        }
        break;

      case 'PURCHASE_REQUISITION':
        db.prepare(`UPDATE procurement_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, recordId);
        break;

      case 'TENDER_PUBLISH':
        if (status === 'Approved') {
          db.prepare(`UPDATE procurement_events SET status = 'Published', publication_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
        } else {
          db.prepare(`UPDATE procurement_events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, recordId);
        }
        break;

      case 'BID_AWARD':
        if (status === 'Approved') {
          db.prepare(`UPDATE awards SET status = 'Approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
          // Mark associated tender as Awarded
          const award = db.prepare(`SELECT event_id, bid_id, supplier_id FROM awards WHERE id = ?`).get(recordId) as any;
          if (award) {
            db.prepare(`UPDATE procurement_events SET status = 'Awarded', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(award.event_id);
            db.prepare(`UPDATE bids SET status = 'Awarded', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(award.bid_id);
            // Mark remaining bids as Unsuccessful
            db.prepare(`UPDATE bids SET status = 'Unsuccessful', updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND id != ?`).run(award.event_id, award.bid_id);
          }
        } else {
          db.prepare(`UPDATE awards SET status = ? WHERE id = ?`).run(status, recordId);
        }
        break;

      case 'PURCHASE_ORDER':
        if (status === 'Approved') {
          db.prepare(`UPDATE purchase_orders SET status = 'Sent to Supplier', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
        } else {
          db.prepare(`UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, recordId);
        }
        break;

      case 'INVOICE':
        db.prepare(`UPDATE invoices SET status = ? WHERE id = ?`).run(status, recordId);
        break;

      case 'CONTRACT':
        if (status === 'Approved') {
          db.prepare(`UPDATE contracts SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
        } else {
          db.prepare(`UPDATE contracts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, recordId);
        }
        break;

      case 'SUPPLIER_SUSPENSION':
        if (status === 'Approved') {
          db.prepare(`UPDATE suppliers SET status = 'Suspended', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
        }
        break;
    }
  } catch (err) {
    console.error(`Failed to apply record status change for ${module}:${recordId}`, err);
  }
}

function autoApproveRecord(module: string, recordId: string, userId: string): string {
  applyRecordStatusChange(module, recordId, 'Approved', 'Auto-approved (No workflow configured)');
  return 'AUTO_APPROVED';
}

export function getApprovalTimeline(module: string, recordId: string) {
  const instance = db.prepare(`
    SELECT i.*, w.name as workflow_name
    FROM approval_instances i
    LEFT JOIN approval_workflows w ON w.id = i.workflow_id
    WHERE i.module = ? AND i.record_id = ?
    ORDER BY i.created_at DESC LIMIT 1
  `).get(module, recordId) as any;

  if (!instance) return null;

  const levels = db.prepare(`
    SELECT l.*, r.name as role_name, u.first_name, u.last_name
    FROM approval_workflow_levels l
    LEFT JOIN roles r ON r.id = l.role_id
    LEFT JOIN users u ON u.id = l.user_id
    WHERE l.workflow_id = ?
    ORDER BY l.sequence_order ASC
  `).all(instance.workflow_id);

  const tasks = db.prepare(`
    SELECT t.*, u.first_name as assigned_first, u.last_name as assigned_last,
           act.first_name as actor_first, act.last_name as actor_last
    FROM approval_tasks t
    LEFT JOIN users u ON u.id = t.assigned_to_user_id
    LEFT JOIN users act ON act.id = t.action_by_user_id
    WHERE t.instance_id = ?
  `).all(instance.id);

  const history = db.prepare(`
    SELECT * FROM approval_history WHERE instance_id = ? ORDER BY timestamp ASC
  `).all(instance.id);

  return {
    instance,
    levels,
    tasks,
    history
  };
}

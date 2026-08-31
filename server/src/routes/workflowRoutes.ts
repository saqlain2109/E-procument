import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { RoleName } from '../config/constants';
import { logAudit } from '../services/auditService';

export const workflowRouter = Router();

// List all Workflows with their Levels
workflowRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const workflows = db.prepare(`SELECT * FROM approval_workflows ORDER BY module ASC, version DESC`).all() as any[];

  for (const wf of workflows) {
    wf.levels = db.prepare(`
      SELECT l.*, r.name as role_name, u.first_name, u.last_name, u.email as user_email, d.name as department_name
      FROM approval_workflow_levels l
      LEFT JOIN roles r ON r.id = l.role_id
      LEFT JOIN users u ON u.id = l.user_id
      LEFT JOIN departments d ON d.id = l.department_id
      WHERE l.workflow_id = ?
      ORDER BY l.sequence_order ASC, l.level_number ASC
    `).all(wf.id);
  }

  return res.json(workflows);
});

// Create or Update Workflow Master
workflowRouter.post('/', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const { name, module, description, isActive = 1 } = req.body;

  if (!name || !module) {
    return res.status(400).json({ error: 'Workflow name and module are required' });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO approval_workflows (id, name, module, description, is_active, version)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, name, module, description || null, isActive ? 1 : 0);

  logAudit({
    userId: req.user!.id,
    action: 'CREATE_WORKFLOW',
    module: 'WORKFLOW_CONFIG',
    recordId: id,
    comments: `Created workflow ${name} for module ${module}`
  });

  return res.status(201).json({ message: 'Workflow created successfully', id });
});

// Add Dynamic Approval Level
workflowRouter.post('/:id/levels', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const workflowId = req.params.id;
  const {
    levelName,
    approverType = 'ROLE',
    roleId,
    userId,
    departmentId,
    approvalType = 'SEQUENTIAL',
    conditionField,
    conditionOperator,
    conditionValue,
    slaHours = 48,
    sequenceOrder
  } = req.body;

  if (!levelName) {
    return res.status(400).json({ error: 'Level name is required' });
  }

  const levelId = crypto.randomUUID();
  const existingCount = (db.prepare(`SELECT COUNT(*) as cnt FROM approval_workflow_levels WHERE workflow_id = ?`).get(workflowId) as any)?.cnt || 0;
  const nextSeq = sequenceOrder || (existingCount + 1);

  db.prepare(`
    INSERT INTO approval_workflow_levels (
      id, workflow_id, level_number, level_name, approver_type, role_id, user_id,
      department_id, approval_type, condition_field, condition_operator, condition_value,
      sla_hours, sequence_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    levelId,
    workflowId,
    nextSeq,
    levelName,
    approverType,
    roleId || null,
    userId || null,
    departmentId || null,
    approvalType,
    conditionField || null,
    conditionOperator || null,
    conditionValue || null,
    slaHours,
    nextSeq
  );

  logAudit({
    userId: req.user!.id,
    action: 'ADD_WORKFLOW_LEVEL',
    module: 'WORKFLOW_CONFIG',
    recordId: workflowId,
    comments: `Added level ${levelName} (Seq ${nextSeq})`
  });

  return res.status(201).json({ message: 'Approval level added dynamically!', levelId });
});

// Delete Approval Level
workflowRouter.delete('/levels/:levelId', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const levelId = req.params.levelId;

  db.prepare(`DELETE FROM approval_workflow_levels WHERE id = ?`).run(levelId);

  return res.json({ message: 'Approval level removed successfully.' });
});

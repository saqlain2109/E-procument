import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { RoleName } from '../config/constants';
import { logAudit } from '../services/auditService';

export const masterDataRouter = Router();

// Get Master Data by Type (or all)
masterDataRouter.get('/', (req: Request, res: Response) => {
  const { type } = req.query;

  let query = `SELECT * FROM master_data WHERE is_active = 1`;
  const params: any[] = [];

  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }

  query += ` ORDER BY sort_order ASC, name ASC`;
  const items = db.prepare(query).all(...params);

  return res.json(items);
});

// Get Departments and Cost Centers
masterDataRouter.get('/departments', (req: Request, res: Response) => {
  const depts = db.prepare(`SELECT * FROM departments ORDER BY name ASC`).all() as any[];
  for (const d of depts) {
    d.cost_centers = db.prepare(`SELECT * FROM cost_centers WHERE department_id = ?`).all(d.id);
  }
  return res.json(depts);
});

// Get Numbering Configurations
masterDataRouter.get('/numbering', authenticateToken, (req: AuthRequest, res: Response) => {
  const configs = db.prepare(`SELECT * FROM numbering_configs ORDER BY module ASC`).all();
  return res.json(configs);
});

// Update Numbering Config
masterDataRouter.put('/numbering/:module', authenticateToken, requireRoles(RoleName.SUPER_ADMIN), (req: AuthRequest, res: Response) => {
  const { prefix, padding, formatPattern } = req.body;
  const module = req.params.module;

  db.prepare(`
    UPDATE numbering_configs 
    SET prefix = ?, padding = ?, format_pattern = ? 
    WHERE module = ?
  `).run(prefix, padding, formatPattern, module);

  logAudit({
    userId: req.user!.id,
    action: 'UPDATE_NUMBERING_CONFIG',
    module: 'MASTER_DATA',
    comments: `Updated numbering pattern for ${module}: ${prefix} (${formatPattern})`
  });

  return res.json({ message: 'Numbering configuration updated successfully' });
});

// Get Email Templates
masterDataRouter.get('/email-templates', authenticateToken, (req: AuthRequest, res: Response) => {
  const templates = db.prepare(`SELECT * FROM email_templates ORDER BY name ASC`).all();
  return res.json(templates);
});

// Update Email Template
masterDataRouter.put('/email-templates/:id', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const { subject, bodyTemplate } = req.body;
  const id = req.params.id;

  db.prepare(`
    UPDATE email_templates 
    SET subject = ?, body_template = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(subject, bodyTemplate, id);

  logAudit({
    userId: req.user!.id,
    action: 'UPDATE_EMAIL_TEMPLATE',
    module: 'MASTER_DATA',
    recordId: id,
    comments: `Updated email template subject & body`
  });

  return res.json({ message: 'Email template updated successfully' });
});

// Add Master Data Item
masterDataRouter.post('/', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const { type, code, name, parentCode, metadata } = req.body;

  if (!type || !code || !name) {
    return res.status(400).json({ error: 'Type, code, and name are required' });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO master_data (id, type, code, name, parent_code, metadata, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, type, code, name, parentCode || null, metadata ? JSON.stringify(metadata) : null);

  return res.status(201).json({ message: 'Master data item created', id });
});

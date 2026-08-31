import { Router, Response } from 'express';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { RoleName } from '../config/constants';
import { getAuditLogs } from '../services/auditService';

export const auditRouter = Router();

// Get Audit Logs with Filters
auditRouter.get('/', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const { module, recordId, limit } = req.query;

  const logs = getAuditLogs({
    module: module as string,
    recordId: recordId as string,
    limit: limit ? parseInt(limit as string, 10) : 100
  });

  return res.json(logs);
});

// Get Notifications for Current User
auditRouter.get('/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC LIMIT 50
  `).all(req.user!.id);

  return res.json(notifications);
});

// Mark Notification as Read
auditRouter.post('/notifications/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(req.params.id, req.user!.id);
  return res.json({ message: 'Marked as read' });
});

// Mark All Notifications as Read
auditRouter.post('/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user!.id);
  return res.json({ message: 'All marked as read' });
});

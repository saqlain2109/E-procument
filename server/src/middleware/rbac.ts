import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { RoleName } from '../config/constants';
import { db } from '../config/database';

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (req.user.role === RoleName.SUPER_ADMIN) {
      return next(); // Super admin bypass
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}`
    });
  };
}

export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (req.user.role === RoleName.SUPER_ADMIN) {
      return next();
    }

    // Check if role has this permission
    const perm = db.prepare(`
      SELECT p.id FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.code = ?
    `).get(req.user.role_id, permissionCode);

    if (perm) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Missing required permission [${permissionCode}]`
    });
  };
}

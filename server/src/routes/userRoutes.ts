import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';
import { logAudit } from '../services/auditService';

export const userRouter = Router();

// Middleware: Strict Super Administrator Check
function requireSuperAdmin(req: AuthRequest, res: Response, next: () => void) {
  if (!req.user || req.user.role !== RoleName.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'Access Denied: Only Super Administrators can manage user accounts and access credentials.'
    });
  }
  next();
}

// 1. Get Roles list (for dropdowns)
userRouter.get('/roles', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  const roles = db.prepare(`SELECT id, name, description FROM roles ORDER BY name ASC`).all();
  return res.json(roles);
});

// 2. List All Users with Filtering & Analytics Counts
userRouter.get('/', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  const { userType, roleId, status, search, departmentId, supplierId } = req.query;

  let query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.job_title,
           u.is_active, u.last_login, u.created_at,
           r.id as role_id, r.name as role_name,
           d.id as department_id, d.name as department_name, d.code as department_code,
           s.id as supplier_id, s.legal_name as supplier_name, s.supplier_code
    FROM users u

    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Filter: Internal Employee vs Supplier
  if (userType === 'EMPLOYEE') {
    query += ` AND u.supplier_id IS NULL AND r.name != 'Supplier'`;
  } else if (userType === 'SUPPLIER') {
    query += ` AND (u.supplier_id IS NOT NULL OR r.name = 'Supplier')`;
  }

  // Filter: Role
  if (roleId) {
    query += ` AND (u.role_id = ? OR r.name = ?)`;
    params.push(roleId, roleId);
  }

  // Filter: Status (Active / Disabled)
  if (status !== undefined && status !== '') {
    if (status === 'ACTIVE' || status === '1') {
      query += ` AND u.is_active = 1`;
    } else if (status === 'DISABLED' || status === '0') {
      query += ` AND u.is_active = 0`;
    }
  }

  // Filter: Department
  if (departmentId) {
    query += ` AND u.department_id = ?`;
    params.push(departmentId);
  }

  // Filter: Supplier
  if (supplierId) {
    query += ` AND u.supplier_id = ?`;
    params.push(supplierId);
  }

  // Filter: Search query
  if (search) {
    query += ` AND (
      u.first_name LIKE ? OR 
      u.last_name LIKE ? OR 
      u.email LIKE ? OR 
      u.phone LIKE ? OR 
      u.job_title LIKE ? OR 
      s.legal_name LIKE ? OR 
      d.name LIKE ?
    )`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term, term);
  }

  query += ` ORDER BY u.created_at DESC`;
  const users = db.prepare(query).all(...params);

  // Compute Overall Stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as disabled_users,
      SUM(CASE WHEN supplier_id IS NULL AND role_id != 'ROLE-SUPPLIER' THEN 1 ELSE 0 END) as total_employees,
      SUM(CASE WHEN supplier_id IS NOT NULL OR role_id = 'ROLE-SUPPLIER' THEN 1 ELSE 0 END) as total_suppliers
    FROM users
  `).get() as any;

  return res.json({ users, stats });
});

// 3. Get Single User Details
userRouter.get('/:id', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.job_title,
           u.is_active, u.last_login, u.created_at,
           r.id as role_id, r.name as role_name,
           d.id as department_id, d.name as department_name, d.code as department_code,
           s.id as supplier_id, s.legal_name as supplier_name, s.supplier_code
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  return res.json(user);
});

// 4. Create New User (Internal Employee or Supplier User)
userRouter.post('/', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      roleId,
      departmentId,
      supplierId,
      jobTitle,
      phone,
      isActive = 1
    } = req.body;

    if (!email || !password || !firstName || !lastName || !roleId) {
      return res.status(400).json({ error: 'Email, initial password, first name, last name, and role are mandatory.' });
    }

    // Check email uniqueness
    const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`).get(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'A user account with this email address already exists.' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role_id, department_id,
        supplier_id, phone, job_title, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(

      userId,
      email.trim().toLowerCase(),
      passwordHash,
      firstName.trim(),
      lastName.trim(),
      roleId,
      departmentId || null,
      supplierId || null,
      phone || null,
      jobTitle || null,
      isActive ? 1 : 0
    );

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_CREATED',
      module: 'USER_MANAGEMENT',
      recordId: userId,
      comments: `Created user account: ${firstName} ${lastName} (${email}) with role: ${roleId}`
    });

    return res.status(201).json({
      message: 'User account created successfully!',
      userId
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// 5. Update User Profile Details
userRouter.put('/:id', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      email,
      firstName,
      lastName,
      roleId,
      departmentId,
      supplierId,
      jobTitle,
      phone,
      isActive
    } = req.body;

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Check email uniqueness if email changed
    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const existing = db.prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?`).get(email.trim(), id);
      if (existing) {
        return res.status(409).json({ error: 'Another user account already uses this email address.' });
      }
    }

    db.prepare(`
      UPDATE users SET
        email = COALESCE(?, email),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        role_id = COALESCE(?, role_id),
        department_id = ?,
        supplier_id = ?,
        job_title = ?,
        phone = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      email ? email.trim().toLowerCase() : null,
      firstName ? firstName.trim() : null,
      lastName ? lastName.trim() : null,
      roleId || null,
      departmentId || null,
      supplierId || null,
      jobTitle || null,
      phone || null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      id
    );

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_UPDATED',
      module: 'USER_MANAGEMENT',
      recordId: id,
      comments: `Updated user profile details for account: ${email || user.email}`
    });

    return res.json({ message: 'User account updated successfully!' });
  } catch (err: any) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

// 6. Admin Reset Password for User
userRouter.put('/:id/password', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare(`SELECT id, email, first_name, last_name FROM users WHERE id = ?`).get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, id);

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_PASSWORD_RESET',
      module: 'USER_MANAGEMENT',
      recordId: id,
      comments: `Admin reset password for user: ${user.first_name} ${user.last_name} (${user.email})`
    });

    return res.json({ message: `Password reset successfully for ${user.first_name} ${user.last_name}.` });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// 7. Toggle User Login Access (Enable / Disable)
userRouter.put('/:id/status', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive boolean flag is required' });
    }

    // Safety: Prevent Super Admin from disabling their own account
    if (id === req.user!.id && !isActive) {
      return res.status(400).json({ error: 'You cannot disable your own active Super Administrator account.' });
    }

    const user = db.prepare(`SELECT id, email, first_name, last_name FROM users WHERE id = ?`).get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const statusVal = isActive ? 1 : 0;
    db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`).run(statusVal, id);


    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'USER_MANAGEMENT',
      recordId: id,
      comments: `Admin ${isActive ? 'enabled' : 'disabled'} login access for: ${user.first_name} ${user.last_name} (${user.email})`
    });

    return res.json({
      message: `User account has been ${isActive ? 'activated' : 'disabled'} successfully.`,
      isActive: statusVal
    });
  } catch (err: any) {
    console.error('Toggle status error:', err);
    return res.status(500).json({ error: err.message || 'Failed to change user status' });
  }
});

// 8. Delete User Account
userRouter.delete('/:id', authenticateToken, requireSuperAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own active Super Administrator account.' });
    }

    const user = db.prepare(`SELECT id, email, first_name, last_name FROM users WHERE id = ?`).get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_DELETED',
      module: 'USER_MANAGEMENT',
      recordId: id,
      comments: `Deleted user account: ${user.first_name} ${user.last_name} (${user.email})`
    });

    return res.json({ message: 'User account deleted successfully.' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    // If foreign key constraint prevents deletion, advise deactivation
    return res.status(400).json({
      error: 'Cannot delete user because they have associated transactional history (POs, approvals, bids). Please disable login access instead.'
    });
  }
});

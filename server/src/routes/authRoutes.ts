import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { JWT_SECRET, RoleName } from '../config/constants';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const authRouter = Router();

// Sign In
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Support demo email aliases
  let cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === 'admin@enterprise-corp.com') cleanEmail = 'admin@eprocure.local';
  if (cleanEmail === 'procurement.lead@enterprise-corp.com') cleanEmail = 'proc.admin@eprocure.local';
  if (cleanEmail === 'finance.director@enterprise-corp.com') cleanEmail = 'finance@eprocure.local';
  if (cleanEmail === 'evaluator@enterprise-corp.com') cleanEmail = 'evaluator@eprocure.local';
  if (cleanEmail === 'vp.engineering@enterprise-corp.com') cleanEmail = 'approver@eprocure.local';
  if (cleanEmail === 'contracts@enterprise-corp.com') cleanEmail = 'contracts@eprocure.local';
  if (cleanEmail === 'contact@acme-industrial.com') cleanEmail = 'contact@apexcloud.com';

  const user = db.prepare(`
    SELECT u.*, r.name as role_name, d.name as department_name, s.legal_name as supplier_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
    WHERE LOWER(u.email) = ? OR LOWER(u.email) = ?
  `).get(cleanEmail, email.trim().toLowerCase()) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ error: 'Account is pending activation or has been deactivated.' });
  }

  const isDemoPass = ['password123', 'password123!', 'password', 'admin'].includes(password.toLowerCase());
  const isMatch = bcrypt.compareSync(password, user.password_hash) || isDemoPass;
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Update last login
  db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role_name,
    role_id: user.role_id,
    first_name: user.first_name,
    last_name: user.last_name,
    department_id: user.department_id,
    supplier_id: user.supplier_id
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role_name,
    action: 'USER_LOGIN',
    module: 'AUTH',
    comments: 'User successfully logged in'
  });

  return res.json({
    token,
    user: {
      ...payload,
      department_name: user.department_name,
      supplier_name: user.supplier_name,
      avatar_url: user.avatar_url,
      job_title: user.job_title
    }
  });
});

// Switch role (Demo / Quick switch helper for testing all personas seamlessly)
authRouter.post('/switch-persona', (req: Request, res: Response) => {
  const { roleName, email, userId, id } = req.body;

  let query = `
    SELECT u.*, r.name as role_name, d.name as department_name, s.legal_name as supplier_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
  `;

  let user: any;
  const targetId = userId || id;
  if (targetId) {
    user = db.prepare(`${query} WHERE u.id = ?`).get(targetId);
  }
  if (!user && email) {
    user = db.prepare(`${query} WHERE LOWER(u.email) = LOWER(?)`).get(email.trim());
  }
  if (!user && roleName) {
    user = db.prepare(`${query} WHERE r.name = ? OR u.role_id = ? LIMIT 1`).get(roleName, roleName);
  }
  if (!user) {
    user = db.prepare(`${query} WHERE u.is_active = 1 LIMIT 1`).get();
  }

  if (!user) {
    return res.status(404).json({ error: 'Persona user not found' });
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role_name,
    role_id: user.role_id,
    first_name: user.first_name,
    last_name: user.last_name,
    department_id: user.department_id,
    supplier_id: user.supplier_id
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    token,

    user: {
      ...payload,
      department_name: user.department_name,
      supplier_name: user.supplier_name,
      avatar_url: user.avatar_url,
      job_title: user.job_title
    }
  });
});

// Current User
authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.prepare(`
    SELECT u.*, r.name as role_name, d.name as department_name, s.legal_name as supplier_name, s.status as supplier_status
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    role: user.role_name,
    role_id: user.role_id,
    first_name: user.first_name,
    last_name: user.last_name,
    department_id: user.department_id,
    department_name: user.department_name,
    supplier_id: user.supplier_id,
    supplier_name: user.supplier_name,
    supplier_status: user.supplier_status,
    avatar_url: user.avatar_url,
    job_title: user.job_title
  });
});

// Get available demo users for persona switcher UI
authRouter.get('/demo-personas', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.job_title, r.name as role_name, d.name as department_name, s.legal_name as supplier_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN suppliers s ON s.id = u.supplier_id
    WHERE u.is_active = 1
    ORDER BY r.name ASC
  `).all();

  return res.json(users);
});

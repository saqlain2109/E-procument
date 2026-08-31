import { db } from '../config/database';
import crypto from 'crypto';

export function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED' = 'INFO',
  module?: string,
  recordId?: string
) {
  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, module, record_id, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(id, userId, title, message, type, module || null, recordId || null);
    return id;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export function notifyRole(
  roleIdOrName: string,
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED' = 'INFO',
  module?: string,
  recordId?: string
) {
  try {
    const users = db.prepare(`
      SELECT u.id FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE (u.role_id = ? OR r.name = ?) AND u.is_active = 1
    `).all(roleIdOrName, roleIdOrName) as any[];

    for (const u of users) {
      sendNotification(u.id, title, message, type, module, recordId);
    }
  } catch (err) {
    console.error('Failed to notify role:', err);
  }
}

export function renderEmailTemplate(templateCode: string, variables: Record<string, string>): { subject: string; body: string } | null {
  const tpl = db.prepare(`SELECT * FROM email_templates WHERE code = ?`).get(templateCode) as any;
  if (!tpl) return null;

  let subject = tpl.subject;
  let body = tpl.body_template;

  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, val);
    body = body.replace(regex, val);
  }

  return { subject, body };
}

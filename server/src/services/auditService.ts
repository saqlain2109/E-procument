import { db } from '../config/database';
import crypto from 'crypto';

export interface AuditEntry {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  comments?: string;
}

export function logAudit(entry: AuditEntry): void {
  try {
    const id = crypto.randomUUID();
    const prevStr = entry.previousValue ? (typeof entry.previousValue === 'string' ? entry.previousValue : JSON.stringify(entry.previousValue)) : null;
    const newStr = entry.newValue ? (typeof entry.newValue === 'string' ? entry.newValue : JSON.stringify(entry.newValue)) : null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, user_role, action, module, record_id, previous_value, new_value, ip_address, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.userId || null,
      entry.userEmail || 'system@eprocure.local',
      entry.userRole || 'System',
      entry.action,
      entry.module,
      entry.recordId || null,
      prevStr,
      newStr,
      entry.ipAddress || '127.0.0.1',
      entry.comments || null
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function getAuditLogs(filter?: { module?: string; recordId?: string; limit?: number }) {
  let query = `SELECT * FROM audit_logs`;
  const params: any[] = [];
  const clauses: string[] = [];

  if (filter?.module) {
    clauses.push(`module = ?`);
    params.push(filter.module);
  }
  if (filter?.recordId) {
    clauses.push(`record_id = ?`);
    params.push(filter.recordId);
  }

  if (clauses.length > 0) {
    query += ` WHERE ` + clauses.join(' AND ');
  }

  query += ` ORDER BY timestamp DESC LIMIT ?`;
  params.push(filter?.limit || 100);

  return db.prepare(query).all(...params);
}

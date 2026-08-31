import { db } from '../config/database';

export interface SODCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkSegregationOfDuties(
  module: string,
  recordId: string,
  userId: string,
  action: 'APPROVE' | 'AWARD' | 'VERIFY'
): SODCheckResult {
  // Super Administrator has executive override for system governance & testing
  const userRole = db.prepare(`SELECT r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`).get(userId) as any;
  if (userRole?.role_name === 'Super Administrator') {
    return { allowed: true };
  }

  // 1. Check Purchase Requisition: Requester cannot approve
  if (module === 'PURCHASE_REQUISITION' && action === 'APPROVE') {
    const pr = db.prepare(`SELECT requester_id FROM procurement_requests WHERE id = ?`).get(recordId) as any;
    if (pr && pr.requester_id === userId) {
      return {
        allowed: false,
        reason: 'Segregation of Duties Violation: You cannot approve a Purchase Requisition that you created.'
      };
    }
  }

  // 2. Check Purchase Order: Creator cannot approve
  if (module === 'PURCHASE_ORDER' && action === 'APPROVE') {
    const po = db.prepare(`SELECT created_by FROM purchase_orders WHERE id = ?`).get(recordId) as any;
    if (po && po.created_by === userId) {
      return {
        allowed: false,
        reason: 'Segregation of Duties Violation: You cannot approve a Purchase Order that you created.'
      };
    }
  }

  // 3. Check Tender Award: Evaluator or Recommender cannot be the final approver
  if (module === 'BID_AWARD' && action === 'APPROVE') {
    const award = db.prepare(`SELECT recommended_by, event_id FROM awards WHERE id = ?`).get(recordId) as any;
    if (award) {
      if (award.recommended_by === userId) {
        return {
          allowed: false,
          reason: 'Segregation of Duties Violation: The user recommending the award cannot be the approval authority.'
        };
      }
      // Also check if user was an evaluator on the tender committee
      const committee = db.prepare(`
        SELECT id FROM tender_committee_members WHERE event_id = ? AND user_id = ?
      `).get(award.event_id, userId);
      if (committee) {
        return {
          allowed: false,
          reason: 'Segregation of Duties Violation: Committee evaluators cannot be the award final approver.'
        };
      }
    }
  }

  // 4. Check Invoices: Creator cannot approve
  if (module === 'INVOICE' && action === 'APPROVE') {
    const inv = db.prepare(`SELECT verified_by FROM invoices WHERE id = ?`).get(recordId) as any;
    if (inv && inv.verified_by === userId) {
      return {
        allowed: false,
        reason: 'Segregation of Duties Violation: The user verifying the invoice cannot be the final payment approver.'
      };
    }
  }

  return { allowed: true };
}

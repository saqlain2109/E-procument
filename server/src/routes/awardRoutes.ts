import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, WorkflowModule } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { startWorkflowInstance } from '../services/workflowEngine';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

export const awardRouter = Router();

// List Awards
awardRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  let query = `
    SELECT a.*, s.legal_name as supplier_name, s.supplier_code, e.title as event_title, e.event_number,
           u.first_name as recommended_first, u.last_name as recommended_last
    FROM awards a
    JOIN suppliers s ON s.id = a.supplier_id
    JOIN procurement_events e ON e.id = a.event_id
    JOIN users u ON u.id = a.recommended_by
  `;
  const params: any[] = [];

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    query += ` WHERE a.supplier_id = ? AND a.status = 'Approved'`;
    params.push(req.user.supplier_id);
  }

  query += ` ORDER BY a.created_at DESC`;
  const awards = db.prepare(query).all(...params);

  return res.json(awards);
});

// Create Award Recommendation (Triggers Dynamic Approval Workflow)
awardRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { eventId, supplierId, bidId, awardedAmount, reason, committeeRecommendation } = req.body;

    if (!eventId || !supplierId || !bidId || !awardedAmount || !reason) {
      return res.status(400).json({ error: 'Missing mandatory award fields' });
    }

    const awardId = crypto.randomUUID();
    const awardNumber = getNextNumber('AWD');

    db.prepare(`
      INSERT INTO awards (
        id, award_number, event_id, supplier_id, bid_id, awarded_amount, reason, committee_recommendation, recommended_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval')
    `).run(
      awardId,
      awardNumber,
      eventId,
      supplierId,
      bidId,
      awardedAmount,
      reason,
      committeeRecommendation || null,
      req.user!.id
    );

    // Update Tender status
    db.prepare(`UPDATE procurement_events SET status = 'Award Approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(eventId);

    // Start Dynamic Workflow Instance for Award Approval
    startWorkflowInstance({
      module: WorkflowModule.BID_AWARD,
      recordId: awardId,
      referenceNumber: awardNumber,
      requestedBy: req.user!.id,
      amount: awardedAmount
    });

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'RECOMMEND_AWARD',
      module: 'AWARD',
      recordId: awardId,
      comments: `Recommended award ${awardNumber} for $${awardedAmount} to supplier ${supplierId}`
    });

    return res.status(201).json({
      message: 'Award recommendation submitted for multi-level approval!',
      awardId,
      awardNumber
    });
  } catch (err: any) {
    console.error('Award error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create award recommendation' });
  }
});

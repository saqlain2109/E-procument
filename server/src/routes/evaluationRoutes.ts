import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';
import { calculateTenderEvaluation } from '../services/evaluationEngine';
import { logAudit } from '../services/auditService';

export const evaluationRouter = Router();

// Evaluation Workspace Details
evaluationRouter.get('/event/:eventId/workspace', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.eventId;

  const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
  if (!event) return res.status(404).json({ error: 'Procurement event not found' });

  const criteria = db.prepare(`SELECT * FROM evaluation_criteria WHERE event_id = ? ORDER BY stage DESC, weight DESC`).all(eventId);

  const bids = db.prepare(`
    SELECT b.*, s.legal_name as supplier_name, s.supplier_code, s.risk_rating, s.performance_score, s.country
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.event_id = ? AND b.status != 'Draft'
    ORDER BY b.final_rank ASC, b.total_weighted_score DESC
  `).all(eventId);

  const scores = db.prepare(`
    SELECT es.*, u.first_name, u.last_name, r.name as role_name
    FROM evaluation_scores es
    JOIN users u ON u.id = es.evaluator_id
    JOIN roles r ON r.id = u.role_id
    JOIN bids b ON b.id = es.bid_id
    WHERE b.event_id = ?
  `).all(eventId);

  const committee = db.prepare(`
    SELECT cm.*, u.first_name, u.last_name, u.email, r.name as role_name
    FROM tender_committee_members cm
    JOIN users u ON u.id = cm.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE cm.event_id = ?
  `).all(eventId);

  return res.json({ event, criteria, bids, scores, committee });
});

// Submit Evaluator Score for a Bid Criteria
evaluationRouter.post('/score', authenticateToken, (req: AuthRequest, res: Response) => {
  const { bidId, criteriaId, score, comments } = req.body;

  if (!bidId || !criteriaId || score === undefined) {
    return res.status(400).json({ error: 'Missing bidId, criteriaId, or score' });
  }

  // Ensure evaluator cannot overwrite other evaluators' scores unless authorized
  const scoreNum = Math.min(100, Math.max(0, parseFloat(score)));

  db.prepare(`
    INSERT OR REPLACE INTO evaluation_scores (id, bid_id, criteria_id, evaluator_id, score, comments)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), bidId, criteriaId, req.user!.id, scoreNum, comments || null);

  logAudit({
    userId: req.user!.id,
    action: 'SUBMIT_EVALUATION_SCORE',
    module: 'TENDER_EVALUATION',
    recordId: bidId,
    comments: `Evaluator scored ${scoreNum}/100 for criteria ${criteriaId}`
  });

  return res.json({ message: 'Score recorded successfully', score: scoreNum });
});

// Calculate Final Rankings & Consolidated Result
evaluationRouter.post('/event/:eventId/calculate', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.eventId;
    const rankedBids = calculateTenderEvaluation(eventId);

    return res.json({
      message: 'Evaluation scores and final rankings calculated successfully!',
      rankedBids
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to calculate rankings' });
  }
});

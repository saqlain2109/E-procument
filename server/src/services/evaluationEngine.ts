import { db } from '../config/database';
import { logAudit } from './auditService';

export function calculateTenderEvaluation(eventId: string) {
  const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
  if (!event) throw new Error('Procurement event not found');

  const bids = db.prepare(`SELECT * FROM bids WHERE event_id = ? AND status != 'Draft'`).all(eventId) as any[];
  if (bids.length === 0) return [];

  const technicalCriteria = db.prepare(`
    SELECT * FROM evaluation_criteria WHERE event_id = ? AND stage = 'Technical'
  `).all(eventId) as any[];

  const commercialCriteria = db.prepare(`
    SELECT * FROM evaluation_criteria WHERE event_id = ? AND stage = 'Commercial'
  `).all(eventId) as any[];

  const techWeight = event.technical_weight || 60.0;
  const commWeight = event.commercial_weight || 40.0;

  // Find lowest bid price for commercial scoring formula
  const validPrices = bids.map((b) => b.total_bid_amount).filter((p) => p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 1;

  for (const bid of bids) {
    // 1. Calculate Technical Score from individual evaluator scores
    let techScoreSum = 0;
    let techTotalWeight = 0;

    for (const crit of technicalCriteria) {
      techTotalWeight += crit.weight;
      // Get average evaluator score for this criterion on this bid
      const avgScore = db.prepare(`
        SELECT AVG(score) as avg_score FROM evaluation_scores 
        WHERE bid_id = ? AND criteria_id = ?
      `).get(bid.id, crit.id) as any;

      const scoreVal = avgScore?.avg_score !== null ? avgScore.avg_score : 80.0; // Default baseline if not yet individually scored
      techScoreSum += (scoreVal * (crit.weight / 100.0));
    }

    const techScoreNormalized = techTotalWeight > 0 ? (techScoreSum / (techTotalWeight / 100.0)) : 80.0;

    // 2. Calculate Commercial Score (Lowest price gets 100% of price score)
    let commScore = 0;
    if (bid.total_bid_amount > 0) {
      commScore = (minPrice / bid.total_bid_amount) * 100.0;
    }

    // 3. Composite Weighted Score
    const totalWeightedScore = (techScoreNormalized * (techWeight / 100.0)) + (commScore * (commWeight / 100.0));

    db.prepare(`
      UPDATE bids 
      SET technical_score = ?, commercial_score = ?, total_weighted_score = ?
      WHERE id = ?
    `).run(
      parseFloat(techScoreNormalized.toFixed(2)),
      parseFloat(commScore.toFixed(2)),
      parseFloat(totalWeightedScore.toFixed(2)),
      bid.id
    );
  }

  // 4. Update Final Ranks based on total_weighted_score DESC
  const rankedBids = db.prepare(`
    SELECT id, total_weighted_score FROM bids 
    WHERE event_id = ? AND status != 'Draft'
    ORDER BY total_weighted_score DESC
  `).all(eventId) as any[];

  rankedBids.forEach((rb, idx) => {
    db.prepare(`UPDATE bids SET final_rank = ? WHERE id = ?`).run(idx + 1, rb.id);
  });

  logAudit({
    action: 'EVALUATION_SCORES_CALCULATED',
    module: 'TENDER_EVALUATION',
    recordId: eventId,
    comments: `Computed multi-criteria technical & commercial scores for ${rankedBids.length} bids.`
  });

  return db.prepare(`
    SELECT b.*, s.legal_name as supplier_name, s.supplier_code, s.risk_rating, s.performance_score
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.event_id = ?
    ORDER BY b.final_rank ASC
  `).all(eventId);
}

import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const performanceRiskRouter = Router();

// List Supplier Performance Scorecards
performanceRiskRouter.get('/performance', authenticateToken, (req: AuthRequest, res: Response) => {
  const { supplierId } = req.query;

  let query = `
    SELECT sp.*, s.legal_name as supplier_name, s.supplier_code, s.risk_rating
    FROM supplier_performance sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (supplierId) {
    query += ` AND sp.supplier_id = ?`;
    params.push(supplierId);
  }

  query += ` ORDER BY sp.created_at DESC`;
  const scorecards = db.prepare(query).all(...params);

  return res.json(scorecards);
});

// Create or Update Supplier Scorecard
performanceRiskRouter.post('/performance', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      supplierId,
      period,
      deliveryScore = 90,
      qualityScore = 90,
      priceScore = 85,
      responsivenessScore = 85,
      complianceScore = 95,
      comments
    } = req.body;

    if (!supplierId || !period) {
      return res.status(400).json({ error: 'Supplier and evaluation period are required' });
    }

    // Weighted Score: Delivery (25%), Quality (25%), Price (20%), Responsiveness (20%), Compliance (10%)
    const overall = (
      (deliveryScore * 0.25) +
      (qualityScore * 0.25) +
      (priceScore * 0.20) +
      (responsivenessScore * 0.20) +
      (complianceScore * 0.10)
    );

    let ratingStatus = 'Good';
    if (overall >= 90) ratingStatus = 'Excellent';
    else if (overall >= 80) ratingStatus = 'Good';
    else if (overall >= 70) ratingStatus = 'Satisfactory';
    else if (overall >= 60) ratingStatus = 'Needs Improvement';
    else ratingStatus = 'Critical';

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO supplier_performance (
        id, supplier_id, period, delivery_score, quality_score, price_competitiveness_score,
        responsiveness_score, compliance_score, overall_score, rating_status, comments, evaluated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      supplierId,
      period,
      deliveryScore,
      qualityScore,
      priceScore,
      responsivenessScore,
      complianceScore,
      parseFloat(overall.toFixed(1)),
      ratingStatus,
      comments || null,
      req.user!.email
    );

    // Update master performance score on supplier record
    db.prepare(`UPDATE suppliers SET performance_score = ? WHERE id = ?`).run(parseFloat(overall.toFixed(1)), supplierId);

    logAudit({
      userId: req.user!.id,
      action: 'UPDATE_SUPPLIER_SCORECARD',
      module: 'SUPPLIER_PERFORMANCE',
      recordId: supplierId,
      comments: `Scorecard recorded for ${period}: Overall ${overall.toFixed(1)}% (${ratingStatus})`
    });

    return res.status(201).json({
      message: 'Supplier performance scorecard created successfully!',
      overallScore: parseFloat(overall.toFixed(1)),
      ratingStatus
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save scorecard' });
  }
});

// Get or Update Supplier Risk Matrix
performanceRiskRouter.get('/risk', authenticateToken, (req: AuthRequest, res: Response) => {
  const risks = db.prepare(`
    SELECT sr.*, s.legal_name as supplier_name, s.supplier_code, s.country, s.status as supplier_status
    FROM supplier_risk sr
    JOIN suppliers s ON s.id = sr.supplier_id
    ORDER BY sr.overall_risk_score ASC
  `).all();

  return res.json(risks);
});

// Update Risk Scores & Mitigation
performanceRiskRouter.put('/risk/:supplierId', authenticateToken, (req: AuthRequest, res: Response) => {
  const supplierId = req.params.supplierId;
  const {
    financialScore = 80,
    complianceScore = 80,
    operationalScore = 80,
    cybersecurityScore = 80,
    legalScore = 80,
    geographicScore = 80,
    deliveryScore = 80,
    qualityScore = 80,
    mitigationPlan,
    riskOwner,
    reviewDate
  } = req.body;

  const avgRisk = (
    financialScore + complianceScore + operationalScore + cybersecurityScore +
    legalScore + geographicScore + deliveryScore + qualityScore
  ) / 8.0;

  let rating = 'Low';
  if (avgRisk < 60) rating = 'Critical';
  else if (avgRisk < 75) rating = 'High';
  else if (avgRisk < 85) rating = 'Medium';
  else rating = 'Low';

  db.prepare(`
    INSERT OR REPLACE INTO supplier_risk (
      id, supplier_id, financial_score, compliance_score, operational_score,
      cybersecurity_score, legal_score, geographic_score, delivery_score, quality_score,
      overall_risk_score, overall_risk_rating, mitigation_plan, risk_owner, review_date, updated_at
    ) VALUES (
      COALESCE((SELECT id FROM supplier_risk WHERE supplier_id = ?), ?),
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    )
  `).run(
    supplierId,
    crypto.randomUUID(),
    supplierId,
    financialScore,
    complianceScore,
    operationalScore,
    cybersecurityScore,
    legalScore,
    geographicScore,
    deliveryScore,
    qualityScore,
    parseFloat(avgRisk.toFixed(1)),
    rating,
    mitigationPlan || null,
    riskOwner || null,
    reviewDate || null
  );

  db.prepare(`UPDATE suppliers SET risk_rating = ? WHERE id = ?`).run(rating, supplierId);

  logAudit({
    userId: req.user!.id,
    action: 'UPDATE_RISK_MATRIX',
    module: 'SUPPLIER_RISK',
    recordId: supplierId,
    comments: `Updated risk matrix: Score ${avgRisk.toFixed(1)} (${rating})`
  });

  return res.json({ message: 'Supplier risk assessment updated successfully!', overallRiskRating: rating });
});

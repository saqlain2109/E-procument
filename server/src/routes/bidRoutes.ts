import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';

export const bidRouter = Router();

// Get Bids for an Event (with Blind Bid Confidentiality Protection)
bidRouter.get('/event/:eventId', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.eventId;
  const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
  if (!event) return res.status(404).json({ error: 'Event not found' });

  let bids = db.prepare(`
    SELECT b.*, s.legal_name as supplier_name, s.supplier_code, s.country, s.risk_rating, s.performance_score
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.event_id = ? AND b.status != 'Draft'
    ORDER BY b.created_at DESC
  `).all(eventId) as any[];

  // Confidentiality Check: If bids are still sealed (prior to bid opening) OR user is purely a technical evaluator
  const isBidOpened = ['Evaluation', 'Award Approval', 'Awarded', 'Contracted'].includes(event.status);
  const isAuthorizedCommercial = [RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN, RoleName.FINANCE_USER].includes(req.user?.role as RoleName);

  if (!isBidOpened && !isAuthorizedCommercial) {
    // Mask commercial information
    bids = bids.map((b) => ({
      ...b,
      total_bid_amount: 0,
      tax_amount: 0,
      discount_amount: 0,
      is_commercial_sealed: true
    }));
  }

  return res.json(bids);
});

// Get Supplier's Own Bids
bidRouter.get('/my-bids', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user?.supplier_id) {
    return res.status(403).json({ error: 'Only suppliers have bid records here' });
  }

  const bids = db.prepare(`
    SELECT b.*, e.title as event_title, e.event_number, e.event_type, e.status as event_status,
           e.bid_submission_deadline, e.currency as event_currency
    FROM bids b
    JOIN procurement_events e ON e.id = b.event_id
    WHERE b.supplier_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.supplier_id);

  return res.json(bids);
});

// Single Bid Details
bidRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const bidId = req.params.id;

  const bid = db.prepare(`
    SELECT b.*, s.legal_name as supplier_name, s.supplier_code, s.tax_number,
           e.title as event_title, e.event_number, e.event_type, e.status as event_status, e.bid_submission_deadline
    FROM bids b
    JOIN suppliers s ON s.id = b.supplier_id
    JOIN procurement_events e ON e.id = b.event_id
    WHERE b.id = ?
  `).get(bidId) as any;

  if (!bid) return res.status(404).json({ error: 'Bid not found' });

  // Security Check
  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id !== bid.supplier_id) {
    return res.status(403).json({ error: 'Unauthorized to view this bid' });
  }

  const items = db.prepare(`
    SELECT bi.*, pei.item_number, pei.description as item_description, pei.unit
    FROM bid_items bi
    JOIN procurement_event_items pei ON pei.id = bi.event_item_id
    WHERE bi.bid_id = ?
  `).all(bidId);

  const technicalResponses = db.prepare(`
    SELECT tr.*, r.requirement_code, r.requirement_title, r.requirement_type, r.is_mandatory
    FROM bid_technical_responses tr
    JOIN tender_technical_requirements r ON r.id = tr.requirement_id
    WHERE tr.bid_id = ?
  `).all(bidId);

  const documents = db.prepare(`SELECT * FROM bid_documents WHERE bid_id = ?`).all(bidId);
  const evaluationScores = db.prepare(`
    SELECT es.*, ec.stage, ec.criteria_name, ec.weight, u.first_name as evaluator_first, u.last_name as evaluator_last
    FROM evaluation_scores es
    JOIN evaluation_criteria ec ON ec.id = es.criteria_id
    JOIN users u ON u.id = es.evaluator_id
    WHERE es.bid_id = ?
  `).all(bidId);

  return res.json({ bid, items, technicalResponses, documents, evaluationScores });
});

// Submit / Save Sealed Bid
bidRouter.post('/submit', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      eventId,
      items = [],
      technicalResponses = [],
      deliveryTimelineDays,
      warrantyPeriodMonths,
      currency = 'USD',
      isDraft = false
    } = req.body;

    if (!req.user?.supplier_id) {
      return res.status(403).json({ error: 'Only authorized suppliers can submit bids' });
    }

    const supplierId = req.user.supplier_id;
    const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as any;

    if (!supplier || supplier.status === 'Suspended' || supplier.status === 'Blacklisted') {
      return res.status(403).json({ error: 'Your supplier account is suspended or ineligible to bid.' });
    }

    const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
    if (!event) return res.status(404).json({ error: 'Procurement event not found' });

    // Enforce submission deadline for non-drafts
    if (!isDraft && new Date() > new Date(event.bid_submission_deadline)) {
      return res.status(400).json({ error: 'Bid submission deadline has expired. Submissions are locked.' });
    }

    // Check if bid already exists
    let existingBid = db.prepare(`SELECT id, is_locked FROM bids WHERE event_id = ? AND supplier_id = ?`).get(eventId, supplierId) as any;

    if (existingBid && existingBid.is_locked && !event.allow_resubmission) {
      return res.status(400).json({ error: 'You have already submitted a bid for this event and modifications are locked.' });
    }

    let bidId = existingBid?.id;
    let bidNumber = '';

    let totalBidAmount = 0;
    for (const it of items) {
      totalBidAmount += (it.offeredQuantity || 0) * (it.unitPrice || 0);
    }

    const ackCode = `ACK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;

    if (!bidId) {
      bidId = crypto.randomUUID();
      bidNumber = getNextNumber('BID');

      db.prepare(`
        INSERT INTO bids (
          id, bid_number, event_id, supplier_id, total_bid_amount, delivery_timeline_days, warranty_period_months,
          currency, submission_timestamp, is_locked, acknowledgement_code, status, compliance_check_passed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, 1)
      `).run(
        bidId,
        bidNumber,
        eventId,
        supplierId,
        totalBidAmount,
        deliveryTimelineDays || 30,
        warrantyPeriodMonths || 12,
        currency,
        isDraft ? 0 : 1,
        ackCode,
        isDraft ? 'Draft' : 'Submitted'
      );
    } else {
      db.prepare(`
        UPDATE bids 
        SET total_bid_amount = ?, delivery_timeline_days = ?, warranty_period_months = ?,
            submission_timestamp = CURRENT_TIMESTAMP, is_locked = ?, acknowledgement_code = ?,
            status = ?, compliance_check_passed = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        totalBidAmount,
        deliveryTimelineDays || 30,
        warrantyPeriodMonths || 12,
        isDraft ? 0 : 1,
        ackCode,
        isDraft ? 'Draft' : 'Submitted',
        bidId
      );

      // Clean old line items & technical responses for fresh insert
      db.prepare(`DELETE FROM bid_items WHERE bid_id = ?`).run(bidId);
      db.prepare(`DELETE FROM bid_technical_responses WHERE bid_id = ?`).run(bidId);
    }

    // Insert Line items
    for (const it of items) {
      const lineTotal = (it.offeredQuantity || 0) * (it.unitPrice || 0);
      db.prepare(`
        INSERT INTO bid_items (id, bid_id, event_item_id, offered_quantity, unit_price, total_price, brand_model, lead_time_days, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        bidId,
        it.eventItemId,
        it.offeredQuantity || 1,
        it.unitPrice || 0,
        lineTotal,
        it.brandModel || null,
        it.leadTimeDays || null,
        it.remarks || null
      );
    }

    // Insert Technical responses
    for (const tr of technicalResponses) {
      db.prepare(`
        INSERT INTO bid_technical_responses (id, bid_id, requirement_id, response_value)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), bidId, tr.requirementId, tr.responseValue || 'Yes');
    }

    // Update participation status
    db.prepare(`
      INSERT OR REPLACE INTO procurement_participants (id, event_id, supplier_id, interest_status)
      VALUES (?, ?, ?, 'Submitted')
    `).run(crypto.randomUUID(), eventId, supplierId);

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: isDraft ? 'SAVE_BID_DRAFT' : 'SUBMIT_BID',
      module: 'BID',
      recordId: bidId,
      comments: `Supplier submitted bid ${bidNumber || bidId} for tender ${event.event_number} - Total: $${totalBidAmount}`
    });

    if (!isDraft) {
      sendNotification(
        req.user.id,
        `Bid Submission Confirmed: ${event.event_number}`,
        `Your bid has been successfully locked and sealed. Acknowledgement code: ${ackCode}`,
        'SUCCESS',
        'BID',
        bidId
      );
    }

    return res.status(201).json({
      message: isDraft ? 'Bid draft saved successfully.' : 'Bid submitted and encrypted successfully! Sealed until opening.',
      bidId,
      acknowledgementCode: ackCode,
      status: isDraft ? 'Draft' : 'Submitted'
    });
  } catch (err: any) {
    console.error('Bid submission error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit bid' });
  }
});

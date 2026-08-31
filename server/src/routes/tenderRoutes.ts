import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName, TenderStatus, WorkflowModule } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { logAudit } from '../services/auditService';
import { sendNotification, notifyRole } from '../services/notificationService';
import { startWorkflowInstance } from '../services/workflowEngine';

export const tenderRouter = Router();

// List Sourcing Events
tenderRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { type, status, category, search } = req.query;

  let query = `
    SELECT e.*, d.name as department_name, u.first_name as officer_first, u.last_name as officer_last,
           (SELECT COUNT(*) FROM procurement_event_items WHERE event_id = e.id) as item_count,
           (SELECT COUNT(*) FROM procurement_participants WHERE event_id = e.id) as invited_count,
           (SELECT COUNT(*) FROM bids WHERE event_id = e.id AND status != 'Draft') as bid_count,
           (SELECT COUNT(*) FROM clarifications WHERE event_id = e.id) as qa_count
    FROM procurement_events e
    JOIN departments d ON d.id = e.department_id
    JOIN users u ON u.id = e.procurement_officer_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // If supplier role, filter only public or invited tenders
  if (req.user?.role === RoleName.SUPPLIER) {
    query += ` AND (e.is_public = 1 OR e.id IN (SELECT event_id FROM procurement_participants WHERE supplier_id = ?))`;
    params.push(req.user.supplier_id || 'NONE');
    query += ` AND e.status IN ('Published', 'Question Period', 'Bid Submission', 'Closed', 'Bid Opening', 'Evaluation', 'Awarded')`;
  }

  if (type) {
    query += ` AND e.event_type = ?`;
    params.push(type);
  }
  if (status) {
    query += ` AND e.status = ?`;
    params.push(status);
  }
  if (category) {
    query += ` AND e.procurement_category = ?`;
    params.push(category);
  }
  if (search) {
    query += ` AND (e.title LIKE ? OR e.event_number LIKE ? OR e.description LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY e.created_at DESC`;
  const events = db.prepare(query).all(...params);

  return res.json(events);
});

// Single Sourcing Event Detail
tenderRouter.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.id;

  const event = db.prepare(`
    SELECT e.*, d.name as department_name, u.first_name as officer_first, u.last_name as officer_last, u.email as officer_email
    FROM procurement_events e
    JOIN departments d ON d.id = e.department_id
    JOIN users u ON u.id = e.procurement_officer_id
    WHERE e.id = ?
  `).get(eventId) as any;

  if (!event) return res.status(404).json({ error: 'Procurement event not found' });

  const items = db.prepare(`SELECT * FROM procurement_event_items WHERE event_id = ? ORDER BY item_number ASC`).all(eventId);
  const technicalRequirements = db.prepare(`SELECT * FROM tender_technical_requirements WHERE event_id = ?`).all(eventId);
  const evaluationCriteria = db.prepare(`SELECT * FROM evaluation_criteria WHERE event_id = ?`).all(eventId);
  const committeeMembers = db.prepare(`
    SELECT cm.*, u.first_name, u.last_name, u.email, r.name as role_name
    FROM tender_committee_members cm
    JOIN users u ON u.id = cm.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE cm.event_id = ?
  `).all(eventId);
  const documents = db.prepare(`SELECT * FROM tender_documents WHERE event_id = ?`).all(eventId);

  // If user is supplier, check their participation status and submitted bid
  let supplierParticipation = null;
  let supplierBid = null;

  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id) {
    supplierParticipation = db.prepare(`
      SELECT * FROM procurement_participants WHERE event_id = ? AND supplier_id = ?
    `).get(eventId, req.user.supplier_id);

    supplierBid = db.prepare(`
      SELECT * FROM bids WHERE event_id = ? AND supplier_id = ?
    `).get(eventId, req.user.supplier_id);
  }

  // Clarifications
  let clarificationsQuery = `
    SELECT c.*, s.legal_name as supplier_name
    FROM clarifications c
    JOIN suppliers s ON s.id = c.supplier_id
    WHERE c.event_id = ?
  `;
  if (req.user?.role === RoleName.SUPPLIER) {
    clarificationsQuery += ` AND (c.is_public = 1 OR c.supplier_id = '${req.user.supplier_id}')`;
  }
  clarificationsQuery += ` ORDER BY c.created_at DESC`;
  const rawClarifications = db.prepare(clarificationsQuery).all(eventId) as any[];

  // Anonymize supplier identity on public clarifications as required by specs
  const clarifications = rawClarifications.map((c) => ({
    ...c,
    supplier_name: (req.user?.role === RoleName.SUPPLIER && c.supplier_id !== req.user.supplier_id) ? 'Prospective Bidder' : c.supplier_name
  }));

  // Participants list for admin view
  let participants: any[] = [];
  if (req.user?.role !== RoleName.SUPPLIER) {
    participants = db.prepare(`
      SELECT p.*, s.legal_name, s.supplier_code, s.country, s.status as supplier_status, s.risk_rating
      FROM procurement_participants p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.event_id = ?
    `).all(eventId);
  }

  return res.json({
    event,
    items,
    technicalRequirements,
    evaluationCriteria,
    committeeMembers,
    documents,
    clarifications,
    participants,
    supplierParticipation,
    supplierBid
  });
});

// Create Sourcing Event (RFQ/RFP/Tender/Auction Wizard)
tenderRouter.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const {
      eventType,
      title,
      description,
      procurementCategory,
      departmentId,
      bidSubmissionDeadline,
      expectedAwardDate,
      estimatedBudget,
      currency,
      paymentTerms,
      deliveryTerms,
      contractDuration,
      deliveryLocation,
      isPublic,
      technicalWeight = 60,
      commercialWeight = 40,
      items = [],
      technicalRequirements = [],
      evaluationCriteria = [],
      invitedSupplierIds = [],
      committeeUserIds = [],
      status = 'Draft'
    } = req.body;

    if (!title || !eventType || !procurementCategory || !departmentId || !bidSubmissionDeadline) {
      return res.status(400).json({ error: 'Missing mandatory tender fields' });
    }

    const eventId = crypto.randomUUID();
    const eventNumber = getNextNumber(eventType || 'TENDER');

    db.prepare(`
      INSERT INTO procurement_events (
        id, event_number, event_type, title, description, procurement_category, department_id,
        procurement_officer_id, bid_submission_deadline, expected_award_date, estimated_budget,
        currency, payment_terms, delivery_terms, contract_duration, delivery_location,
        is_public, technical_weight, commercial_weight, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      eventNumber,
      eventType,
      title,
      description || null,
      procurementCategory,
      departmentId,
      req.user!.id,
      bidSubmissionDeadline,
      expectedAwardDate || null,
      estimatedBudget || 0,
      currency || 'USD',
      paymentTerms || null,
      deliveryTerms || null,
      contractDuration || null,
      deliveryLocation || null,
      isPublic ? 1 : 0,
      technicalWeight,
      commercialWeight,
      status
    );

    // 1. Insert Items
    items.forEach((item: any, idx: number) => {
      db.prepare(`
        INSERT INTO procurement_event_items (
          id, event_id, item_number, description, specification, quantity, unit, required_delivery_date, estimated_price, is_mandatory
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        eventId,
        idx + 1,
        item.description,
        item.specification || null,
        item.quantity || 1,
        item.unit || 'Units',
        item.requiredDeliveryDate || null,
        item.estimatedPrice || null,
        item.isMandatory !== false ? 1 : 0
      );
    });

    // 2. Insert Technical Requirements
    technicalRequirements.forEach((reqItem: any, idx: number) => {
      db.prepare(`
        INSERT INTO tender_technical_requirements (
          id, event_id, requirement_code, requirement_title, requirement_type, is_mandatory, min_value, max_value, weight
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        eventId,
        `TR-${idx + 1}`,
        reqItem.title || reqItem.requirement_title,
        reqItem.type || reqItem.requirement_type || 'TEXT',
        reqItem.isMandatory !== false ? 1 : 0,
        reqItem.minValue || null,
        reqItem.maxValue || null,
        reqItem.weight || 10
      );
    });

    // 3. Insert Evaluation Criteria
    if (evaluationCriteria.length === 0) {
      // Default standard criteria
      const defaults = [
        { stage: 'Technical', name: 'Relevant Experience & Track Record', weight: 25 },
        { stage: 'Technical', name: 'Technical Capability & Architecture', weight: 25 },
        { stage: 'Technical', name: 'Methodology & Work Plan', weight: 10 },
        { stage: 'Commercial', name: 'Total Evaluated Price', weight: 30 },
        { stage: 'Commercial', name: 'Delivery Schedule & Warranty', weight: 10 },
      ];
      defaults.forEach((c) => {
        db.prepare(`
          INSERT INTO evaluation_criteria (id, event_id, stage, criteria_name, weight)
          VALUES (?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), eventId, c.stage, c.name, c.weight);
      });
    } else {
      evaluationCriteria.forEach((crit: any) => {
        db.prepare(`
          INSERT INTO evaluation_criteria (id, event_id, stage, criteria_name, description, weight, min_score, is_mandatory)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          eventId,
          crit.stage || 'Technical',
          crit.criteria_name || crit.name,
          crit.description || null,
          crit.weight || 20,
          crit.min_score || 0,
          crit.is_mandatory ? 1 : 0
        );
      });
    }

    // 4. Insert Invited Suppliers
    invitedSupplierIds.forEach((sId: string) => {
      db.prepare(`
        INSERT OR IGNORE INTO procurement_participants (id, event_id, supplier_id, interest_status)
        VALUES (?, ?, ?, 'Invited')
      `).run(crypto.randomUUID(), eventId, sId);
    });

    // 5. Insert Committee Members
    committeeUserIds.forEach((uId: string) => {
      db.prepare(`
        INSERT OR IGNORE INTO tender_committee_members (id, event_id, user_id, role, can_view_commercial)
        VALUES (?, ?, ?, 'Technical Evaluator', 0)
      `).run(crypto.randomUUID(), eventId, uId);
    });

    logAudit({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'CREATE_TENDER',
      module: 'TENDER',
      recordId: eventId,
      comments: `Created ${eventType} ${eventNumber} - ${title}`
    });

    return res.status(201).json({
      message: `${eventType} created successfully!`,
      eventId,
      eventNumber,
      status
    });
  } catch (err: any) {
    console.error('Tender creation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create tender' });
  }
});

// Publish Tender & Notify Invited Suppliers
tenderRouter.post('/:id/publish', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.id;

  const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
  if (!event) return res.status(404).json({ error: 'Tender not found' });

  db.prepare(`
    UPDATE procurement_events 
    SET status = 'Published', publication_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(eventId);

  // Notify all invited suppliers
  const participants = db.prepare(`
    SELECT u.id as user_id, s.legal_name 
    FROM procurement_participants pp
    JOIN suppliers s ON s.id = pp.supplier_id
    JOIN users u ON u.supplier_id = s.id
    WHERE pp.event_id = ?
  `).all(eventId) as any[];

  for (const p of participants) {
    sendNotification(
      p.user_id,
      `Tender Invitation: ${event.title}`,
      `You have been invited to participate in ${event.event_number} (${event.title}). Deadline: ${event.bid_submission_deadline}`,
      'ACTION_REQUIRED',
      'TENDER',
      eventId
    );
  }

  logAudit({
    userId: req.user!.id,
    action: 'PUBLISH_TENDER',
    module: 'TENDER',
    recordId: eventId,
    comments: `Published tender ${event.event_number} to ${participants.length} invited suppliers`
  });

  return res.json({ message: 'Tender published successfully! Suppliers have been notified.' });
});

// Bid Opening Ceremony (Automatic / Committee unsealing of sealed bids)
tenderRouter.post('/:id/open-bids', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.id;

  const event = db.prepare(`SELECT * FROM procurement_events WHERE id = ?`).get(eventId) as any;
  if (!event) return res.status(404).json({ error: 'Tender not found' });

  db.prepare(`
    UPDATE procurement_events 
    SET status = 'Evaluation', bid_opened_at = CURRENT_TIMESTAMP, bid_opened_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user!.email, eventId);

  // Unlock bids for committee evaluation
  db.prepare(`
    UPDATE bids 
    SET status = 'Under Evaluation', updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ? AND status = 'Submitted'
  `).run(eventId);

  logAudit({
    userId: req.user!.id,
    action: 'BID_OPENING',
    module: 'TENDER',
    recordId: eventId,
    comments: `Official Bid Opening completed. Unsealed bids for evaluation.`
  });

  return res.json({ message: 'Bid opening completed! Sealed bids are now unlocked for committee evaluation.' });
});

// Supplier Ask Question / Clarification
tenderRouter.post('/:id/clarifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const eventId = req.params.id;
  const { question, isPublic = true } = req.body;

  if (!req.user?.supplier_id) {
    return res.status(403).json({ error: 'Only suppliers can post clarification questions.' });
  }

  const qId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO clarifications (id, event_id, supplier_id, question, is_public, status)
    VALUES (?, ?, ?, ?, ?, 'Pending')
  `).run(qId, eventId, req.user.supplier_id, question, isPublic ? 1 : 0);

  return res.status(201).json({ message: 'Question submitted. The procurement officer will respond.' });
});

// Procurement Officer Answer Clarification
tenderRouter.post('/:id/clarifications/:qId/answer', authenticateToken, (req: AuthRequest, res: Response) => {
  const { qId } = req.params;
  const { answer } = req.body;

  db.prepare(`
    UPDATE clarifications 
    SET answer = ?, answered_by = ?, answered_at = CURRENT_TIMESTAMP, status = 'Answered'
    WHERE id = ?
  `).run(answer, req.user!.email, qId);

  return res.json({ message: 'Clarification answer posted.' });
});

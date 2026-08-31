import { Router, Response } from 'express';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { RoleName } from '../config/constants';

export const analyticsRouter = Router();

// Admin Executive Dashboard Analytics
analyticsRouter.get('/admin-dashboard', authenticateToken, (req: AuthRequest, res: Response) => {
  // 1. Supplier KPIs
  const totalSuppliers = (db.prepare(`SELECT COUNT(*) as c FROM suppliers`).get() as any)?.c || 0;
  const pendingRegistrations = (db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE status IN ('Submitted', 'Under Review', 'Pending Approval')`).get() as any)?.c || 0;
  const approvedSuppliers = (db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE status IN ('Approved', 'Active', 'Qualified', 'Preferred')`).get() as any)?.c || 0;
  const suspendedSuppliers = (db.prepare(`SELECT COUNT(*) as c FROM suppliers WHERE status = 'Suspended'`).get() as any)?.c || 0;

  // 2. Sourcing KPIs
  const activeTenders = (db.prepare(`SELECT COUNT(*) as c FROM procurement_events WHERE status IN ('Published', 'Question Period', 'Bid Submission')`).get() as any)?.c || 0;
  const closingSoon = (db.prepare(`SELECT COUNT(*) as c FROM procurement_events WHERE status IN ('Published', 'Bid Submission') AND date(bid_submission_deadline) <= date('now', '+7 days')`).get() as any)?.c || 0;
  const bidsReceived = (db.prepare(`SELECT COUNT(*) as c FROM bids WHERE status != 'Draft'`).get() as any)?.c || 0;
  const pendingEvaluations = (db.prepare(`SELECT COUNT(*) as c FROM procurement_events WHERE status = 'Evaluation'`).get() as any)?.c || 0;
  const pendingApprovals = (db.prepare(`SELECT COUNT(*) as c FROM approval_instances WHERE status = 'Pending'`).get() as any)?.c || 0;

  // 3. Commercial & Financial KPIs
  const activeContractsCount = (db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status = 'Active'`).get() as any)?.c || 0;
  const contractsExpiringCount = (db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status = 'Active' AND date(end_date) <= date('now', '+90 days')`).get() as any)?.c || 0;
  const totalPoValue = (db.prepare(`SELECT SUM(grand_total) as s FROM purchase_orders WHERE status NOT IN ('Draft', 'Supplier Rejected')`).get() as any)?.s || 0;
  const totalInvoiceValue = (db.prepare(`SELECT SUM(total_amount) as s FROM invoices`).get() as any)?.s || 0;
  const totalPaidAmount = (db.prepare(`SELECT SUM(amount) as s FROM payments WHERE status = 'Completed'`).get() as any)?.s || 0;
  const pendingInvoicesCount = (db.prepare(`SELECT COUNT(*) as c FROM invoices WHERE status IN ('Submitted', 'Under Verification', 'Matched', 'Exception')`).get() as any)?.c || 0;
  const avgSupplierScore = (db.prepare(`SELECT AVG(performance_score) as avg FROM suppliers WHERE status = 'Active'`).get() as any)?.avg || 86.5;

  // 4. Spend by Category Chart Data
  const spendByCategory = db.prepare(`
    SELECT pr.procurement_category as category, SUM(pr.estimated_total) as spend, COUNT(pr.id) as count
    FROM procurement_requests pr
    GROUP BY pr.procurement_category
    ORDER BY spend DESC
  `).all();

  // 5. Suppliers by Status Chart Data
  const suppliersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM suppliers GROUP BY status
  `).all();

  // 6. Monthly Procurement Spend Trends (Mock/Live aggregation)
  const monthlySpend = [
    { month: 'Jan', poSpend: 145000, invoiceSpend: 120000, paid: 115000 },
    { month: 'Feb', poSpend: 210000, invoiceSpend: 185000, paid: 175000 },
    { month: 'Mar', poSpend: 340000, invoiceSpend: 290000, paid: 260000 },
    { month: 'Apr', poSpend: 280000, invoiceSpend: 260000, paid: 240000 },
    { month: 'May', poSpend: 420000, invoiceSpend: 390000, paid: 350000 },
    { month: 'Jun', poSpend: 510000, invoiceSpend: 470000, paid: 430000 }
  ];

  // 7. Recent Sourcing Events & Invoices
  const recentEvents = db.prepare(`
    SELECT e.id, e.event_number, e.title, e.event_type, e.status, e.bid_submission_deadline, e.estimated_budget
    FROM procurement_events e ORDER BY e.created_at DESC LIMIT 5
  `).all();

  const recentApprovals = db.prepare(`
    SELECT i.*, w.name as workflow_name, u.first_name, u.last_name
    FROM approval_instances i
    JOIN approval_workflows w ON w.id = i.workflow_id
    JOIN users u ON u.id = i.requested_by
    WHERE i.status = 'Pending'
    ORDER BY i.created_at DESC LIMIT 5
  `).all();

  return res.json({
    kpis: {
      totalSuppliers,
      pendingRegistrations,
      approvedSuppliers,
      suspendedSuppliers,
      activeTenders,
      closingSoon,
      bidsReceived,
      pendingEvaluations,
      pendingApprovals,
      activeContractsCount,
      contractsExpiringCount,
      totalPoValue,
      totalInvoiceValue,
      totalPaidAmount,
      outstandingAmount: totalInvoiceValue - totalPaidAmount,
      pendingInvoicesCount,
      avgSupplierScore: parseFloat(avgSupplierScore.toFixed(1))
    },
    spendByCategory,
    suppliersByStatus,
    monthlySpend,
    recentEvents,
    recentApprovals
  });
});

// Supplier Dashboard Analytics
analyticsRouter.get('/supplier-dashboard', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user?.supplier_id) {
    return res.status(403).json({ error: 'Only supplier accounts have this dashboard' });
  }

  const supplierId = req.user.supplier_id;
  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as any;

  const openOpportunitiesCount = (db.prepare(`
    SELECT COUNT(*) as c FROM procurement_events 
    WHERE status IN ('Published', 'Question Period', 'Bid Submission')
  `).get() as any)?.c || 0;

  const submittedBidsCount = (db.prepare(`
    SELECT COUNT(*) as c FROM bids WHERE supplier_id = ? AND status != 'Draft'
  `).get(supplierId) as any)?.c || 0;

  const awardsCount = (db.prepare(`
    SELECT COUNT(*) as c FROM awards WHERE supplier_id = ? AND status = 'Approved'
  `).get(supplierId) as any)?.c || 0;

  const activeContractsCount = (db.prepare(`
    SELECT COUNT(*) as c FROM contracts WHERE supplier_id = ? AND status = 'Active'
  `).get(supplierId) as any)?.c || 0;

  const purchaseOrdersCount = (db.prepare(`
    SELECT COUNT(*) as c FROM purchase_orders WHERE supplier_id = ? AND status NOT IN ('Draft', 'Approval')
  `).get(supplierId) as any)?.c || 0;

  const pendingDeliveriesCount = (db.prepare(`
    SELECT COUNT(*) as c FROM purchase_orders WHERE supplier_id = ? AND status IN ('Supplier Accepted', 'Partially Delivered')
  `).get(supplierId) as any)?.c || 0;

  const invoicesCount = (db.prepare(`
    SELECT COUNT(*) as c FROM invoices WHERE supplier_id = ?
  `).get(supplierId) as any)?.c || 0;

  const totalPaymentsReceived = (db.prepare(`
    SELECT SUM(amount) as s FROM payments WHERE supplier_id = ? AND status = 'Completed'
  `).get(supplierId) as any)?.s || 0;

  const expiringDocsCount = (db.prepare(`
    SELECT COUNT(*) as c FROM supplier_documents 
    WHERE supplier_id = ? AND (date(expiry_date) <= date('now', '+90 days') OR status = 'Expired')
  `).get(supplierId) as any)?.c || 0;

  const openTenders = db.prepare(`
    SELECT id, event_number, title, event_type, bid_submission_deadline, currency, estimated_budget
    FROM procurement_events 
    WHERE status IN ('Published', 'Question Period', 'Bid Submission')
    ORDER BY bid_submission_deadline ASC LIMIT 4
  `).all();

  const myRecentBids = db.prepare(`
    SELECT b.*, e.title as event_title, e.event_number 
    FROM bids b
    JOIN procurement_events e ON e.id = b.event_id
    WHERE b.supplier_id = ?
    ORDER BY b.created_at DESC LIMIT 4
  `).all(supplierId);

  return res.json({
    supplier,
    kpis: {
      profileCompletion: supplier?.profile_completion || 100,
      registrationStatus: supplier?.status || 'Active',
      riskRating: supplier?.risk_rating || 'Low',
      performanceScore: supplier?.performance_score || 85,
      openOpportunitiesCount,
      submittedBidsCount,
      awardsCount,
      activeContractsCount,
      purchaseOrdersCount,
      pendingDeliveriesCount,
      invoicesCount,
      totalPaymentsReceived,
      expiringDocsCount
    },
    openTenders,
    myRecentBids
  });
});

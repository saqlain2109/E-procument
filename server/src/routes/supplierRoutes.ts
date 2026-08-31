import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { db } from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { RoleName, SupplierStatus, WorkflowModule } from '../config/constants';
import { getNextNumber } from '../services/numberGenerator';
import { checkSupplierDuplicates } from '../services/duplicateCheckService';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';
import { startWorkflowInstance } from '../services/workflowEngine';

export const supplierRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Duplicate Check Endpoint
supplierRouter.post('/check-duplicates', (req: Request, res: Response) => {
  const result = checkSupplierDuplicates(req.body);
  return res.json(result);
});

// Register as Supplier (Public 11-step registration submission)
supplierRouter.post('/register', upload.array('documents'), async (req: Request, res: Response) => {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    const files = req.files as Express.Multer.File[];

    // 1. Run duplicate check
    const dupCheck = checkSupplierDuplicates({
      registrationNumber: data.company?.registrationNumber,
      taxNumber: data.tax?.taxNumber,
      legalName: data.company?.legalName,
      email: data.account?.email || data.contacts?.primary?.email,
      accountNumber: data.banking?.accountNumber
    });

    if (dupCheck.isDuplicate && !data.overrideDuplicate) {
      return res.status(409).json({
        error: 'Duplicate supplier detected',
        warning: 'Possible existing supplier found with matching details.',
        matches: dupCheck.matches
      });
    }

    const supplierId = crypto.randomUUID();
    const supplierCode = getNextNumber('SUPPLIER');
    const isDraft = data.isDraft === true;
    const initialStatus = isDraft ? SupplierStatus.DRAFT : SupplierStatus.SUBMITTED;

    // 2. Insert Supplier Master
    db.prepare(`
      INSERT INTO suppliers (
        id, supplier_code, legal_name, trading_name, registration_number, tax_number, vat_number,
        business_type, country, state, city, address, postal_code, website,
        year_established, employee_count, annual_turnover, currency, status, profile_completion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      supplierId,
      supplierCode,
      data.company?.legalName || 'Draft Supplier',
      data.company?.tradingName || null,
      data.company?.registrationNumber || `REG-${Date.now()}`,
      data.tax?.taxNumber || `TAX-${Date.now()}`,
      data.tax?.vatNumber || null,
      data.company?.businessType || 'Corporation',
      data.company?.country || 'United States',
      data.company?.state || null,
      data.company?.city || null,
      data.company?.address || null,
      data.company?.postalCode || null,
      data.company?.website || null,
      data.company?.yearEstablished || 2020,
      data.company?.employeeCount || 50,
      data.company?.annualTurnover || 1000000,
      data.company?.currency || 'USD',
      initialStatus,
      isDraft ? 40 : 100
    );

    // 3. Insert Supplier Account / User
    if (data.account?.email && data.account?.password) {
      const userId = crypto.randomUUID();
      const passwordHash = bcrypt.hashSync(data.account.password, 10);
      const supplierRole = db.prepare(`SELECT id FROM roles WHERE name = ?`).get(RoleName.SUPPLIER) as any;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, supplier_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        data.account.email,
        passwordHash,
        data.account.firstName || 'Supplier',
        data.account.lastName || 'Admin',
        supplierRole?.id || 'ROLE-SUPPLIER',
        supplierId,
        0 // Pending approval before login activation
      );
    }

    // 4. Insert Contacts
    if (data.contacts) {
      const contactTypes = ['primary', 'procurement', 'finance', 'legal'];
      for (const ct of contactTypes) {
        const c = data.contacts[ct];
        if (c && c.name && c.email) {
          db.prepare(`
            INSERT INTO supplier_contacts (id, supplier_id, contact_type, name, email, phone, mobile, designation, is_primary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            supplierId,
            ct.charAt(0).toUpperCase() + ct.slice(1),
            c.name,
            c.email,
            c.phone || null,
            c.mobile || null,
            c.designation || ct,
            ct === 'primary' ? 1 : 0
          );
        }
      }
    }

    // 5. Insert Bank Account
    if (data.banking?.bankName && data.banking?.accountNumber) {
      db.prepare(`
        INSERT INTO supplier_bank_accounts (id, supplier_id, bank_name, branch, account_name, account_number, iban, swift_bic, currency, bank_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        supplierId,
        data.banking.bankName,
        data.banking.branch || null,
        data.banking.accountName || data.company?.legalName || 'Supplier',
        data.banking.accountNumber,
        data.banking.iban || null,
        data.banking.swiftBic || null,
        data.banking.currency || 'USD',
        data.banking.bankAddress || null
      );
    }

    // 6. Insert Categories
    if (Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        db.prepare(`
          INSERT OR IGNORE INTO supplier_categories (supplier_id, category_code, category_name)
          VALUES (?, ?, ?)
        `).run(supplierId, cat.code || cat, cat.name || cat);
      }
    }

    // 7. Insert Initial Risk Matrix Baseline
    db.prepare(`
      INSERT INTO supplier_risk (id, supplier_id, financial_score, compliance_score, operational_score, cybersecurity_score, legal_score, geographic_score, delivery_score, quality_score, overall_risk_score, overall_risk_rating)
      VALUES (?, ?, 85, 90, 85, 88, 90, 85, 85, 85, 86.5, 'Low')
    `).run(crypto.randomUUID(), supplierId);

    // 8. Record Status History
    db.prepare(`
      INSERT INTO supplier_status_history (id, supplier_id, previous_status, new_status, changed_by, change_reason)
      VALUES (?, ?, NULL, ?, 'Self Registration', 'Online registration submitted')
    `).run(crypto.randomUUID(), supplierId, initialStatus);

    // 9. If submitted, initiate Dynamic Approval Workflow
    if (!isDraft) {
      // Find a procurement admin to attribute the request initiation
      const admin = db.prepare(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = ? LIMIT 1`).get(RoleName.PROCUREMENT_ADMIN) as any;
      const requesterId = admin ? admin.id : 'SYSTEM';

      startWorkflowInstance({
        module: WorkflowModule.SUPPLIER_REGISTRATION,
        recordId: supplierId,
        referenceNumber: supplierCode,
        requestedBy: requesterId
      });
    }


    logAudit({
      action: isDraft ? 'SUPPLIER_DRAFT_SAVED' : 'SUPPLIER_REGISTERED',
      module: 'SUPPLIER',
      recordId: supplierId,
      comments: `Supplier registration (${supplierCode}) - ${data.company?.legalName}`
    });

    return res.status(201).json({
      message: isDraft ? 'Registration progress saved successfully.' : 'Supplier registration submitted successfully! Under review.',
      supplierId,
      supplierCode,
      status: initialStatus
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Failed to complete supplier registration' });
  }
});

// List Suppliers with Filtering & Search
supplierRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, category, country, risk, search, page = '1', limit = '50' } = req.query;

  let query = `
    SELECT s.*, 
      (SELECT COUNT(*) FROM supplier_documents WHERE supplier_id = s.id) as doc_count,
      (SELECT COUNT(*) FROM bids WHERE supplier_id = s.id) as bid_count,
      (SELECT COUNT(*) FROM contracts WHERE supplier_id = s.id AND status = 'Active') as active_contracts_count,
      (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.id) as po_count
    FROM suppliers s
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ` AND s.status = ?`;
    params.push(status);
  }
  if (country) {
    query += ` AND s.country = ?`;
    params.push(country);
  }
  if (risk) {
    query += ` AND s.risk_rating = ?`;
    params.push(risk);
  }
  if (search) {
    query += ` AND (s.legal_name LIKE ? OR s.supplier_code LIKE ? OR s.registration_number LIKE ? OR s.tax_number LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY s.created_at DESC`;
  const suppliers = db.prepare(query).all(...params);

  return res.json(suppliers);
});

// Supplier 360 Full Profile View
supplierRouter.get('/:id/360', authenticateToken, (req: AuthRequest, res: Response) => {
  const supplierId = req.params.id;

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as any;
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  // Security Check: Suppliers can only view their own 360 profile
  if (req.user?.role === RoleName.SUPPLIER && req.user.supplier_id !== supplierId) {
    return res.status(403).json({ error: 'Unauthorized to view this supplier profile' });
  }

  const contacts = db.prepare(`SELECT * FROM supplier_contacts WHERE supplier_id = ?`).all(supplierId);
  const addresses = db.prepare(`SELECT * FROM supplier_addresses WHERE supplier_id = ?`).all(supplierId);
  const categories = db.prepare(`SELECT * FROM supplier_categories WHERE supplier_id = ?`).all(supplierId);
  const bankAccounts = db.prepare(`SELECT * FROM supplier_bank_accounts WHERE supplier_id = ?`).all(supplierId);
  const documents = db.prepare(`SELECT * FROM supplier_documents WHERE supplier_id = ? ORDER BY created_at DESC`).all(supplierId);
  const risk = db.prepare(`SELECT * FROM supplier_risk WHERE supplier_id = ?`).get(supplierId);
  const performance = db.prepare(`SELECT * FROM supplier_performance WHERE supplier_id = ? ORDER BY period DESC`).all(supplierId);
  const statusHistory = db.prepare(`SELECT * FROM supplier_status_history WHERE supplier_id = ? ORDER BY created_at DESC`).all(supplierId);
  const debarments = db.prepare(`SELECT * FROM supplier_debarments WHERE supplier_id = ?`).all(supplierId);

  // Sourcing & Commercial Records
  const bids = db.prepare(`
    SELECT b.*, e.title as event_title, e.event_number, e.event_type
    FROM bids b
    JOIN procurement_events e ON e.id = b.event_id
    WHERE b.supplier_id = ?
    ORDER BY b.created_at DESC
  `).all(supplierId);

  const contracts = db.prepare(`
    SELECT * FROM contracts WHERE supplier_id = ? ORDER BY start_date DESC
  `).all(supplierId);

  const purchaseOrders = db.prepare(`
    SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY created_at DESC
  `).all(supplierId);

  const invoices = db.prepare(`
    SELECT i.*, p.po_number 
    FROM invoices i
    JOIN purchase_orders p ON p.id = i.po_id
    WHERE i.supplier_id = ?
    ORDER BY i.invoice_date DESC
  `).all(supplierId);

  const payments = db.prepare(`
    SELECT py.*, i.invoice_number 
    FROM payments py
    JOIN invoices i ON i.id = py.invoice_id
    WHERE py.supplier_id = ?
    ORDER BY py.payment_date DESC
  `).all(supplierId);

  return res.json({
    supplier,
    contacts,
    addresses,
    categories,
    bankAccounts: (req.user?.role === RoleName.SUPPLIER || req.user?.role === RoleName.FINANCE_USER || req.user?.role === RoleName.SUPER_ADMIN || req.user?.role === RoleName.PROCUREMENT_ADMIN) ? bankAccounts : [],
    documents,
    risk,
    performance,
    statusHistory,
    debarments,
    bids,
    contracts,
    purchaseOrders,
    invoices,
    payments
  });
});

// Suspend Supplier
supplierRouter.post('/:id/suspend', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const supplierId = req.params.id;
  const { reason, effectiveDate, endDate, supportingDocument } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Suspension reason is mandatory' });
  }

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as any;
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  db.prepare(`UPDATE suppliers SET status = 'Suspended', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(supplierId);

  db.prepare(`
    INSERT INTO supplier_status_history (id, supplier_id, previous_status, new_status, changed_by, change_reason)
    VALUES (?, ?, ?, 'Suspended', ?, ?)
  `).run(crypto.randomUUID(), supplierId, supplier.status, req.user!.email, reason);

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'SUPPLIER_SUSPENDED',
    module: 'SUPPLIER',
    recordId: supplierId,
    comments: `Suspension Reason: ${reason}`
  });

  return res.json({ message: 'Supplier has been suspended.', status: 'Suspended' });
});

// Reactivate Supplier
supplierRouter.post('/:id/reactivate', authenticateToken, requireRoles(RoleName.SUPER_ADMIN, RoleName.PROCUREMENT_ADMIN), (req: AuthRequest, res: Response) => {
  const supplierId = req.params.id;
  const { reason } = req.body;

  const supplier = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(supplierId) as any;
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  db.prepare(`UPDATE suppliers SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(supplierId);

  db.prepare(`
    INSERT INTO supplier_status_history (id, supplier_id, previous_status, new_status, changed_by, change_reason)
    VALUES (?, ?, ?, 'Active', ?, ?)
  `).run(crypto.randomUUID(), supplierId, supplier.status, req.user!.email, reason || 'Reactivated by admin');

  logAudit({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'SUPPLIER_REACTIVATED',
    module: 'SUPPLIER',
    recordId: supplierId,
    comments: `Reactivation Reason: ${reason || 'Approved'}`
  });

  return res.json({ message: 'Supplier has been reactivated.', status: 'Active' });
});

// Add / Upload Supplier Document with Expiry
supplierRouter.post('/:id/documents', authenticateToken, upload.single('file'), (req: AuthRequest, res: Response) => {
  const supplierId = req.params.id;
  const { documentType, documentName, documentNumber, issueDate, expiryDate } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const docId = crypto.randomUUID();
  const filePath = `/uploads/${file.filename}`;

  db.prepare(`
    INSERT INTO supplier_documents (id, supplier_id, document_type, document_name, document_number, issue_date, expiry_date, file_path, file_size, mime_type, status, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Valid', 'Pending')
  `).run(
    docId,
    supplierId,
    documentType || 'Other Document',
    documentName || file.originalname,
    documentNumber || null,
    issueDate || null,
    expiryDate || null,
    filePath,
    file.size,
    file.mimetype
  );

  logAudit({
    userId: req.user!.id,
    action: 'UPLOAD_DOCUMENT',
    module: 'SUPPLIER_DOC',
    recordId: docId,
    comments: `Uploaded ${documentType || 'document'}: ${documentName || file.originalname}`
  });

  return res.status(201).json({ message: 'Document uploaded successfully', docId, filePath });
});

// Get Supplier Documents
supplierRouter.get('/my-documents', authenticateToken, (req: AuthRequest, res: Response) => {
  const supplierId = req.user?.supplier_id;
  if (!supplierId) {
    const docs = db.prepare(`SELECT * FROM supplier_documents ORDER BY created_at DESC`).all();
    return res.json(docs);
  }
  const docs = db.prepare(`SELECT * FROM supplier_documents WHERE supplier_id = ? ORDER BY created_at DESC`).all(supplierId);
  return res.json(docs);
});

// Upload Supplier Document (JSON/Direct)
supplierRouter.post('/my-documents', authenticateToken, (req: AuthRequest, res: Response) => {
  const supplierId = req.user?.supplier_id || req.body.supplierId || 'SUP-2026-0001';
  const { documentType, documentName, documentNumber, issueDate, expiryDate, filePath, fileSize, mimeType } = req.body;
  const docId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO supplier_documents (id, supplier_id, document_type, document_name, document_number, issue_date, expiry_date, file_path, file_size, mime_type, status, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Valid', 'Pending')
  `).run(
    docId,
    supplierId,
    documentType || 'Other Document',
    documentName || 'Document',
    documentNumber || null,
    issueDate || null,
    expiryDate || null,
    filePath || '/uploads/sample.pdf',
    fileSize || 1024,
    mimeType || 'application/pdf'
  );
  return res.status(201).json({ message: 'Document uploaded successfully', id: docId });
});


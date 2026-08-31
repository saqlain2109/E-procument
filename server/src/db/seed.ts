import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/database';
import { RoleName, WorkflowModule } from '../config/constants';

export async function seedDatabase() {
  const userCount = (db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as any)?.cnt || 0;
  if (userCount > 0) {
    console.log('Database already initialized with master data and clean users.');
    return;
  }

  console.log('🌱 Seeding Enterprise E-Procurement master configurations & clean users...');

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  // 1. Roles Master
  const roles = [
    { id: 'ROLE-SUPER-ADMIN', name: RoleName.SUPER_ADMIN, desc: 'Full administrative control and executive governance' },
    { id: 'ROLE-PROC-ADMIN', name: RoleName.PROCUREMENT_ADMIN, desc: 'Manages sourcing events, RFQs, tenders, POs, and dock GRNs' },
    { id: 'ROLE-PROC-OFFICER', name: RoleName.PROCUREMENT_OFFICER, desc: 'Assists sourcing, vendor inquiries, and purchase orders' },
    { id: 'ROLE-EVALUATOR', name: RoleName.EVALUATOR, desc: 'Technical evaluation committee lead for scoring sealed bids' },
    { id: 'ROLE-APPROVER', name: RoleName.APPROVER, desc: 'Department head / VP for internal purchase requisition approvals' },
    { id: 'ROLE-FINANCE', name: RoleName.FINANCE_USER, desc: 'Finance controller for 3-way matching, invoice sign-offs & payments' },
    { id: 'ROLE-CONTRACT-MGR', name: RoleName.CONTRACT_MANAGER, desc: 'Contract administrator for legal governance and milestones' },
    { id: 'ROLE-SUPPLIER', name: RoleName.SUPPLIER, desc: 'External supplier portal for bidding, PO acceptance, and e-invoicing' }
  ];

  for (const r of roles) {
    db.prepare(`INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)`).run(r.id, r.name, r.desc);
  }

  // 2. Departments Master
  const departments = [
    { id: 'DEPT-IT', code: 'IT-01', name: 'Information Technology', budget: 5000000 },
    { id: 'DEPT-FIN', code: 'FIN-01', name: 'Finance & Accounting', budget: 2000000 },
    { id: 'DEPT-OPS', code: 'OPS-01', name: 'Supply Chain & Operations', budget: 15000000 },
    { id: 'DEPT-ENG', code: 'ENG-01', name: 'Engineering & Infrastructure', budget: 8000000 },
    { id: 'DEPT-HR', code: 'HR-01', name: 'Human Resources & Facilities', budget: 1500000 }
  ];

  for (const d of departments) {
    db.prepare(`INSERT OR REPLACE INTO departments (id, code, name, budget_limit) VALUES (?, ?, ?, ?)`).run(d.id, d.code, d.name, d.budget);
  }

  // 3. Cost Centers Master
  const costCenters = [
    { id: 'CC-IT-INFRA', code: 'CC-101', name: 'IT Infrastructure & Cloud', deptId: 'DEPT-IT', budget: 3000000 },
    { id: 'CC-IT-APPS', code: 'CC-102', name: 'Enterprise Software & Apps', deptId: 'DEPT-IT', budget: 2000000 },
    { id: 'CC-OPS-LOG', code: 'CC-201', name: 'Global Logistics & Freight', deptId: 'DEPT-OPS', budget: 9000000 },
    { id: 'CC-ENG-PLANT', code: 'CC-301', name: 'Manufacturing Plant Equipment', deptId: 'DEPT-ENG', budget: 5000000 }
  ];

  for (const cc of costCenters) {
    db.prepare(`INSERT OR REPLACE INTO cost_centers (id, code, name, department_id, allocated_budget) VALUES (?, ?, ?, ?, ?)`).run(
      cc.id, cc.code, cc.name, cc.deptId, cc.budget
    );
  }

  // 4. System Master Data (Categories, Currencies, Incoterms, Countries)
  const masterItems = [
    { type: 'CATEGORY', code: 'IT_HARDWARE', name: 'IT Hardware & Servers', parent: null },
    { type: 'CATEGORY', code: 'IT_SOFTWARE', name: 'Enterprise Software & SaaS', parent: null },
    { type: 'CATEGORY', code: 'NETWORKING', name: 'Networking & Telecommunications', parent: null },
    { type: 'CATEGORY', code: 'CYBERSECURITY', name: 'Cybersecurity Solutions', parent: null },
    { type: 'CATEGORY', code: 'CLOUD_SERVICES', name: 'Cloud Infrastructure & Hosting', parent: null },
    { type: 'CATEGORY', code: 'FACILITIES', name: 'Facilities & Real Estate', parent: null },
    { type: 'CATEGORY', code: 'HEAVY_MACHINERY', name: 'Industrial Machinery & Equipment', parent: null },
    { type: 'CATEGORY', code: 'LOGISTICS', name: 'Freight & Transportation Logistics', parent: null },
    { type: 'CATEGORY', code: 'CONSULTING', name: 'Professional & Legal Consulting', parent: null },

    { type: 'CURRENCY', code: 'USD', name: 'US Dollar ($)', parent: null },
    { type: 'CURRENCY', code: 'EUR', name: 'Euro (€)', parent: null },
    { type: 'CURRENCY', code: 'GBP', name: 'British Pound (£)', parent: null },
    { type: 'CURRENCY', code: 'AED', name: 'UAE Dirham (AED)', parent: null },
    { type: 'CURRENCY', code: 'INR', name: 'Indian Rupee (₹)', parent: null },

    { type: 'INCOTERM', code: 'DDP', name: 'Delivered Duty Paid (DDP)', parent: null },
    { type: 'INCOTERM', code: 'CIF', name: 'Cost, Insurance and Freight (CIF)', parent: null },
    { type: 'INCOTERM', code: 'FOB', name: 'Free on Board (FOB)', parent: null },
    { type: 'INCOTERM', code: 'EXW', name: 'Ex Works (EXW)', parent: null },

    { type: 'COUNTRY', code: 'US', name: 'United States', parent: null },
    { type: 'COUNTRY', code: 'IN', name: 'India', parent: null },
    { type: 'COUNTRY', code: 'GB', name: 'United Kingdom', parent: null },
    { type: 'COUNTRY', code: 'DE', name: 'Germany', parent: null },
    { type: 'COUNTRY', code: 'AE', name: 'United Arab Emirates', parent: null },
    { type: 'COUNTRY', code: 'SG', name: 'Singapore', parent: null }
  ];

  for (const mi of masterItems) {
    db.prepare(`
      INSERT OR REPLACE INTO master_data (id, type, code, name, parent_code, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(crypto.randomUUID(), mi.type, mi.code, mi.name, mi.parent);
  }

  // 5. Numbering Sequence Master
  const numberingConfigs = [
    { id: 'NC-PR', module: 'PR', prefix: 'PR', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-PO', module: 'PO', prefix: 'PO', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-RFQ', module: 'RFQ', prefix: 'RFQ', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-TND', module: 'TENDER', prefix: 'TND', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-CON', module: 'CON', prefix: 'CON', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-GRN', module: 'GRN', prefix: 'GRN', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-INV', module: 'INV', prefix: 'INV', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-SUP', module: 'SUPPLIER', prefix: 'SUP', cur: 1, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' },
    { id: 'NC-AWD', module: 'AWD', prefix: 'AWD', cur: 0, pad: 6, pat: '{PREFIX}-{YEAR}-{NUM}' }
  ];

  for (const nc of numberingConfigs) {
    db.prepare(`
      INSERT OR REPLACE INTO numbering_configs (id, module, prefix, current_number, padding, format_pattern)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nc.id, nc.module, nc.prefix, nc.cur, nc.pad, nc.pat);
  }

  // 6. Email Templates Master
  const emailTemplates = [
    { id: 'ET-1', code: 'SUPPLIER_INVITATION', name: 'Tender / RFQ Invitation', subj: 'Invitation to Bid: {{event_number}} - {{event_title}}', body: 'Dear {{supplier_name}},\n\nYou are cordially invited to submit a sealed bid for {{event_number}} ({{event_title}}).\n\nSubmission Deadline: {{submission_deadline}}\n\nPlease log in to the Supplier Portal to download specifications and submit your encrypted bid.\n\nRegards,\nProcurement Sourcing Team' },
    { id: 'ET-2', code: 'PO_DISPATCHED', name: 'Purchase Order Dispatched to Vendor', subj: 'Purchase Order Issued: {{po_number}}', body: 'Dear {{supplier_name}},\n\nPurchase order {{po_number}} for {{currency}} {{grand_total}} has been officially approved and dispatched.\n\nPlease log in to acknowledge and accept this order.\n\nRegards,\nEnterprise Procurement' },
    { id: 'ET-3', code: 'AWARD_NOTIFICATION', name: 'Notice of Award Letter', subj: 'Notice of Award: {{event_number}}', body: 'Dear {{supplier_name}},\n\nWe are pleased to inform you that your bid for {{event_number}} has been selected for contract award.\n\nAward Amount: {{awarded_amount}}\n\nOur contract governance team will reach out shortly.\n\nRegards,\nProcurement Committee' },
    { id: 'ET-4', code: 'APPROVAL_REQUEST', name: 'Approval Task Notification', subj: 'Action Required: Approval for {{module}} {{reference_number}}', body: 'Dear {{approver_name}},\n\nA new {{module}} (Ref: {{reference_number}}) with value ${{amount}} requires your executive review and sign-off.\n\nLevel: {{level_name}}\n\nPlease review and approve in your Central Approval Inbox.\n\nRegards,\nWorkflow Engine' },
    { id: 'ET-5', code: 'PAYMENT_REMITTANCE', name: 'Payment Remittance Advice', subj: 'Payment Confirmation: Invoice {{invoice_number}}', body: 'Dear {{supplier_name}},\n\nPayment of {{currency}} {{amount}} for invoice {{invoice_number}} has been disbursed via {{payment_method}} (Ref: {{payment_ref}}).\n\nThank you for your partnership.\n\nRegards,\nCorporate Finance Department' }
  ];

  for (const et of emailTemplates) {
    db.prepare(`
      INSERT OR REPLACE INTO email_templates (id, code, name, subject, body_template, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(et.id, et.code, et.name, et.subj, et.body, et.name);
  }

  // 7. Dynamic Workflows Master
  const workflows = [
    {
      id: 'WF-SUPPLIER-REG',
      name: 'Supplier Onboarding & Qualification Workflow',
      module: WorkflowModule.SUPPLIER_REGISTRATION,
      desc: 'Mandatory multi-level qualification workflow for new enterprise vendors',
      levels: [
        { name: 'Procurement Admin Review', type: 'ROLE', roleId: 'ROLE-PROC-ADMIN', seq: 1, sla: 24 },
        { name: 'Finance & Banking Verification', type: 'ROLE', roleId: 'ROLE-FINANCE', seq: 2, sla: 24 },
        { name: 'Executive Final Approval', type: 'ROLE', roleId: 'ROLE-SUPER-ADMIN', seq: 3, sla: 24 }
      ]
    },
    {
      id: 'WF-HIGH-VAL-PO',
      name: 'Purchase Order Approval Workflow',
      module: WorkflowModule.PURCHASE_ORDER,
      desc: 'Tiered executive governance for purchase order issuance',
      levels: [
        { name: 'Procurement Manager Sign-off', type: 'ROLE', roleId: 'ROLE-PROC-ADMIN', seq: 1, sla: 24 },
        { name: 'Finance Controller Sign-off', type: 'ROLE', roleId: 'ROLE-FINANCE', seq: 2, sla: 24 },
        { name: 'Executive CEO Sign-off', type: 'ROLE', roleId: 'ROLE-SUPER-ADMIN', seq: 3, sla: 48 }
      ]
    },
    {
      id: 'WF-PR-APPROVAL',
      name: 'Standard Purchase Requisition Workflow',
      module: WorkflowModule.PURCHASE_REQUISITION,
      desc: 'Standard tiered workflow for internal procurement requisitions',
      levels: [
        { name: 'Department Manager Review', type: 'ROLE', roleId: 'ROLE-APPROVER', seq: 1, sla: 24 },
        { name: 'Budget & Finance Verification', type: 'ROLE', roleId: 'ROLE-FINANCE', seq: 2, sla: 24 },
        { name: 'Procurement Sourcing Review', type: 'ROLE', roleId: 'ROLE-PROC-ADMIN', seq: 3, sla: 24 }
      ]
    },
    {
      id: 'WF-BID-AWARD',
      name: 'Tender Award Approval Workflow',
      module: WorkflowModule.BID_AWARD,
      desc: 'Commercial award sign-off before contract formulation',
      levels: [
        { name: 'Procurement Sourcing Lead', type: 'ROLE', roleId: 'ROLE-PROC-ADMIN', seq: 1, sla: 24 },
        { name: 'Finance Director Sign-off', type: 'ROLE', roleId: 'ROLE-FINANCE', seq: 2, sla: 24 },
        { name: 'Executive Sourcing Committee', type: 'ROLE', roleId: 'ROLE-SUPER-ADMIN', seq: 3, sla: 48 }
      ]
    },
    {
      id: 'WF-INVOICE',
      name: '3-Way Matched Invoice AP Approval',
      module: WorkflowModule.INVOICE,
      desc: 'Accounts payable approval workflow for matched invoices',
      levels: [
        { name: 'Accounts Payable Specialist', type: 'ROLE', roleId: 'ROLE-FINANCE', seq: 1, sla: 24 },
        { name: 'Financial Controller Sign-off', type: 'ROLE', roleId: 'ROLE-SUPER-ADMIN', seq: 2, sla: 24 }
      ]
    }
  ];

  db.prepare(`DELETE FROM approval_workflow_levels`).run();
  db.prepare(`DELETE FROM approval_workflows`).run();

  for (const wf of workflows) {
    db.prepare(`
      INSERT INTO approval_workflows (id, name, module, description, is_active, version)
      VALUES (?, ?, ?, ?, 1, 1)
    `).run(wf.id, wf.name, wf.module, wf.desc);

    wf.levels.forEach((lvl: any, idx: number) => {
      db.prepare(`
        INSERT INTO approval_workflow_levels (
          id, workflow_id, level_number, level_name, approver_type, role_id, user_id,
          condition_field, condition_operator, condition_value, sla_hours, sequence_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LVL-${wf.id}-${idx + 1}`,
        wf.id,
        idx + 1,
        lvl.name,
        lvl.type,
        lvl.roleId || null,
        lvl.userId || null,
        lvl.condF || null,
        lvl.condOp || null,
        lvl.condV || null,
        lvl.sla || 24,
        lvl.seq
      );
    });
  }

  // 8. Demo Active Supplier (Iqra Technology)
  const supplierId = 'SUP-001';
  db.prepare(`
    INSERT OR REPLACE INTO suppliers (
      id, supplier_code, legal_name, trading_name, registration_number, tax_number,
      country, state, city, address, postal_code, website, business_type,
      status, performance_score, is_duplicate_override, profile_completion, created_at, updated_at
    ) VALUES (
      ?, 'SUP-2026-000001', 'Iqra Technology', 'Iqra Tech Solutions', 'REG-IQRA-2026-01', 'TAX-IN-889911',
      'India', 'Maharashtra', 'Mumbai', '101 Technopolis IT Park, Andheri East', '400069', 'https://iqratechnology.com', 'Private Limited Company',
      'Active', 90.0, 0, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `).run(supplierId);

  // 9. Standard Role-Based Clean Users
  const cleanUsers = [
    {
      id: 'USR-SUPERADMIN',
      email: 'admin@eprocure.local',
      firstName: 'Alexander',
      lastName: 'Wright',
      roleId: 'ROLE-SUPER-ADMIN',
      deptId: null,
      supplierId: null,
      phone: '+1 (555) 100-0001',
      jobTitle: 'Chief Executive & Super Administrator'
    },
    {
      id: 'USR-PROCADMIN',
      email: 'proc.admin@eprocure.local',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      roleId: 'ROLE-PROC-ADMIN',
      deptId: 'DEPT-OPS',
      supplierId: null,
      phone: '+1 (555) 200-0002',
      jobTitle: 'Head of Strategic Sourcing & Procurement'
    },
    {
      id: 'USR-APPROVER',
      email: 'approver@eprocure.local',
      firstName: 'Marcus',
      lastName: 'Vance',
      roleId: 'ROLE-APPROVER',
      deptId: 'DEPT-IT',
      supplierId: null,
      phone: '+1 (555) 300-0003',
      jobTitle: 'VP of Enterprise Engineering'
    },
    {
      id: 'USR-EVALUATOR',
      email: 'evaluator@eprocure.local',
      firstName: 'Dr. Elena',
      lastName: 'Rostova',
      roleId: 'ROLE-EVALUATOR',
      deptId: 'DEPT-ENG',
      supplierId: null,
      phone: '+1 (555) 400-0004',
      jobTitle: 'Technical Evaluation Committee Lead'
    },
    {
      id: 'USR-FINANCE',
      email: 'finance@eprocure.local',
      firstName: 'Rachel',
      lastName: 'Greenfield',
      roleId: 'ROLE-FINANCE',
      deptId: 'DEPT-FIN',
      supplierId: null,
      phone: '+1 (555) 500-0005',
      jobTitle: 'Director of Corporate Finance & AP'
    },
    {
      id: 'USR-CONTRACTMGR',
      email: 'contract.manager@eprocure.local',
      firstName: 'Jonathan',
      lastName: 'Sterling',
      roleId: 'ROLE-CONTRACT-MGR',
      deptId: 'DEPT-OPS',
      supplierId: null,
      phone: '+1 (555) 600-0006',
      jobTitle: 'Contract & Legal Governance Manager'
    },
    {
      id: 'USR-SUPPLIER-01',
      email: 'supplier@eprocure.local',
      firstName: 'Saqlain',
      lastName: 'Supariwala',
      roleId: 'ROLE-SUPPLIER',
      deptId: null,
      supplierId: supplierId,
      phone: '+91 98765 43210',
      jobTitle: 'Director of Business Development'
    }
  ];

  for (const u of cleanUsers) {
    db.prepare(`
      INSERT OR REPLACE INTO users (
        id, email, password_hash, first_name, last_name, role_id, department_id,
        supplier_id, phone, job_title, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(
      u.id,
      u.email.toLowerCase(),
      defaultPasswordHash,
      u.firstName,
      u.lastName,
      u.roleId,
      u.deptId,
      u.supplierId,
      u.phone,
      u.jobTitle
    );
  }

  console.log('✅ Database cleaned and initialized with essential master data & clean users.');
}

if (require.main === module) {
  const { initDatabase } = require('../config/database');
  initDatabase().then(() => seedDatabase()).catch(console.error);
}


-- Enterprise E-Procurement Schema

PRAGMA foreign_keys = ON;

-- 1. Users & RBAC
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  manager_id TEXT,
  budget_limit REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department_id TEXT,
  allocated_budget REAL DEFAULT 0,
  spent_budget REAL DEFAULT 0,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role_id TEXT NOT NULL,
  department_id TEXT,
  supplier_id TEXT, -- Populated if user is a supplier contact
  phone TEXT,
  job_title TEXT,
  is_active INTEGER DEFAULT 1,
  avatar_url TEXT,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 2. Master Data
CREATE TABLE IF NOT EXISTS master_data (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- COUNTRY, STATE, CITY, CURRENCY, TAX, CATEGORY, INCOTERM, PAYMENT_TERM, DELIVERY_TERM, DOC_TYPE, TENDER_TYPE, NUMBERING
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_code TEXT,
  metadata TEXT, -- JSON for additional properties
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(type, code)
);

CREATE TABLE IF NOT EXISTS numbering_configs (
  id TEXT PRIMARY KEY,
  module TEXT UNIQUE NOT NULL, -- SUPPLIER, TENDER, RFQ, RFP, BID, CON, PO, INV, GRN, PR
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 0,
  padding INTEGER DEFAULT 6,
  format_pattern TEXT NOT NULL -- e.g. {PREFIX}-{YEAR}-{NUM}
);

-- 3. Supplier Management
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT UNIQUE NOT NULL,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  registration_number TEXT UNIQUE NOT NULL,
  tax_number TEXT NOT NULL,
  vat_number TEXT,
  business_type TEXT,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  website TEXT,
  year_established INTEGER,
  employee_count INTEGER,
  annual_turnover REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Submitted, Under Review, Clarification Required, Pending Approval, Approved, Active, Qualified, Preferred, Rejected, Suspended, Expired, Inactive, Blacklisted
  risk_rating TEXT DEFAULT 'Low', -- Low, Medium, High, Critical
  performance_score REAL DEFAULT 85.0,
  rejection_reason TEXT,
  is_duplicate_override INTEGER DEFAULT 0,
  profile_completion INTEGER DEFAULT 30,
  approved_at DATETIME,
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  contact_type TEXT NOT NULL, -- Primary, Procurement, Finance, Legal
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  designation TEXT,
  is_primary INTEGER DEFAULT 0,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_addresses (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  address_type TEXT NOT NULL, -- Registered, Billing, Shipping, Branch
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  is_primary INTEGER DEFAULT 0,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_categories (
  supplier_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  PRIMARY KEY (supplier_id, category_code),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_bank_accounts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch TEXT,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  swift_bic TEXT,
  currency TEXT DEFAULT 'USD',
  bank_address TEXT,
  is_verified INTEGER DEFAULT 0,
  verified_by TEXT,
  verified_at DATETIME,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_documents (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- Tax Clearance, Reg Certificate, VAT Cert, Business License, Insurance, ISO Cert, Audited Accounts
  document_name TEXT NOT NULL,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Valid', -- Valid, Expiring Soon, Expired, Rejected
  verification_status TEXT DEFAULT 'Pending', -- Pending, Verified, Rejected
  verified_by TEXT,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_status_history (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_risk (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  financial_score REAL DEFAULT 80,
  compliance_score REAL DEFAULT 85,
  operational_score REAL DEFAULT 80,
  cybersecurity_score REAL DEFAULT 90,
  legal_score REAL DEFAULT 85,
  geographic_score REAL DEFAULT 80,
  delivery_score REAL DEFAULT 85,
  quality_score REAL DEFAULT 85,
  overall_risk_score REAL DEFAULT 83,
  overall_risk_rating TEXT DEFAULT 'Low', -- Low, Medium, High, Critical
  mitigation_plan TEXT,
  risk_owner TEXT,
  review_date DATE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_performance (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  period TEXT NOT NULL, -- e.g. 2026-Q1
  delivery_score REAL DEFAULT 90, -- 25%
  quality_score REAL DEFAULT 88, -- 25%
  price_competitiveness_score REAL DEFAULT 82, -- 20%
  responsiveness_score REAL DEFAULT 85, -- 20%
  compliance_score REAL DEFAULT 95, -- 10%
  overall_score REAL DEFAULT 87.5,
  rating_status TEXT DEFAULT 'Good', -- Excellent, Good, Satisfactory, Needs Improvement, Critical
  comments TEXT,
  evaluated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_debarments (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  authority TEXT NOT NULL,
  status TEXT DEFAULT 'Active', -- Active, Lifted
  supporting_doc_path TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 4. Procurement Requests / Purchase Requisitions
CREATE TABLE IF NOT EXISTS procurement_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  requesting_department_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  procurement_category TEXT NOT NULL,
  description TEXT,
  estimated_total REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  required_date DATE NOT NULL,
  delivery_location TEXT NOT NULL,
  cost_center_id TEXT,
  justification TEXT,
  attachment_path TEXT,
  status TEXT DEFAULT 'Draft', -- Draft, Submitted, Department Approval, Budget Approval, Procurement Review, Approved, Rejected, Sourcing Event Created
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requesting_department_id) REFERENCES departments(id),
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);

CREATE TABLE IF NOT EXISTS procurement_request_items (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  specification TEXT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  estimated_unit_price REAL NOT NULL,
  estimated_total REAL NOT NULL,
  FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE
);

-- 5. RFQ / RFP / Tenders / Auctions (Procurement Events)
CREATE TABLE IF NOT EXISTS procurement_events (
  id TEXT PRIMARY KEY,
  event_number TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL, -- RFQ, RFP, ITT, OPEN_TENDER, RESTRICTED_TENDER, TWO_STAGE, REVERSE_AUCTION
  title TEXT NOT NULL,
  description TEXT,
  procurement_category TEXT NOT NULL,
  department_id TEXT NOT NULL,
  procurement_officer_id TEXT NOT NULL,
  publication_date DATETIME,
  registration_deadline DATETIME,
  question_deadline DATETIME,
  bid_submission_deadline DATETIME NOT NULL,
  bid_opening_date DATETIME,
  bid_opening_type TEXT DEFAULT 'Automatic', -- Automatic, Manual, Committee-based
  bid_opened_at DATETIME,
  bid_opened_by TEXT,
  expected_award_date DATE,
  delivery_location TEXT,
  currency TEXT DEFAULT 'USD',
  estimated_budget REAL,
  payment_terms TEXT,
  delivery_terms TEXT,
  contract_duration TEXT,
  is_public INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Draft', -- Draft, Internal Approval, Scheduled, Published, Question Period, Bid Submission, Closed, Bid Opening, Evaluation, Award Approval, Awarded, Contracted, Cancelled
  technical_weight REAL DEFAULT 60.0,
  commercial_weight REAL DEFAULT 40.0,
  allow_resubmission INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (procurement_officer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS procurement_event_items (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  specification TEXT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  required_delivery_date DATE,
  estimated_price REAL,
  technical_requirements TEXT,
  is_mandatory INTEGER DEFAULT 1,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS procurement_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  viewed_at DATETIME,
  interest_status TEXT DEFAULT 'Invited', -- Invited, Viewed, Interested, Declined, Participating, Submitted
  decline_reason TEXT,
  UNIQUE(event_id, supplier_id),
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tender_documents (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_mandatory INTEGER DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tender_technical_requirements (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  requirement_code TEXT NOT NULL,
  requirement_title TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- YES_NO, NUMERIC, TEXT, DOCUMENT
  is_mandatory INTEGER DEFAULT 1,
  min_value REAL,
  max_value REAL,
  expected_document_type TEXT,
  weight REAL DEFAULT 10.0,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  stage TEXT NOT NULL, -- Technical, Commercial
  criteria_name TEXT NOT NULL,
  description TEXT,
  weight REAL NOT NULL, -- e.g. 20%
  min_score REAL DEFAULT 0,
  is_mandatory INTEGER DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tender_committee_members (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- Chairperson, Technical Evaluator, Commercial Evaluator, Compliance Officer
  can_view_commercial INTEGER DEFAULT 0,
  has_submitted INTEGER DEFAULT 0,
  UNIQUE(event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. Clarifications & Q&A
CREATE TABLE IF NOT EXISTS clarifications (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  question TEXT NOT NULL,
  is_public INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending', -- Pending, Answered
  answer TEXT,
  answered_by TEXT,
  answered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 7. Bids & Submissions
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  bid_number TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  total_bid_amount REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  delivery_timeline_days INTEGER,
  warranty_period_months INTEGER,
  validity_period_days INTEGER DEFAULT 90,
  currency TEXT DEFAULT 'USD',
  submission_timestamp DATETIME,
  is_locked INTEGER DEFAULT 0,
  acknowledgement_code TEXT,
  status TEXT DEFAULT 'Draft', -- Draft, Submitted, Under Evaluation, Shortlisted, Awarded, Unsuccessful, Disqualified
  compliance_check_passed INTEGER DEFAULT 0,
  technical_score REAL DEFAULT 0,
  commercial_score REAL DEFAULT 0,
  total_weighted_score REAL DEFAULT 0,
  final_rank INTEGER,
  disqualification_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bid_items (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL,
  event_item_id TEXT NOT NULL,
  offered_quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  brand_model TEXT,
  lead_time_days INTEGER,
  remarks TEXT,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  FOREIGN KEY (event_item_id) REFERENCES procurement_event_items(id)
);

CREATE TABLE IF NOT EXISTS bid_technical_responses (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  response_value TEXT,
  document_path TEXT,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  FOREIGN KEY (requirement_id) REFERENCES tender_technical_requirements(id)
);

CREATE TABLE IF NOT EXISTS bid_documents (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- Technical Proposal, Commercial Quotation, Bid Security, OEM Authorization
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE
);

-- 8. Evaluation Scores
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id TEXT PRIMARY KEY,
  bid_id TEXT NOT NULL,
  criteria_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  score REAL NOT NULL, -- 0 to 100
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bid_id, criteria_id, evaluator_id),
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);

-- 9. Awards
CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY,
  award_number TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  bid_id TEXT NOT NULL,
  awarded_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT NOT NULL,
  committee_recommendation TEXT,
  award_letter_path TEXT,
  status TEXT DEFAULT 'Draft', -- Draft, Pending Approval, Approved, Rejected, Awarded, Cancelled
  recommended_by TEXT NOT NULL,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES procurement_events(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (bid_id) REFERENCES bids(id),
  FOREIGN KEY (recommended_by) REFERENCES users(id)
);

-- 10. Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  event_id TEXT,
  award_id TEXT,
  contract_value REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_terms TEXT,
  delivery_terms TEXT,
  contract_manager_id TEXT NOT NULL,
  renewal_terms TEXT,
  notice_period_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Draft', -- Draft, Pending Approval, Active, Expiring Soon, Expired, Renewed, Terminated
  document_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (event_id) REFERENCES procurement_events(id),
  FOREIGN KEY (award_id) REFERENCES awards(id),
  FOREIGN KEY (contract_manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contract_milestones (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  milestone_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed, Delayed
  completed_at DATETIME,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contract_amendments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  amendment_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  value_change REAL DEFAULT 0,
  extended_end_date DATE,
  document_path TEXT,
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- 11. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  contract_id TEXT,
  event_id TEXT,
  requisition_id TEXT,
  total_amount REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  grand_total REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  delivery_address TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  payment_terms TEXT,
  status TEXT DEFAULT 'Draft', -- Draft, Approval, Approved, Sent to Supplier, Supplier Accepted, Supplier Rejected, Partially Delivered, Completed, Closed
  rejection_reason TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (requisition_id) REFERENCES procurement_requests(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  delivered_quantity REAL DEFAULT 0,
  invoiced_quantity REAL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL,
  tax_rate REAL DEFAULT 0,
  total_price REAL NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- 12. Goods Receipts / Delivery (GRN)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  grn_number TEXT UNIQUE NOT NULL,
  po_id TEXT NOT NULL,
  delivery_number TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  received_by TEXT NOT NULL,
  delivery_doc_path TEXT,
  status TEXT DEFAULT 'Completed', -- Completed, Discrepancy Found
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL,
  po_item_id TEXT NOT NULL,
  ordered_quantity REAL NOT NULL,
  delivered_quantity REAL NOT NULL,
  accepted_quantity REAL NOT NULL,
  rejected_quantity REAL DEFAULT 0,
  rejection_reason TEXT,
  FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
);

-- 13. Invoices & 3-Way Matching
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  po_id TEXT NOT NULL,
  contract_id TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  attachment_path TEXT,
  matching_status TEXT DEFAULT 'Under Verification', -- Matched, Exception, Under Verification
  status TEXT DEFAULT 'Submitted', -- Draft, Submitted, Under Verification, Matched, Exception, Approved, Rejected, Paid
  discrepancy_details TEXT, -- JSON summary of line variances
  verified_by TEXT,
  approved_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  po_item_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  tax_rate REAL DEFAULT 0,
  total_price REAL NOT NULL,
  variance_qty REAL DEFAULT 0,
  variance_price REAL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
);

-- 14. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL, -- Wire Transfer, ACH, Check, Corporate Card
  payment_reference TEXT NOT NULL,
  bank_account_id TEXT,
  status TEXT DEFAULT 'Completed', -- Scheduled, Processing, Completed, Failed
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (bank_account_id) REFERENCES supplier_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 15. Dynamic Workflow Engine
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  module TEXT NOT NULL, -- SUPPLIER_REGISTRATION, PURCHASE_REQUISITION, TENDER_PUBLISH, BID_AWARD, CONTRACT, PURCHASE_ORDER, INVOICE, SUPPLIER_SUSPENSION
  description TEXT,
  is_active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_workflow_levels (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  approver_type TEXT NOT NULL, -- ROLE, USER, DEPARTMENT_HEAD, QUORUM
  role_id TEXT,
  user_id TEXT,
  department_id TEXT,
  approval_type TEXT DEFAULT 'SEQUENTIAL', -- SEQUENTIAL, PARALLEL, QUORUM
  required_quorum INTEGER DEFAULT 1,
  condition_field TEXT, -- e.g. amount, category
  condition_operator TEXT, -- e.g. >, <, ==, IN
  condition_value TEXT,
  sla_hours INTEGER DEFAULT 48,
  sequence_order INTEGER NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS approval_instances (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  amount REAL,
  current_level INTEGER DEFAULT 1,
  total_levels INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Cancelled
  sla_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id),
  FOREIGN KEY (requested_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approval_tasks (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  level_id TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  assigned_to_user_id TEXT,
  assigned_to_role_id TEXT,
  status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Sent Back, Clarification Requested, Delegated
  action_by_user_id TEXT,
  delegated_to_user_id TEXT,
  comments TEXT,
  action_date DATETIME,
  supporting_doc_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (level_id) REFERENCES approval_workflow_levels(id),
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_role_id) REFERENCES roles(id),
  FOREIGN KEY (action_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approval_history (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  level_name TEXT NOT NULL,
  action TEXT NOT NULL, -- Approved, Rejected, Sent Back, Clarification Requested, Delegated
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  comments TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE
);

-- 16. Audit Logs, Notifications, Templates, Messages
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  comments TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO', -- INFO, WARNING, SUCCESS, ACTION_REQUIRED
  module TEXT,
  record_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL, -- supports {{variable}} tokens
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT,
  related_module TEXT NOT NULL, -- SUPPLIER, TENDER, PO, CONTRACT, INVOICE
  related_record_id TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  attachment_path TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

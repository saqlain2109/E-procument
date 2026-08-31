export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_id: string;
  department_id?: string;
  department_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_status?: string;
  avatar_url?: string;
  job_title?: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  legal_name: string;
  trading_name?: string;
  registration_number: string;
  tax_number: string;
  vat_number?: string;
  business_type?: string;
  country: string;
  state?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  year_established?: number;
  employee_count?: number;
  annual_turnover?: number;
  currency: string;
  status: string;
  risk_rating: string;
  performance_score: number;
  rejection_reason?: string;
  profile_completion: number;
  approved_at?: string;
  created_at: string;
  doc_count?: number;
  bid_count?: number;
  active_contracts_count?: number;
  po_count?: number;
}

export interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  requesting_department_id: string;
  department_name?: string;
  requester_id: string;
  requester_email?: string;
  first_name?: string;
  last_name?: string;
  procurement_category: string;
  description?: string;
  estimated_total: number;
  currency: string;
  required_date: string;
  delivery_location: string;
  cost_center_id?: string;
  cost_center_name?: string;
  justification?: string;
  status: string;
  item_count?: number;
  created_at: string;
}

export interface ProcurementEvent {
  id: string;
  event_number: string;
  event_type: string;
  title: string;
  description?: string;
  procurement_category: string;
  department_id: string;
  department_name?: string;
  procurement_officer_id: string;
  officer_first?: string;
  officer_last?: string;
  estimated_budget?: number;
  currency: string;
  status: string;
  bid_submission_deadline: string;
  expected_award_date?: string;
  delivery_location?: string;
  payment_terms?: string;
  delivery_terms?: string;
  contract_duration?: string;
  is_public: number;
  technical_weight: number;
  commercial_weight: number;
  item_count?: number;
  invited_count?: number;
  bid_count?: number;
  qa_count?: number;
  created_at: string;
}

export interface Bid {
  id: string;
  bid_number: string;
  event_id: string;
  event_title?: string;
  event_number?: string;
  event_type?: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  total_bid_amount: number;
  currency: string;
  delivery_timeline_days?: number;
  warranty_period_months?: number;
  submission_timestamp?: string;
  is_locked: number;
  acknowledgement_code?: string;
  status: string;
  technical_score?: number;
  commercial_score?: number;
  total_weighted_score?: number;
  final_rank?: number;
  is_commercial_sealed?: boolean;
  created_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  title: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  event_id?: string;
  award_id?: string;
  contract_value: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_terms?: string;
  delivery_terms?: string;
  contract_manager_id: string;
  manager_first?: string;
  manager_last?: string;
  milestone_count?: number;
  amendment_count?: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  contract_id?: string;
  event_id?: string;
  requisition_id?: string;
  total_amount: number;
  tax_amount: number;
  grand_total: number;
  currency: string;
  delivery_address: string;
  delivery_date: string;
  payment_terms?: string;
  status: string;
  rejection_reason?: string;
  created_by: string;
  creator_first?: string;
  creator_last?: string;
  item_count?: number;
  grn_count?: number;
  invoice_count?: number;
  created_at: string;
}

export interface GoodsReceipt {
  id: string;
  grn_number: string;
  po_id: string;
  po_number: string;
  supplier_name?: string;
  supplier_code?: string;
  delivery_number: string;
  delivery_date: string;
  received_by: string;
  receiver_first?: string;
  receiver_last?: string;
  status: string;
  notes?: string;
  item_count?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  po_id: string;
  po_number: string;
  po_total?: number;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  matching_status: string;
  discrepancy_details?: string;
  item_count?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  invoice_number?: string;
  po_number?: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface ApprovalTask {
  id: string;
  instance_id: string;
  level_id: string;
  level_number: number;
  level_name: string;
  sla_hours: number;
  module: string;
  reference_number: string;
  amount?: number;
  requested_by: string;
  requester_first?: string;
  requester_last?: string;
  requester_email?: string;
  workflow_name: string;
  sla_deadline?: string;
  submitted_at: string;
  status: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED';
  module?: string;
  record_id?: string;
  is_read: number;
  created_at: string;
}

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  document_type: string;
  document_name: string;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  status: string;
  verification_status: string;
  created_at: string;
}


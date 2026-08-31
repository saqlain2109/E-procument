export const JWT_SECRET = process.env.JWT_SECRET || 'eprocure_enterprise_super_secret_jwt_key_2026';
export const PORT = process.env.PORT || 5000;

export enum RoleName {
  SUPER_ADMIN = 'Super Administrator',
  PROCUREMENT_ADMIN = 'Procurement Administrator',
  PROCUREMENT_OFFICER = 'Procurement Officer',
  EVALUATOR = 'Evaluator',
  APPROVER = 'Approver',
  FINANCE_USER = 'Finance User',
  CONTRACT_MANAGER = 'Contract Manager',
  SUPPLIER = 'Supplier'
}

export enum WorkflowModule {
  SUPPLIER_REGISTRATION = 'SUPPLIER_REGISTRATION',
  PURCHASE_REQUISITION = 'PURCHASE_REQUISITION',
  TENDER_PUBLISH = 'TENDER_PUBLISH',
  BID_AWARD = 'BID_AWARD',
  CONTRACT = 'CONTRACT',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  INVOICE = 'INVOICE',
  SUPPLIER_SUSPENSION = 'SUPPLIER_SUSPENSION',
  SUPPLIER_REACTIVATION = 'SUPPLIER_REACTIVATION'
}

export enum SupplierStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_REVIEW = 'Under Review',
  CLARIFICATION_REQUIRED = 'Clarification Required',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  ACTIVE = 'Active',
  QUALIFIED = 'Qualified',
  PREFERRED = 'Preferred',
  REJECTED = 'Rejected',
  SUSPENDED = 'Suspended',
  EXPIRED = 'Expired',
  INACTIVE = 'Inactive',
  BLACKLISTED = 'Blacklisted'
}

export enum TenderStatus {
  DRAFT = 'Draft',
  INTERNAL_APPROVAL = 'Internal Approval',
  SCHEDULED = 'Scheduled',
  PUBLISHED = 'Published',
  QUESTION_PERIOD = 'Question Period',
  BID_SUBMISSION = 'Bid Submission',
  CLOSED = 'Closed',
  BID_OPENING = 'Bid Opening',
  EVALUATION = 'Evaluation',
  AWARD_APPROVAL = 'Award Approval',
  AWARDED = 'Awarded',
  CONTRACTED = 'Contracted',
  CANCELLED = 'Cancelled'
}

export enum BidStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_EVALUATION = 'Under Evaluation',
  SHORTLISTED = 'Shortlisted',
  AWARDED = 'Awarded',
  UNSUCCESSFUL = 'Unsuccessful',
  DISQUALIFIED = 'Disqualified'
}

export enum POStatus {
  DRAFT = 'Draft',
  APPROVAL = 'Approval',
  APPROVED = 'Approved',
  SENT_TO_SUPPLIER = 'Sent to Supplier',
  SUPPLIER_ACCEPTED = 'Supplier Accepted',
  SUPPLIER_REJECTED = 'Supplier Rejected',
  PARTIALLY_DELIVERED = 'Partially Delivered',
  COMPLETED = 'Completed',
  CLOSED = 'Closed'
}

export enum InvoiceStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  UNDER_VERIFICATION = 'Under Verification',
  MATCHED = 'Matched',
  EXCEPTION = 'Exception',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PAID = 'Paid'
}

export enum ApprovalStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  SENT_BACK = 'Sent Back',
  CLARIFICATION_REQUESTED = 'Clarification Requested',
  DELEGATED = 'Delegated'
}

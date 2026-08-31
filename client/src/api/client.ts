const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('eprocure_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth & Personas
  login: (credentials: any) => apiRequest<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  switchPersona: (payload: { roleName?: string; email?: string }) =>
    apiRequest<any>('/auth/switch-persona', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest<any>('/auth/me'),
  getDemoPersonas: () => apiRequest<any[]>('/auth/demo-personas'),

  // Suppliers & 360 Profile
  getSuppliers: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/suppliers?${qs}`);
  },
  getSupplier360: (id: string) => apiRequest<any>(`/suppliers/${id}/360`),
  checkDuplicates: (params: any) => apiRequest<any>('/suppliers/check-duplicates', { method: 'POST', body: JSON.stringify(params) }),
  registerSupplier: (formData: FormData) => apiRequest<any>('/suppliers/register', { method: 'POST', body: formData }),
  suspendSupplier: (id: string, payload: any) => apiRequest<any>(`/suppliers/${id}/suspend`, { method: 'POST', body: JSON.stringify(payload) }),
  reactivateSupplier: (id: string, payload: any) => apiRequest<any>(`/suppliers/${id}/reactivate`, { method: 'POST', body: JSON.stringify(payload) }),
  uploadSupplierDocumentMultipart: (id: string, formData: FormData) => apiRequest<any>(`/suppliers/${id}/documents`, { method: 'POST', body: formData }),


  // Requisitions
  getRequisitions: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/requisitions?${qs}`);
  },
  getRequisitionDetail: (id: string) => apiRequest<any>(`/requisitions/${id}`),
  createRequisition: (payload: any) => apiRequest<any>('/requisitions', { method: 'POST', body: JSON.stringify(payload) }),

  // Tenders & Sourcing
  getTenders: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/tenders?${qs}`);
  },
  getTenderDetail: (id: string) => apiRequest<any>(`/tenders/${id}`),
  createTender: (payload: any) => apiRequest<any>('/tenders', { method: 'POST', body: JSON.stringify(payload) }),
  publishTender: (id: string) => apiRequest<any>(`/tenders/${id}/publish`, { method: 'POST' }),
  openBids: (id: string) => apiRequest<any>(`/tenders/${id}/open-bids`, { method: 'POST' }),
  postClarification: (eventId: string, payload: any) => apiRequest<any>(`/tenders/${eventId}/clarifications`, { method: 'POST', body: JSON.stringify(payload) }),
  answerClarification: (eventId: string, qId: string, payload: any) => apiRequest<any>(`/tenders/${eventId}/clarifications/${qId}/answer`, { method: 'POST', body: JSON.stringify(payload) }),

  // Bids
  getBidsForEvent: (eventId: string) => apiRequest<any[]>(`/bids/event/${eventId}`),
  getMyBids: () => apiRequest<any[]>('/bids/my-bids'),
  getBidDetail: (id: string) => apiRequest<any>(`/bids/${id}`),
  submitBid: (payload: any) => apiRequest<any>('/bids/submit', { method: 'POST', body: JSON.stringify(payload) }),

  // Evaluation & Scoring
  getEvaluationWorkspace: (eventId: string) => apiRequest<any>(`/evaluations/event/${eventId}/workspace`),
  submitEvaluationScore: (payload: any) => apiRequest<any>('/evaluations/score', { method: 'POST', body: JSON.stringify(payload) }),
  calculateRankings: (eventId: string) => apiRequest<any>(`/evaluations/event/${eventId}/calculate`, { method: 'POST' }),

  // Awards
  getAwards: () => apiRequest<any[]>('/awards'),
  createAward: (payload: any) => apiRequest<any>('/awards', { method: 'POST', body: JSON.stringify(payload) }),

  // Contracts
  getContracts: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/contracts?${qs}`);
  },
  getContractDetail: (id: string) => apiRequest<any>(`/contracts/${id}`),
  createContract: (payload: any) => apiRequest<any>('/contracts', { method: 'POST', body: JSON.stringify(payload) }),
  addAmendment: (id: string, payload: any) => apiRequest<any>(`/contracts/${id}/amendments`, { method: 'POST', body: JSON.stringify(payload) }),

  // Purchase Orders
  getPOs: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/pos?${qs}`);
  },
  getPODetail: (id: string) => apiRequest<any>(`/pos/${id}`),
  createPO: (payload: any) => apiRequest<any>('/pos', { method: 'POST', body: JSON.stringify(payload) }),
  respondToPO: (id: string, payload: { action: 'Accept' | 'Reject'; reason?: string }) =>
    apiRequest<any>(`/pos/${id}/respond`, { method: 'POST', body: JSON.stringify(payload) }),
  acknowledgePO: (id: string, payload: { action: 'Accept' | 'Reject'; reason?: string }) =>
    apiRequest<any>(`/pos/${id}/respond`, { method: 'POST', body: JSON.stringify(payload) }),

  // Deliveries / GRN
  getGRNs: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/grns?${qs}`);
  },
  createGRN: (payload: any) => apiRequest<any>('/grns', { method: 'POST', body: JSON.stringify(payload) }),

  // Invoices & 3-Way Match
  getInvoices: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/invoices?${qs}`);
  },
  getInvoiceDetail: (id: string) => apiRequest<any>(`/invoices/${id}`),
  submitInvoice: (payload: any) => apiRequest<any>('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  createInvoice: (payload: any) => apiRequest<any>('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  run3WayMatch: (id: string) => apiRequest<any>(`/invoices/${id}/run-match`, { method: 'POST' }),

  // Supplier Documents
  getSupplierDocuments: () => apiRequest<any[]>('/suppliers/my-documents'),
  uploadSupplierDocument: (payload: any) => apiRequest<any>('/suppliers/my-documents', { method: 'POST', body: JSON.stringify(payload) }),

  // Payments
  getPayments: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/payments?${qs}`);
  },

  processPayment: (payload: any) => apiRequest<any>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  // Dynamic Approval Center & Workflows
  getMyApprovalTasks: () => apiRequest<any[]>('/approvals/my-tasks'),
  getApprovalTaskDetails: (taskId: string) => apiRequest<any>(`/approvals/task-details/${taskId}`),
  processApprovalAction: (taskId: string, payload: any) => apiRequest<any>(`/approvals/tasks/${taskId}/action`, { method: 'POST', body: JSON.stringify(payload) }),
  getApprovalTimeline: (module: string, recordId: string) => apiRequest<any>(`/approvals/timeline/${module}/${recordId}`),

  getWorkflows: () => apiRequest<any[]>('/workflows'),
  createWorkflow: (payload: any) => apiRequest<any>('/workflows', { method: 'POST', body: JSON.stringify(payload) }),
  addWorkflowLevel: (wfId: string, payload: any) => apiRequest<any>(`/workflows/${wfId}/levels`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteWorkflowLevel: (levelId: string) => apiRequest<any>(`/workflows/levels/${levelId}`, { method: 'DELETE' }),

  // Performance & Risk
  getScorecards: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/performance-risk/performance?${qs}`);
  },
  createScorecard: (payload: any) => apiRequest<any>('/performance-risk/performance', { method: 'POST', body: JSON.stringify(payload) }),
  getRiskMatrix: () => apiRequest<any[]>('/performance-risk/risk'),
  updateRiskMatrix: (supplierId: string, payload: any) => apiRequest<any>(`/performance-risk/risk/${supplierId}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Master Data
  getMasterData: (type?: string) => apiRequest<any[]>(`/master-data${type ? `?type=${type}` : ''}`),
  getDepartments: () => apiRequest<any[]>('/master-data/departments'),
  getNumberingConfigs: () => apiRequest<any[]>('/master-data/numbering'),
  getEmailTemplates: () => apiRequest<any[]>('/master-data/email-templates'),
  updateEmailTemplate: (id: string, payload: any) => apiRequest<any>(`/master-data/email-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // Analytics & Dashboards
  getAdminDashboard: () => apiRequest<any>('/analytics/admin-dashboard'),
  getSupplierDashboard: () => apiRequest<any>('/analytics/supplier-dashboard'),

  // User & Identity Master (Super Admin Only)
  getUsers: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<{ users: any[]; stats: any }>(`/users?${qs}`);
  },
  getRoles: () => apiRequest<any[]>('/users/roles'),
  getUserDetail: (id: string) => apiRequest<any>(`/users/${id}`),
  createUser: (payload: any) => apiRequest<any>('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: any) => apiRequest<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  changeUserPassword: (id: string, payload: any) => apiRequest<any>(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify(payload) }),
  toggleUserStatus: (id: string, payload: any) => apiRequest<any>(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUser: (id: string) => apiRequest<any>(`/users/${id}`, { method: 'DELETE' }),

  // Audit Logs & Notifications
  getAuditLogs: (params?: any) => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiRequest<any[]>(`/audit?${qs}`);
  },
  getNotifications: () => apiRequest<any[]>('/audit/notifications'),
  markNotificationRead: (id: string) => apiRequest<any>(`/audit/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest<any>('/audit/notifications/read-all', { method: 'POST' }),
};


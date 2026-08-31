import React, { useState, useEffect } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Share2,
  HelpCircle,
  FileText,
  Filter,
  Eye,
  Send,
  UserCheck,
  Building2,
  Landmark,
  ShieldCheck,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  History,
  Tag,
  Award,
  AlertTriangle
} from 'lucide-react';




import { api } from '../../api/client';
import { ApprovalTask } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ApprovalTimeline } from '../../components/common/ApprovalTimeline';

export const ApprovalCenter: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected' | 'Sent Back' | 'Clarification Requested' | 'Delegated' | null>(null);
  const [comments, setComments] = useState('');
  const [delegatedUserId, setDelegatedUserId] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Task Inspection Modal
  const [inspectingTask, setInspectingTask] = useState<any | null>(null);
  const [inspectDetail, setInspectDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Timeline view modal
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  useEffect(() => {
    loadTasks();
    api.getDemoPersonas().then((res) => setUsersList(res)).catch(() => {});
  }, []);

  const loadTasks = async () => {
    try {
      const res = await api.getMyApprovalTasks();
      setTasks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (task: any, action: typeof actionType) => {
    setSelectedTask(task);
    setActionType(action);
    setComments('');
    setDelegatedUserId('');
  };

  const handleInspect = async (task: any) => {
    setInspectingTask(task);
    setLoadingDetail(true);
    try {
      const detail = await api.getApprovalTaskDetails(task.id);
      setInspectDetail(detail);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleProcessAction = async () => {
    if (!selectedTask || !actionType) return;

    if (actionType === 'Rejected' && !comments.trim()) {
      alert('Rejection reason is mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.processApprovalAction(selectedTask.id, {
        action: actionType,
        comments,
        delegatedToUserId: delegatedUserId || undefined
      });

      alert(res.message || 'Action completed successfully!');
      setSelectedTask(null);
      setActionType(null);
      setInspectingTask(null);
      setInspectDetail(null);
      loadTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to process approval action');
    } finally {
      setSubmitting(false);
    }
  };

  const viewTimeline = async (task: any) => {
    try {
      const timeline = await api.getApprovalTimeline(task.module, task.record_id || task.reference_number);
      setTimelineData(timeline);
      setShowTimelineModal(true);
    } catch (e) {
      alert('Could not load timeline');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Central Approval Inbox</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
              {tasks.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review and govern supplier registrations, high-value purchase orders, requisitions, awards, and invoices.
          </p>
        </div>

        <button
          onClick={loadTasks}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors"
        >
          Refresh Inbox
        </button>
      </div>

      {/* Task List Table */}
      <div className="rounded-2xl bg-slate-850 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading pending approval queue...</div>
        ) : tasks.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-white">All caught up!</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You currently have no pending approval tasks assigned to your role or user account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-5 py-4">Process & Subject Entity</th>
                  <th className="px-5 py-4">Submitted By</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Level / SLA</th>
                  <th className="px-5 py-4">Submitted</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                            {t.module.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{t.reference_number}</span>
                        </div>
                        <p className="font-bold text-white text-sm">{t.entity_title || t.reference_number}</p>
                        <p className="text-xs text-slate-400">{t.entity_subtitle || t.workflow_name}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {t.is_self_registered ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <Building2 className="w-3 h-3" /> Vendor Self-Registration
                          </span>
                          <p className="text-xs font-semibold text-slate-200">{t.supplier_name || 'New Supplier'}</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white">{t.requester_display}</p>
                          <p className="text-[11px] text-slate-400">{t.requester_email_display}</p>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                      {t.amount ? `$${t.amount.toLocaleString()}` : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{t.level_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                            L{t.sequence_order || t.level_number || 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                          <Clock className="w-3 h-3" /> SLA: {t.sla_hours}h
                        </div>

                        {/* Previous Approvals Summary */}
                        {t.history && t.history.length > 0 && (
                          <div className="pt-1 space-y-0.5">
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved by {t.history.length} prev stage(s):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {t.history.map((h: any, hIdx: number) => (
                                <span
                                  key={hIdx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                                  title={`${h.level_name}: ${h.actor_name} (${h.actor_role})${h.comments ? ` - "${h.comments}"` : ''}`}
                                >
                                  ✓ {h.actor_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                      {new Date(t.submitted_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInspect(t)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-bold transition-all"
                          title="Inspect full details and previous approval history"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>

                        <button
                          onClick={() => handleOpenAction(t, 'Approved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>

                        <button
                          onClick={() => handleOpenAction(t, 'Rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>

                        <button
                          onClick={() => handleOpenAction(t, 'Clarification Requested')}
                          title="Request Clarification"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenAction(t, 'Delegated')}
                          title="Delegate Task"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-blue-400 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Record Inspection Modal */}
      {inspectingTask && (
        <Modal
          isOpen={true}
          onClose={() => setInspectingTask(null)}
          title={`Review & Inspect: ${inspectingTask.entity_title || inspectingTask.reference_number}`}
          maxWidth="4xl"
        >
          {loadingDetail ? (
            <div className="p-12 text-center text-slate-400">Loading comprehensive entity profile & audit trail...</div>
          ) : !inspectDetail ? (
            <div className="p-8 text-center text-rose-400">Failed to load record details.</div>
          ) : (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Status Bar */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">
                      {inspectingTask.module.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">{inspectingTask.reference_number}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Current Level: <strong className="text-blue-400">{inspectingTask.level_name}</strong> (SLA: {inspectingTask.sla_hours}h)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAction(inspectingTask, 'Approved')}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleOpenAction(inspectingTask, 'Rejected')}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>

              {/* APPROVAL AUDIT TRAIL & DECISION HISTORY */}
              <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Multi-Level Approval Journey & Decision Trail
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Workflow: <strong className="text-white">{inspectingTask.workflow_name}</strong>
                  </span>
                </div>

                {inspectDetail.approvalHistory && inspectDetail.approvalHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {inspectDetail.approvalHistory.map((hist: any, hIdx: number) => (
                      <div
                        key={hist.id || hIdx}
                        className="p-3 rounded-xl bg-slate-850 border border-emerald-500/30 space-y-2 relative overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                            <span className="font-bold text-white text-xs">{hist.level_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                              {hist.action}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(hist.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 pl-7">
                          <span className="text-slate-400">Approved by: </span>
                          <strong className="text-white">{hist.actor_name}</strong>
                          <span className="text-slate-400"> ({hist.actor_role})</span>
                        </div>

                        {hist.comments && (
                          <div className="ml-7 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs">
                            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">
                              Approver Comments / Remarks:
                            </span>
                            <p className="text-slate-200 italic font-sans">"{hist.comments}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-850/60 border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>This is the first stage (Level 1). No previous approvals recorded yet.</span>
                  </div>
                )}

                {/* Current Active Level Indicator */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                    <span className="text-blue-300 font-bold">Currently Pending Review:</span>
                    <strong className="text-white">{inspectingTask.level_name}</strong>
                  </div>
                  <span className="text-amber-400 font-mono text-[11px] font-bold">
                    SLA: {inspectingTask.sla_hours}h
                  </span>
                </div>
              </div>


              {/* SUPPLIER REGISTRATION DETAIL VIEW */}
              {inspectDetail.supplier && (
                <div className="space-y-5">
                  {/* Company Profile Card */}
                  <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-700/80 pb-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span>Company & Registration Identification</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Legal Company Name:</span>
                        <span className="font-bold text-white text-sm">{inspectDetail.supplier.legal_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Trading Name / DBA:</span>
                        <span className="font-semibold text-slate-200">{inspectDetail.supplier.trading_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Business Type:</span>
                        <span className="font-semibold text-slate-200">{inspectDetail.supplier.business_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Registration Number:</span>
                        <span className="font-mono font-bold text-blue-400">{inspectDetail.supplier.registration_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tax / VAT ID:</span>
                        <span className="font-mono font-bold text-emerald-400">{inspectDetail.supplier.tax_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Country & City:</span>
                        <span className="font-semibold text-slate-200">{inspectDetail.supplier.city ? `${inspectDetail.supplier.city}, ` : ''}{inspectDetail.supplier.country}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Annual Turnover:</span>
                        <span className="font-mono font-bold text-emerald-400">${inspectDetail.supplier.annual_turnover?.toLocaleString()} {inspectDetail.supplier.currency}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Employee Count:</span>
                        <span className="font-semibold text-slate-200">{inspectDetail.supplier.employee_count} Employees</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Year Established:</span>
                        <span className="font-semibold text-slate-200">{inspectDetail.supplier.year_established}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contacts & Banking Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contacts Card */}
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-700/80 pb-2">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Registered Contacts</span>
                      </div>

                      {inspectDetail.contacts && inspectDetail.contacts.length > 0 ? (
                        <div className="space-y-2">
                          {inspectDetail.contacts.map((c: any) => (
                            <div key={c.id} className="p-2.5 rounded-xl bg-slate-850 border border-slate-700/60 text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white">{c.first_name} {c.last_name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">{c.contact_type}</span>
                              </div>
                              <p className="text-slate-300">{c.email}</p>
                              {c.phone && <p className="text-slate-400 font-mono text-[11px]">{c.phone}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No separate contact entries.</p>
                      )}
                    </div>

                    {/* Banking Card */}
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-700/80 pb-2">
                        <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Secured Banking Information</span>
                      </div>

                      {inspectDetail.bankAccounts && inspectDetail.bankAccounts.length > 0 ? (
                        <div className="space-y-2">
                          {inspectDetail.bankAccounts.map((b: any) => (
                            <div key={b.id} className="p-2.5 rounded-xl bg-slate-850 border border-slate-700/60 text-xs space-y-1 font-mono">
                              <p className="font-bold text-white text-sm font-sans">{b.bank_name}</p>
                              <div className="flex justify-between text-slate-300">
                                <span className="text-slate-400 font-sans">Account No:</span>
                                <span className="text-emerald-400 font-bold">{b.account_number}</span>
                              </div>
                              {b.iban && (
                                <div className="flex justify-between text-slate-300">
                                  <span className="text-slate-400 font-sans">IBAN:</span>
                                  <span>{b.iban}</span>
                                </div>
                              )}
                              {b.swift_bic && (
                                <div className="flex justify-between text-slate-300">
                                  <span className="text-slate-400 font-sans">SWIFT/BIC:</span>
                                  <span>{b.swift_bic}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No bank records provided.</p>
                      )}
                    </div>
                  </div>

                  {/* Categories & Risk Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categories Card */}
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-700/80 pb-2">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span>Enrolled Categories</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectDetail.categories && inspectDetail.categories.length > 0 ? (
                          inspectDetail.categories.map((cat: any) => (
                            <span key={cat.id} className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
                              {cat.category_name || cat.category_code}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic">General Sourcing</p>
                        )}
                      </div>
                    </div>

                    {/* Risk Baseline Card */}
                    <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-700/80 pb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>Automated Risk Rating</span>
                      </div>
                      {inspectDetail.risk ? (
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 block">Overall Risk Score:</span>
                            <span className="font-mono text-lg font-black text-emerald-400">{inspectDetail.risk.overall_risk_score} / 100</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Risk Category:</span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                              {inspectDetail.risk.overall_risk_rating || 'Low Risk'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Baseline calculated upon approval.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PURCHASE REQUISITION DETAIL VIEW */}
              {inspectDetail.pr && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Title:</span>
                      <span className="font-bold text-white text-sm">{inspectDetail.pr.title}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department:</span>
                      <span className="font-semibold text-slate-200">{inspectDetail.pr.department_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Estimated Total:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">${inspectDetail.pr.estimated_total?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Required By:</span>
                      <span className="font-semibold text-slate-200">{inspectDetail.pr.required_date}</span>
                    </div>
                  </div>

                  {inspectDetail.items && inspectDetail.items.length > 0 && (
                    <div className="rounded-xl border border-slate-700 overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Qty</th>
                            <th className="p-3">Est. Unit Price</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-850">
                          {inspectDetail.items.map((it: any, idx: number) => (
                            <tr key={it.id || idx}>
                              <td className="p-3 font-mono">{idx + 1}</td>
                              <td className="p-3 font-semibold text-white">{it.description}</td>
                              <td className="p-3 font-mono">{it.quantity} {it.unit}</td>
                              <td className="p-3 font-mono">${it.estimated_unit_price?.toLocaleString()}</td>
                              <td className="p-3 font-mono font-bold text-emerald-400 text-right">${it.estimated_total?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PURCHASE ORDER DETAIL VIEW */}
              {inspectDetail.po && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">PO Number:</span>
                      <span className="font-mono font-bold text-blue-400">{inspectDetail.po.po_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Supplier:</span>
                      <span className="font-bold text-white">{inspectDetail.po.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Grand Total:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">${inspectDetail.po.grand_total?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Delivery Address:</span>
                      <span className="text-slate-300">{inspectDetail.po.delivery_address}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* INVOICE DETAIL VIEW */}
              {inspectDetail.invoice && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Invoice Number:</span>
                      <span className="font-mono font-bold text-blue-400">{inspectDetail.invoice.invoice_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Supplier:</span>
                      <span className="font-bold text-white">{inspectDetail.invoice.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Amount:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">${inspectDetail.invoice.total_amount?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">3-Way Match Status:</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                        {inspectDetail.invoice.matching_status || 'Matched'}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy Breakdown if Exception */}
                  {inspectDetail.invoice.discrepancy_details && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>Automated 3-Way Match Exceptions Detected</span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          let list: any[] = [];
                          try {
                            const parsed = typeof inspectDetail.invoice.discrepancy_details === 'string'
                              ? JSON.parse(inspectDetail.invoice.discrepancy_details)
                              : inspectDetail.invoice.discrepancy_details;
                            list = Array.isArray(parsed) ? parsed : [parsed];
                          } catch (e) {
                            list = [{ reason: inspectDetail.invoice.discrepancy_details }];
                          }

                          return list.map((disc: any, dIdx: number) => (
                            <div
                              key={dIdx}
                              className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-xs space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-white text-sm">
                                  {disc.description || `Line Item #${disc.itemNumber || dIdx + 1}`}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                  ⚠️ Variance Exception
                                </span>
                              </div>

                              <div className="text-rose-200 font-semibold flex items-start gap-1.5">
                                <span className="text-rose-400 font-bold">•</span>
                                <span>{disc.reason || 'Discrepancy detected during 3-Way matching verification'}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 font-mono text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                                <div>
                                  <span className="text-slate-400 block font-sans text-[10px]">PO Ordered Qty:</span>
                                  <span className="font-bold text-white">{disc.poQty ?? '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-sans text-[10px]">Dock Received (GRN):</span>
                                  <span className="font-bold text-amber-400">{disc.grnQty ?? 0}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-sans text-[10px]">Invoiced Billed Qty:</span>
                                  <span className="font-bold text-rose-400">{disc.invQty ?? '—'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-sans text-[10px]">Quantity Variance:</span>
                                  <span className="font-bold text-rose-400">
                                    {disc.quantityVariance !== undefined ? `+${disc.quantityVariance} Qty` : 'Mismatch'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* BID AWARD DETAIL VIEW */}
              {inspectDetail.award && (

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-700/80 pb-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Tender Award & Evaluation Summary</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Sourcing Event:</span>
                        <span className="font-bold text-white text-sm">{inspectDetail.award.event_title || inspectDetail.award.event_number}</span>
                        <span className="font-mono text-slate-400 text-[11px] block">{inspectDetail.award.event_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Winning Supplier:</span>
                        <span className="font-bold text-blue-400 text-sm">{inspectDetail.award.supplier_name}</span>
                        <span className="font-mono text-slate-400 text-[11px] block">{inspectDetail.award.supplier_code}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Awarded Amount:</span>
                        <span className="font-mono font-black text-emerald-400 text-base">
                          ${inspectDetail.award.awarded_amount?.toLocaleString()} {inspectDetail.award.currency || 'USD'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Winning Bid Rank:</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                          👑 Rank #{inspectDetail.award.final_rank || 1}
                        </span>
                      </div>
                    </div>

                    {/* Scores Matrix */}
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-700/80 grid grid-cols-3 gap-3 text-xs text-center font-mono">
                      <div>
                        <span className="text-slate-400 font-sans text-[11px] block">Technical Score</span>
                        <span className="font-bold text-blue-400">{inspectDetail.award.technical_score ?? 88}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans text-[11px] block">Commercial Score</span>
                        <span className="font-bold text-emerald-400">{inspectDetail.award.commercial_score ?? 92}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans text-[11px] block">Weighted Score</span>
                        <span className="font-bold text-amber-400 text-sm">{inspectDetail.award.total_weighted_score ?? 89.6}%</span>
                      </div>
                    </div>

                    {/* Recommendation Justification */}
                    <div className="p-3 rounded-xl bg-slate-850 border border-slate-700/80 text-xs space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                        Committee Justification & Rationale:
                      </span>
                      <p className="text-slate-200 leading-relaxed font-sans">
                        {inspectDetail.award.reason || inspectDetail.award.committee_recommendation || 'Evaluated as lowest compliant bidder with highest combined technical and commercial score.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}


      {/* Decision Action Modal */}
      {selectedTask && actionType && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          title={`Action: ${actionType} (${selectedTask.reference_number})`}
        >
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Process Module:</span>
                <span className="font-bold text-white">{selectedTask.module}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject Entity:</span>
                <span className="font-bold text-blue-400">{selectedTask.entity_title || selectedTask.reference_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Approval Level:</span>
                <span className="font-bold text-amber-400">{selectedTask.level_name}</span>
              </div>
              {selectedTask.amount !== undefined && selectedTask.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Value:</span>
                  <span className="font-mono font-bold text-emerald-400">${selectedTask.amount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Delegation User Dropdown */}
            {actionType === 'Delegated' && (
              <div>
                <label className="text-xs font-semibold text-slate-400">Delegate to User *</label>
                <select
                  value={delegatedUserId}
                  onChange={(e) => setDelegatedUserId(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="">Select target user...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-400">
                {actionType === 'Rejected' ? 'Rejection Reason (Mandatory) *' : 'Comments / Sign-off Notes'}
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  actionType === 'Rejected'
                    ? 'Please specify exact non-compliance or budgetary reason for rejection...'
                    : 'Add any remarks or audit notes...'
                }
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleProcessAction}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  actionType === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : actionType === 'Rejected'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
              >
                {submitting ? 'Executing Workflow...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

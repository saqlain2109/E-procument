import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  HelpCircle,
  Award,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

interface Props {
  tenderId: string;
  onBack: () => void;
  onNavigateToEvaluation?: (tenderId: string) => void;
}

export const TenderDetail: React.FC<Props> = ({ tenderId, onBack, onNavigateToEvaluation }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerQuestionId, setAnswerQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDetail();
  }, [tenderId]);

  const loadDetail = async () => {
    try {
      const res = await api.getTenderDetail(tenderId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish this tender and notify all invited suppliers?')) return;
    setActionLoading(true);
    try {
      await api.publishTender(tenderId);
      alert('Tender published! Notifications sent to invited suppliers.');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBids = async () => {
    if (!confirm('Proceed with official Bid Opening ceremony? Sealed commercial bids will be unlocked for committee evaluation.')) return;
    setActionLoading(true);
    try {
      await api.openBids(tenderId);
      alert('Bid opening completed! Sealed bids are now unlocked.');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'Bid opening failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnswerClarification = async () => {
    if (!answerQuestionId || !answerText.trim()) return;
    try {
      await api.answerClarification(tenderId, answerQuestionId, { answer: answerText });
      setAnswerQuestionId(null);
      setAnswerText('');
      loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to submit answer');
    }
  };

  if (loading || !data) {
    return <div className="p-12 text-center text-slate-400">Loading sourcing event details...</div>;
  }

  const { event, items, technicalRequirements, evaluationCriteria, committeeMembers, documents, clarifications, participants } = data;

  const lifecycleStages = ['Draft', 'Published', 'Bid Submission', 'Closed', 'Evaluation', 'Awarded'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sourcing List
        </button>

        <div className="flex items-center gap-3">
          {event.status === 'Draft' && (
            <button
              disabled={actionLoading}
              onClick={handlePublish}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Publish & Invite Suppliers
            </button>
          )}

          {['Published', 'Bid Submission', 'Closed'].includes(event.status) && (
            <button
              disabled={actionLoading}
              onClick={handleOpenBids}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all"
            >
              <Unlock className="w-3.5 h-3.5" /> Conduct Bid Opening Ceremony
            </button>
          )}

          {['Evaluation', 'Award Approval', 'Awarded'].includes(event.status) && onNavigateToEvaluation && (
            <button
              onClick={() => onNavigateToEvaluation(tenderId)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Award className="w-3.5 h-3.5" /> Open Evaluation Workspace
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-400">{event.event_number}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                {event.event_type}
              </span>
              <StatusBadge status={event.status} size="sm" />
            </div>
            <h2 className="text-2xl font-black text-white">{event.title}</h2>
            <p className="text-xs text-slate-400">Category: {event.procurement_category} • Dept: {event.department_name}</p>
          </div>

          <div className="text-right p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Budget</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              ${(event.estimated_budget || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Lifecycle Stepper */}
        <div className="relative flex items-center justify-between overflow-x-auto py-2">
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-700 -translate-y-1/2 z-0" />
          {lifecycleStages.map((st, i) => {
            const isDone = lifecycleStages.indexOf(event.status) >= i;
            const isCurrent = event.status === st;
            return (
              <div key={st} className="relative z-10 flex flex-col items-center min-w-[100px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isDone
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[11px] mt-1 font-bold ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`}>
                  {st}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bill of Quantities / Line Items */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Line Items & Scope</h3>
        <div className="rounded-xl border border-slate-700/60 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Specification</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Estimated Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items?.map((it: any) => (
                <tr key={it.id}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-400">{it.item_number}</td>
                  <td className="px-4 py-3 font-bold text-white">{it.description}</td>
                  <td className="px-4 py-3 text-slate-400">{it.specification || '—'}</td>
                  <td className="px-4 py-3 font-mono">{it.quantity} {it.unit}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400">${(it.estimated_price || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clarifications Q&A Thread */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Procurement Clarifications / Q&A</h3>
            <p className="text-xs text-slate-400">Public supplier questions and official buyer responses</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 text-blue-400">
            {clarifications?.length || 0} Questions
          </span>
        </div>

        <div className="space-y-3">
          {clarifications?.length > 0 ? (
            clarifications.map((c: any) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> {c.supplier_name} asks:
                    </span>
                    <p className="text-slate-200 text-xs font-medium pl-5">{c.question}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>

                {c.answer ? (
                  <div className="mt-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 ml-5 text-slate-300 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-400">Official Procurement Officer Response:</p>
                    <p className="leading-relaxed">{c.answer}</p>
                  </div>
                ) : (
                  <div className="ml-5 pt-1">
                    <button
                      onClick={() => {
                        setAnswerQuestionId(c.id);
                        setAnswerText('');
                      }}
                      className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Answer Clarification
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No questions submitted yet by bidders.</p>
          )}
        </div>
      </div>

      {/* Answer Question Modal */}
      {answerQuestionId && (
        <Modal isOpen={true} onClose={() => setAnswerQuestionId(null)} title="Post Clarification Response" maxWidth="md">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Your Official Response (Will be published to bidders) *</label>
              <textarea
                rows={4}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Enter clear and unambiguous response..."
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setAnswerQuestionId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswerClarification}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Publish Answer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

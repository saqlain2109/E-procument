import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Props {
  timeline: {
    instance?: any;
    levels: any[];
    tasks: any[];
    history: any[];
  } | null;
}

export const ApprovalTimeline: React.FC<Props> = ({ timeline }) => {
  if (!timeline || !timeline.levels || timeline.levels.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700/50">
        <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-500" />
        <p className="text-sm">No multi-level approval workflow configured for this record.</p>
      </div>
    );
  }

  const { instance, levels, tasks, history } = timeline;

  return (
    <div className="space-y-6">
      {/* Visual Workflow Steps */}
      <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workflow: <span className="text-white normal-case font-bold">{instance?.workflow_name || 'Approval Sequence'}</span>
          </h4>
          {instance && <StatusBadge status={instance.status} size="sm" />}
        </div>

        <div className="relative flex items-center justify-between overflow-x-auto py-3">
          {/* Timeline Connector Line */}
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-700 -translate-y-1/2 z-0" />

          {levels.map((lvl, index) => {
            const levelTask = tasks?.find((t) => t.level_id === lvl.id || t.level_number === lvl.level_number);
            const isCompleted = levelTask?.status === 'Approved';
            const isPending = levelTask?.status === 'Pending';
            const isRejected = levelTask?.status === 'Rejected';

            return (
              <div key={lvl.id || index} className="relative z-10 flex flex-col items-center group min-w-[120px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                      : isRejected
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : isPending
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isRejected ? (
                    <XCircle className="w-5 h-5" />
                  ) : isPending ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">{lvl.level_number}</span>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-slate-200">{lvl.level_name}</p>
                  <p className="text-[11px] text-slate-400">{lvl.role_name || (lvl.first_name ? `${lvl.first_name} ${lvl.last_name}` : 'Approver')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Audit History Table */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Approval Actions Log</h4>
          <div className="divide-y divide-slate-800 rounded-xl bg-slate-800/30 border border-slate-700/40 overflow-hidden">
            {history.map((h, i) => (
              <div key={i} className="p-4 flex items-start justify-between gap-4 text-sm hover:bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {h.action === 'Approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : h.action === 'Rejected' ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{h.actor_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{h.actor_role}</span>
                      <span className="text-xs text-slate-400 font-mono">• {h.level_name}</span>
                    </div>
                    {h.comments && <p className="mt-1 text-slate-300 text-xs italic bg-slate-900/40 p-2 rounded border border-slate-700/30">"{h.comments}"</p>}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <StatusBadge status={h.action} size="sm" />
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">{new Date(h.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

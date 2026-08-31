import React, { useState, useEffect } from 'react';
import { FolderLock, Plus, Eye, Calendar, DollarSign, Users, Award, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { ProcurementEvent } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { TenderCreationWizard } from '../../components/wizards/TenderCreationWizard';

interface Props {
  onSelectTender: (tenderId: string) => void;
  onNavigateToEvaluation?: (tenderId: string) => void;
}

export const TenderManagement: React.FC<Props> = ({ onSelectTender, onNavigateToEvaluation }) => {
  const [tenders, setTenders] = useState<ProcurementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizardModal, setShowWizardModal] = useState(false);

  useEffect(() => {
    loadTenders();
  }, []);

  const loadTenders = async () => {
    try {
      const res = await api.getTenders();
      setTenders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<ProcurementEvent>[] = [
    {
      header: 'Event Ref & Title',
      cell: (t) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mt-0.5">
            <FolderLock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">{t.event_number}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold font-mono">
                {t.event_type}
              </span>
            </div>
            <p className="text-sm font-bold text-white tracking-tight mt-0.5">{t.title}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'procurement_category'
    },
    {
      header: 'Estimated Budget',
      cell: (t) => (
        <span className="font-mono text-xs font-bold text-emerald-400">
          ${(t.estimated_budget || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Submission Deadline',
      cell: (t) => (
        <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          {new Date(t.bid_submission_deadline).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Participation',
      cell: (t) => (
        <span className="text-xs text-slate-300 font-mono">
          <strong>{t.bid_count || 0}</strong> Bids • <strong>{t.invited_count || 0}</strong> Invited
        </span>
      )
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (t) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTender(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
          >
            <Eye className="w-3.5 h-3.5" /> Manage
          </button>
          {['Evaluation', 'Award Approval', 'Awarded'].includes(t.status) && onNavigateToEvaluation && (
            <button
              onClick={() => onNavigateToEvaluation(t.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-xs font-bold transition-all border border-amber-500/30"
            >
              <Award className="w-3.5 h-3.5" /> Evaluate
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">RFQs, RFPs & Tenders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Publish sourcing events, invite qualified suppliers, protect sealed bids, and conduct opening ceremonies.
          </p>
        </div>

        <button
          onClick={() => setShowWizardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sourcing Event</span>
        </button>
      </div>

      <DataTable
        title="Active Sourcing Opportunities"
        data={tenders}
        columns={columns}
        searchPlaceholder="Search event number, title, category..."
        statusFilterKey="status"
        statusOptions={['Draft', 'Published', 'Bid Submission', 'Closed', 'Evaluation', 'Awarded']}
      />

      {/* Tender Wizard Modal */}
      {showWizardModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowWizardModal(false)}
          title="Create Sourcing Event Wizard"
          maxWidth="4xl"
        >
          <TenderCreationWizard
            onSuccess={() => {
              setShowWizardModal(false);
              loadTenders();
            }}
            onCancel={() => setShowWizardModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

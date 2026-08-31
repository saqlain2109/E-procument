import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, FileSignature, Eye, Calendar, DollarSign } from 'lucide-react';
import { api } from '../../api/client';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

interface Props {
  onNavigateToContracts?: () => void;
}

export const AwardManagement: React.FC<Props> = ({ onNavigateToContracts }) => {
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAward, setSelectedAward] = useState<any | null>(null);

  useEffect(() => {
    loadAwards();
  }, []);

  const loadAwards = async () => {
    try {
      const res = await api.getAwards();
      setAwards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Award Ref & Event',
      cell: (a) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-400">{a.award_number}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{a.event_number}</span>
          </div>
          <p className="text-sm font-bold text-white tracking-tight mt-0.5">{a.event_title}</p>
        </div>
      )
    },
    {
      header: 'Awarded Supplier',
      cell: (a) => (
        <div>
          <p className="font-bold text-white text-xs">{a.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{a.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Award Value',
      cell: (a) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${(a.awarded_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (a) => <StatusBadge status={a.status} size="sm" />
    },
    {
      header: 'Recommended By',
      cell: (a) => (
        <span className="text-xs text-slate-300">
          {a.recommended_first ? `${a.recommended_first} ${a.recommended_last}` : 'Procurement Officer'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (a) => (
        <button
          onClick={() => setSelectedAward(a)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
        >
          <Eye className="w-3.5 h-3.5" /> Award Letter
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Award Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Formal procurement award decisions, governance sign-offs, and automated contract formulation.
          </p>
        </div>
      </div>

      <DataTable
        title="Procurement Awards"
        data={awards}
        columns={columns}
        searchPlaceholder="Search award number, event, supplier..."
        statusFilterKey="status"
        statusOptions={['Draft', 'Pending Approval', 'Approved', 'Awarded', 'Rejected']}
      />

      {/* Award Letter View Modal */}
      {selectedAward && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAward(null)}
          title={`Formal Notice of Award: ${selectedAward.award_number}`}
          maxWidth="2xl"
        >
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 text-slate-200 text-xs font-sans leading-relaxed">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Enterprise Procurement Office</h3>
                <p className="text-slate-400">Official Notice of Sourcing Award</p>
              </div>
              <StatusBadge status={selectedAward.status} size="sm" />
            </div>

            <div className="space-y-2">
              <p><strong>To:</strong> {selectedAward.supplier_name} ({selectedAward.supplier_code})</p>
              <p><strong>Subject:</strong> Notice of Contract Award for Sourcing Event Ref: {selectedAward.event_number}</p>
              <p><strong>Award Amount:</strong> <span className="font-mono font-bold text-emerald-400">${(selectedAward.awarded_amount || 0).toLocaleString()} USD</span></p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="font-bold text-white">Committee Justification:</p>
              <p className="italic text-slate-300">"{selectedAward.reason}"</p>
            </div>

            <p className="text-slate-400">
              This award is formally recorded under internal multi-level executive governance. The legal contract agreement has been auto-generated and dispatched for execution.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedAward(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              {onNavigateToContracts && (
                <button
                  onClick={() => {
                    setSelectedAward(null);
                    onNavigateToContracts();
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  <FileSignature className="w-4 h-4" /> View Associated Contract
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

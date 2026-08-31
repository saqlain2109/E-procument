import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Eye, Calendar, DollarSign, Clock, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { Contract } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amendValue, setAmendValue] = useState<number>(0);
  const [amendDate, setAmendDate] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const res = await api.getContracts();
      setContracts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewContractDetail = async (id: string) => {
    try {
      const res = await api.getContractDetail(id);
      setSelectedContract(res);
    } catch (e) {
      alert('Failed to load contract details');
    }
  };

  const handleAddAmendment = async () => {
    if (!selectedContract || !amendReason.trim()) {
      alert('Amendment reason is mandatory.');
      return;
    }
    try {
      await api.addAmendment(selectedContract.contract.id, {
        reason: amendReason,
        valueChange: amendValue,
        extendedEndDate: amendDate || undefined
      });
      alert('Contract amendment executed successfully!');
      setShowAmendmentModal(false);
      viewContractDetail(selectedContract.contract.id);
      loadContracts();
    } catch (err: any) {
      alert(err.message || 'Failed to amend contract');
    }
  };

  const columns: Column<Contract>[] = [
    {
      header: 'Contract Ref & Title',
      cell: (c) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mt-0.5">
            <FileSignature className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{c.contract_number}</span>
            <p className="text-sm font-bold text-white tracking-tight">{c.title}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Supplier',
      cell: (c) => (
        <div>
          <p className="font-bold text-white text-xs">{c.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{c.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Total Value',
      cell: (c) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${(c.contract_value || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Duration & Expiry',
      cell: (c) => {
        const isExpiring = c.status === 'Expiring Soon';
        return (
          <div className="space-y-0.5">
            <span className="text-xs text-slate-300 font-mono">{c.start_date} to {c.end_date}</span>
            {isExpiring && (
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <AlertTriangle className="w-3 h-3" /> Expiry Alert (within 90 days)
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'Status',
      cell: (c) => <StatusBadge status={c.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (c) => (
        <button
          onClick={() => viewContractDetail(c.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
        >
          <Eye className="w-3.5 h-3.5" /> Manage
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Contract Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Central contract lifecycle repository with milestone payments, amendments, and automated 30/60/90-day expiry alerts.
          </p>
        </div>
      </div>

      <DataTable
        title="Active Legal Agreements"
        data={contracts}
        columns={columns}
        searchPlaceholder="Search contract number, title, supplier..."
        statusFilterKey="status"
        statusOptions={['Active', 'Expiring Soon', 'Expired', 'Draft']}
      />

      {/* Contract Detail & Milestones Modal */}
      {selectedContract && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedContract(null)}
          title={`Contract: ${selectedContract.contract.contract_number}`}
          maxWidth="3xl"
        >
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white">{selectedContract.contract.title}</h4>
                <StatusBadge status={selectedContract.contract.status} size="sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-400 pt-2 border-t border-slate-800 font-mono">
                <div>
                  <span>Supplier:</span>
                  <p className="font-bold text-white font-sans">{selectedContract.contract.supplier_name}</p>
                </div>
                <div>
                  <span>Total Value:</span>
                  <p className="font-bold text-emerald-400">${(selectedContract.contract.contract_value || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span>Start Date:</span>
                  <p className="font-bold text-slate-200">{selectedContract.contract.start_date}</p>
                </div>
                <div>
                  <span>End Date:</span>
                  <p className="font-bold text-slate-200">{selectedContract.contract.end_date}</p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Milestones & Deliverables</h4>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-850 border border-slate-800 overflow-hidden">
                {selectedContract.milestones?.map((m: any) => (
                  <div key={m.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">Milestone #{m.milestone_number}: {m.title}</p>
                      <p className="text-slate-400 mt-0.5">Due: {m.due_date}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={m.status} size="sm" />
                      <p className="font-mono font-bold text-emerald-400">${m.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amendments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Addendums & Amendments</h4>
                <button
                  onClick={() => setShowAmendmentModal(true)}
                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                >
                  + Add Amendment
                </button>
              </div>

              <div className="space-y-2">
                {selectedContract.amendments?.length > 0 ? (
                  selectedContract.amendments.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="font-bold text-blue-400">{a.amendment_number}</span>
                        <span className="text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-200">Reason: {a.reason}</p>
                      {a.value_change !== 0 && (
                        <p className="text-emerald-400 font-mono">Value Adjustment: +${a.value_change.toLocaleString()}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2">No amendments executed for this contract.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Amendment Modal */}
      {showAmendmentModal && selectedContract && (
        <Modal
          isOpen={true}
          onClose={() => setShowAmendmentModal(false)}
          title={`Contract Amendment: ${selectedContract.contract.contract_number}`}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Amendment Justification / Reason *</label>
              <textarea
                rows={3}
                placeholder="Scope expansion, timeline extension, or rate adjustment..."
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Value Change ($ USD)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={amendValue}
                  onChange={(e) => setAmendValue(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">New Extended End Date</label>
                <input
                  type="date"
                  value={amendDate}
                  onChange={(e) => setAmendDate(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAmendmentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAmendment}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Execute Amendment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

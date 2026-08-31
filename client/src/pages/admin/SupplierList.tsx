import React, { useState, useEffect } from 'react';
import { Building2, Eye, Ban, CheckCircle, Plus, ShieldAlert, TrendingUp, Search } from 'lucide-react';
import { api } from '../../api/client';
import { Supplier } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { SupplierRegistrationWizard } from '../../components/wizards/SupplierRegistrationWizard';

interface Props {
  onSelectSupplier: (supplierId: string) => void;
}

export const SupplierList: React.FC<Props> = ({ onSelectSupplier }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizardModal, setShowWizardModal] = useState(false);

  // Suspend action state
  const [suspendSupplierId, setSuspendSupplierId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const res = await api.getSuppliers();
      setSuppliers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendSupplierId || !suspendReason.trim()) {
      alert('Suspension reason is mandatory.');
      return;
    }
    try {
      await api.suspendSupplier(suspendSupplierId, { reason: suspendReason });
      setSuspendSupplierId(null);
      setSuspendReason('');
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend supplier');
    }
  };

  const handleReactivate = async (sId: string) => {
    if (!confirm('Are you sure you want to reactivate this supplier?')) return;
    try {
      await api.reactivateSupplier(sId, { reason: 'Reactivated by procurement administrator' });
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate');
    }
  };

  const columns: Column<Supplier>[] = [
    {
      header: 'Supplier Code & Legal Entity',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">{s.supplier_code}</span>
              <span className="text-[11px] text-slate-400 font-medium">({s.country})</span>
            </div>
            <p className="text-sm font-bold text-white tracking-tight">{s.legal_name}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (s) => <StatusBadge status={s.status} size="sm" />
    },
    {
      header: 'Risk Level',
      cell: (s) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            s.risk_rating === 'Low'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : s.risk_rating === 'Medium'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          <ShieldAlert className="w-3 h-3" /> {s.risk_rating} Risk
        </span>
      )
    },
    {
      header: 'Scorecard',
      cell: (s) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(100, s.performance_score || 85)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-slate-200">{s.performance_score || 85}%</span>
        </div>
      )
    },
    {
      header: 'Active Records',
      cell: (s) => (
        <div className="text-xs text-slate-400 font-mono">
          <span>{s.active_contracts_count || 0} Contracts</span> • <span>{s.po_count || 0} POs</span>
        </div>
      )
    },
    {
      header: 'Actions',
      cell: (s) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectSupplier(s.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
          >
            <Eye className="w-3.5 h-3.5" /> 360 View
          </button>

          {s.status === 'Suspended' ? (
            <button
              onClick={() => handleReactivate(s.id)}
              className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-colors"
              title="Reactivate Supplier"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setSuspendSupplierId(s.id)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
              title="Suspend Supplier"
            >
              <Ban className="w-4 h-4" />
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
          <h2 className="text-2xl font-black text-white tracking-tight">Suppliers Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Global approved vendor repository, qualification status, and performance tracking.
          </p>
        </div>

        <button
          onClick={() => setShowWizardModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Supplier</span>
        </button>
      </div>

      <DataTable
        title="All Registered Vendors"
        data={suppliers}
        columns={columns}
        searchPlaceholder="Search legal name, code, tax ID, registration..."
        statusFilterKey="status"
        statusOptions={['Active', 'Submitted', 'Under Review', 'Qualified', 'Suspended', 'Expired']}
      />

      {/* Supplier Registration Wizard Modal */}
      {showWizardModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowWizardModal(false)}
          title="Enroll Enterprise Supplier"
          maxWidth="4xl"
        >
          <SupplierRegistrationWizard
            onSuccess={() => {
              setShowWizardModal(false);
              loadSuppliers();
            }}
            onCancel={() => setShowWizardModal(false)}
          />
        </Modal>
      )}

      {/* Suspension Modal */}
      {suspendSupplierId && (
        <Modal
          isOpen={true}
          onClose={() => setSuspendSupplierId(null)}
          title="Confirm Supplier Suspension"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <p>
                Suspending this supplier will prevent them from participating in new tenders and bidding events.
                Existing contracts remain recorded in accordance with governance policy.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Suspension Reason (Mandatory) *</label>
              <textarea
                rows={3}
                placeholder="Specify non-compliance, expired certifications, or audit violation details..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSuspendSupplierId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

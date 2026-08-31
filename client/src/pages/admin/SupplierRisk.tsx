import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Eye, Edit3 } from 'lucide-react';
import { api } from '../../api/client';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const SupplierRisk: React.FC = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any | null>(null);

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      const res = await api.getRiskMatrix();
      setRisks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (r: any) => {
    setSelectedRisk(r);
    setEditFormData({
      financialScore: r.financial_score,
      complianceScore: r.compliance_score,
      operationalScore: r.operational_score,
      cybersecurityScore: r.cybersecurity_score,
      legalScore: r.legal_score,
      geographicScore: r.geographic_score,
      deliveryScore: r.delivery_score,
      qualityScore: r.quality_score,
      mitigationPlan: r.mitigation_plan || 'Active automated compliance audits and multi-vendor redundancy.',
      riskOwner: r.risk_owner || 'Global Vendor Risk Committee',
      reviewDate: r.review_date || '2026-12-31'
    });
  };

  const handleSaveRisk = async () => {
    if (!selectedRisk || !editFormData) return;
    try {
      await api.updateRiskMatrix(selectedRisk.supplier_id, editFormData);
      alert('Risk matrix and mitigation plan updated successfully!');
      setSelectedRisk(null);
      loadRisks();
    } catch (err: any) {
      alert(err.message || 'Failed to update risk');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Supplier Legal Entity',
      cell: (r) => (
        <div>
          <p className="font-bold text-white text-sm">{r.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{r.supplier_code} • {r.country}</span>
        </div>
      )
    },
    {
      header: 'Overall Risk Rating',
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            r.overall_risk_rating === 'Low'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : r.overall_risk_rating === 'Medium'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> {r.overall_risk_rating} Risk ({r.overall_risk_score}%)
        </span>
      )
    },
    {
      header: 'Cybersecurity',
      cell: (r) => <span className="font-mono text-xs text-slate-200">{r.cybersecurity_score}%</span>
    },
    {
      header: 'Financial Health',
      cell: (r) => <span className="font-mono text-xs text-slate-200">{r.financial_score}%</span>
    },
    {
      header: 'Compliance',
      cell: (r) => <span className="font-mono text-xs text-slate-200">{r.compliance_score}%</span>
    },
    {
      header: 'Mitigation Plan',
      cell: (r) => <span className="text-xs text-slate-400 truncate max-w-xs block">{r.mitigation_plan || 'Automated Auditing'}</span>
    },
    {
      header: 'Actions',
      cell: (r) => (
        <button
          onClick={() => handleOpenEdit(r)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
        >
          <Edit3 className="w-3.5 h-3.5" /> Assess Risk
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Supplier Risk Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise 8-category risk matrix (Financial, Compliance, Operational, Cybersecurity, Legal, Geographic, Delivery, Quality).
          </p>
        </div>
      </div>

      <DataTable
        title="Vendor Risk Matrix"
        data={risks}
        columns={columns}
        searchPlaceholder="Search supplier or country..."
      />

      {/* Edit Risk Modal */}
      {selectedRisk && editFormData && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRisk(null)}
          title={`Risk Assessment: ${selectedRisk.supplier_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-850 border border-slate-800 text-xs">
              {[
                { label: 'Financial', field: 'financialScore' },
                { label: 'Compliance', field: 'complianceScore' },
                { label: 'Operational', field: 'operationalScore' },
                { label: 'Cybersecurity', field: 'cybersecurityScore' },
                { label: 'Legal', field: 'legalScore' },
                { label: 'Geographic', field: 'geographicScore' },
                { label: 'Delivery', field: 'deliveryScore' },
                { label: 'Quality', field: 'qualityScore' }
              ].map((cat) => (
                <div key={cat.field}>
                  <label className="text-slate-400 font-medium text-[11px]">{cat.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData[cat.field]}
                    onChange={(e) => setEditFormData({ ...editFormData, [cat.field]: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Risk Mitigation Plan *</label>
              <textarea
                rows={3}
                value={editFormData.mitigationPlan}
                onChange={(e) => setEditFormData({ ...editFormData, mitigationPlan: e.target.value })}
                placeholder="Mitigation strategies, alternative sourcing options, insurance coverage..."
                className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedRisk(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRisk}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Save Risk Assessment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

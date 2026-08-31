import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Star, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const SupplierPerformance: React.FC = () => {
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    supplierId: '',
    period: '2026-Q2',
    deliveryScore: 92,
    qualityScore: 90,
    priceScore: 85,
    responsivenessScore: 88,
    complianceScore: 95,
    comments: 'Consistent on-time delivery with excellent quality inspection ratings.'
  });

  useEffect(() => {
    loadScorecards();
    api.getSuppliers().then((res) => setSuppliersList(res)).catch(() => {});
  }, []);

  const loadScorecards = async () => {
    try {
      const res = await api.getScorecards();
      setScorecards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScorecard = async () => {
    if (!formData.supplierId || !formData.period) {
      alert('Please select supplier and evaluation period');
      return;
    }
    try {
      await api.createScorecard(formData);
      alert('Scorecard recorded and supplier master rating updated!');
      setShowAddModal(false);
      loadScorecards();
    } catch (err: any) {
      alert(err.message || 'Failed to save scorecard');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Supplier Legal Entity',
      cell: (s) => (
        <div>
          <p className="font-bold text-white text-sm">{s.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{s.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Evaluation Period',
      accessorKey: 'period'
    },
    {
      header: 'Delivery (25%)',
      cell: (s) => <span className="font-mono text-xs text-slate-200">{s.delivery_score}%</span>
    },
    {
      header: 'Quality (25%)',
      cell: (s) => <span className="font-mono text-xs text-slate-200">{s.quality_score}%</span>
    },
    {
      header: 'Price (20%)',
      cell: (s) => <span className="font-mono text-xs text-slate-200">{s.price_competitiveness_score}%</span>
    },
    {
      header: 'Service (20%)',
      cell: (s) => <span className="font-mono text-xs text-slate-200">{s.responsiveness_score}%</span>
    },
    {
      header: 'Overall Score',
      cell: (s) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-blue-400 text-sm">{s.overall_score}%</span>
          <StatusBadge status={s.rating_status} size="sm" />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Supplier Performance Scorecards</h2>
          <p className="text-xs text-slate-400 mt-1">
            Weighted supplier performance evaluations across delivery, quality, price competitiveness, responsiveness, and compliance.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Supplier Evaluation</span>
        </button>
      </div>

      <DataTable
        title="Performance Scorecard Registry"
        data={scorecards}
        columns={columns}
        searchPlaceholder="Search supplier or period..."
      />

      {/* Add Scorecard Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)} title="Record Supplier Scorecard" maxWidth="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier *</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="">Select Supplier...</option>
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legal_name} ({s.supplier_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Review Period *</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-Q2"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
            </div>

            {/* Score sliders */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-850 border border-slate-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-bold">Delivery Performance (25% Weight)</span>
                <span className="font-mono font-bold text-blue-400">{formData.deliveryScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.deliveryScore}
                onChange={(e) => setFormData({ ...formData, deliveryScore: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-300 font-bold">Quality Inspection & Defect Rate (25% Weight)</span>
                <span className="font-mono font-bold text-blue-400">{formData.qualityScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.qualityScore}
                onChange={(e) => setFormData({ ...formData, qualityScore: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-300 font-bold">Price Competitiveness (20% Weight)</span>
                <span className="font-mono font-bold text-blue-400">{formData.priceScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.priceScore}
                onChange={(e) => setFormData({ ...formData, priceScore: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-300 font-bold">Responsiveness & Service (20% Weight)</span>
                <span className="font-mono font-bold text-blue-400">{formData.responsivenessScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.responsivenessScore}
                onChange={(e) => setFormData({ ...formData, responsivenessScore: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Comments & Improvement Feedback</label>
              <textarea
                rows={2}
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScorecard}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Save Scorecard
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

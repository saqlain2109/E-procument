import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { GoodsReceipt } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const GoodsReceipts: React.FC = () => {
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [posList, setPosList] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    poId: '',
    deliveryNumber: `DEL-${Date.now().toString().slice(-6)}`,
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: 'Goods inspected and verified in warehouse receiving dock',
    items: []
  });

  useEffect(() => {
    loadGRNs();
    api.getPOs().then((res) => setPosList(res)).catch(() => {});
  }, []);

  const loadGRNs = async () => {
    try {
      const res = await api.getGRNs();
      setGrns(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPO = async (poId: string) => {
    try {
      const poDetail = await api.getPODetail(poId);
      const mappedItems = poDetail.items.map((it: any) => ({
        poItemId: it.id,
        description: it.description,
        orderedQuantity: it.quantity,
        deliveredQuantity: it.quantity,
        acceptedQuantity: it.quantity,
        rejectedQuantity: 0,
        rejectionReason: ''
      }));

      setFormData((p: any) => ({
        ...p,
        poId,
        items: mappedItems
      }));
    } catch (e) {
      alert('Failed to load PO items');
    }
  };

  const handleCreateGRN = async () => {
    if (!formData.poId || formData.items.length === 0) {
      alert('Please select PO and inspect items');
      return;
    }
    try {
      await api.createGRN(formData);
      alert('Goods Receipt Note recorded successfully!');
      setShowCreateModal(false);
      loadGRNs();
    } catch (err: any) {
      alert(err.message || 'Failed to record GRN');
    }
  };

  const columns: Column<GoodsReceipt>[] = [
    {
      header: 'GRN Number & Ref',
      cell: (g) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{g.grn_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">Waybill: {g.delivery_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'PO Ref',
      cell: (g) => <span className="font-mono text-xs font-bold text-slate-200">{g.po_number}</span>
    },
    {
      header: 'Supplier',
      cell: (g) => (
        <div>
          <p className="font-bold text-white text-xs">{g.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{g.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Receipt Date',
      cell: (g) => <span className="text-xs text-slate-400 font-mono">{g.delivery_date}</span>
    },
    {
      header: 'Inspection Status',
      cell: (g) => <StatusBadge status={g.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Goods Receipt Notes (GRN)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Log receiving dock inspections, record accepted vs rejected shipment quantities, and support partial delivery.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record Goods Receipt (GRN)</span>
        </button>
      </div>

      <DataTable
        title="Warehouse Receipts"
        data={grns}
        columns={columns}
        searchPlaceholder="Search GRN, waybill, supplier, PO..."
      />

      {/* Create GRN Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Record Goods Receipt Note" maxWidth="3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Select Purchase Order *</label>
                <select
                  value={formData.poId}
                  onChange={(e) => handleSelectPO(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="">Select PO...</option>
                  {posList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number} ({p.supplier_name} - ${p.grand_total.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Waybill / Delivery Note Number *</label>
                <input
                  type="text"
                  value={formData.deliveryNumber}
                  onChange={(e) => setFormData({ ...formData, deliveryNumber: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Delivery Date</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Inspection Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            {/* Inspect Line Items */}
            {formData.items.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Dock Inspection & Quantities</h4>
                <div className="space-y-3">
                  {formData.items.map((it: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
                      <p className="font-bold text-white text-sm">{it.description}</p>
                      <div className="grid grid-cols-3 gap-3 font-mono">
                        <div>
                          <label className="text-slate-400 text-[11px]">Ordered Qty</label>
                          <input
                            type="number"
                            disabled
                            value={it.orderedQuantity}
                            className="mt-1 w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="text-slate-300 text-[11px]">Accepted Qty</label>
                          <input
                            type="number"
                            value={it.acceptedQuantity}
                            onChange={(e) => {
                              const upd = [...formData.items];
                              upd[idx].acceptedQuantity = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, items: upd });
                            }}
                            className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-slate-300 text-[11px]">Rejected Qty</label>
                          <input
                            type="number"
                            value={it.rejectedQuantity}
                            onChange={(e) => {
                              const upd = [...formData.items];
                              upd[idx].rejectedQuantity = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, items: upd });
                            }}
                            className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-rose-400 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGRN}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Save Goods Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

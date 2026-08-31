import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Eye, Calendar, DollarSign, Truck, Receipt } from 'lucide-react';
import { api } from '../../api/client';
import { PurchaseOrder } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const PurchaseOrders: React.FC = () => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    supplierId: '',
    deliveryAddress: 'Main Enterprise Logistics Warehouse, Bay 12',
    deliveryDate: '2026-10-15',
    paymentTerms: 'Net 30 Days',
    items: [
      { description: 'High-Density Compute Blade Unit', quantity: 10, unit: 'Units', unitPrice: 12500, taxRate: 10 }
    ]
  });

  useEffect(() => {
    loadPOs();
    api.getSuppliers().then((res) => setSuppliersList(res)).catch(() => {});
  }, []);

  const loadPOs = async () => {
    try {
      const res = await api.getPOs();
      setPOs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewPODetail = async (id: string) => {
    try {
      const res = await api.getPODetail(id);
      setSelectedPO(res);
    } catch (e) {
      alert('Failed to load PO detail');
    }
  };

  const handleCreatePO = async (isDraft = false) => {
    if (!formData.supplierId || !formData.items || formData.items.length === 0) {
      alert('Please select supplier and add line items');
      return;
    }
    try {
      await api.createPO({ ...formData, isDraft });
      setShowCreateModal(false);
      loadPOs();
    } catch (err: any) {
      alert(err.message || 'Failed to create PO');
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    {
      header: 'PO Ref Number',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{p.po_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">Date: {new Date(p.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Supplier',
      cell: (p) => (
        <div>
          <p className="font-bold text-white text-xs">{p.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{p.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Grand Total',
      cell: (p) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${(p.grand_total || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Target Delivery',
      cell: (p) => <span className="text-xs text-slate-400 font-mono">{p.delivery_date}</span>
    },
    {
      header: 'Execution Status',
      cell: (p) => <StatusBadge status={p.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (p) => (
        <button
          onClick={() => viewPODetail(p.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
        >
          <Eye className="w-3.5 h-3.5" /> Details
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Purchase Orders (PO)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate commitments, monitor supplier acknowledgement, delivery progress, and 3-way match status.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      <DataTable
        title="Purchase Orders"
        data={pos}
        columns={columns}
        searchPlaceholder="Search PO number, supplier..."
        statusFilterKey="status"
        statusOptions={['Draft', 'Approval', 'Approved', 'Sent to Supplier', 'Supplier Accepted', 'Partially Delivered', 'Completed']}
      />

      {/* Create PO Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="New Purchase Order" maxWidth="3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier Authority *</label>
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
                <label className="text-xs font-semibold text-slate-400">Delivery Target Date</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400">Delivery Address</label>
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Contracted Items</h4>
              {formData.items.map((it: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].description = e.target.value;
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-6 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].quantity = parseFloat(e.target.value);
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={it.unitPrice}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].unitPrice = parseFloat(e.target.value);
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-4 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              ))}
            </div>

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
                onClick={() => handleCreatePO(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Submit Purchase Order
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <Modal isOpen={true} onClose={() => setSelectedPO(null)} title={`PO Details: ${selectedPO.po.po_number}`} maxWidth="3xl">
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-sm">{selectedPO.po.supplier_name}</p>
                <p className="text-slate-400">Delivery: {selectedPO.po.delivery_date} • {selectedPO.po.delivery_address}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedPO.po.status} size="sm" />
                <p className="font-mono font-bold text-emerald-400 text-base mt-1">${selectedPO.po.grand_total.toLocaleString()}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="rounded-xl border border-slate-700/80 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5">Ordered Qty</th>
                    <th className="px-4 py-2.5">Delivered</th>
                    <th className="px-4 py-2.5">Unit Price</th>
                    <th className="px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedPO.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-bold text-white">{it.description}</td>
                      <td className="px-4 py-2.5 font-mono">{it.quantity} {it.unit}</td>
                      <td className="px-4 py-2.5 font-mono text-blue-400">{it.delivered_quantity || 0}</td>
                      <td className="px-4 py-2.5 font-mono">${it.unit_price.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">${it.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

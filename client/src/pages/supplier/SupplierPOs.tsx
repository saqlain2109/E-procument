import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, XCircle, Eye, DollarSign, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { PurchaseOrder } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const SupplierPOs: React.FC = () => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [rejectPOId, setRejectPOId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPOs();
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

  const handleAcknowledge = async (id: string, action: 'Accept' | 'Reject') => {
    if (action === 'Reject' && !rejectionReason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    try {
      await api.acknowledgePO(id, { action, reason: rejectionReason });
      alert(`Purchase order ${action === 'Accept' ? 'accepted' : 'rejected'} successfully!`);
      setRejectPOId(null);
      setRejectionReason('');
      loadPOs();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const viewPODetail = async (id: string) => {
    try {
      const res = await api.getPODetail(id);
      setSelectedPO(res);
    } catch (e) {
      alert('Failed to load PO details');
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
      header: 'Status',
      cell: (p) => <StatusBadge status={p.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (p) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewPODetail(p.id)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            Inspect Items
          </button>

          {p.status === 'Sent to Supplier' && (
            <>
              <button
                onClick={() => handleAcknowledge(p.id, 'Accept')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept PO
              </button>
              <button
                onClick={() => setRejectPOId(p.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm"
              >
                <XCircle className="w-3.5 h-3.5" /> Decline
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Purchase Orders (PO)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review dispatched purchase orders, confirm acknowledgement, and coordinate delivery shipments.
        </p>
      </div>

      <DataTable
        title="Dispatched Orders"
        data={pos}
        columns={columns}
        searchPlaceholder="Search PO number..."
      />

      {/* Decline PO Modal */}
      {rejectPOId && (
        <Modal isOpen={true} onClose={() => setRejectPOId(null)} title="Decline Purchase Order">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Decline Reason (Mandatory) *</label>
              <textarea
                rows={3}
                placeholder="Stock unavailable, capacity constraints, delivery timeline conflict..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setRejectPOId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcknowledge(rejectPOId, 'Reject')}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <Modal isOpen={true} onClose={() => setSelectedPO(null)} title={`Purchase Order: ${selectedPO.po.po_number}`} maxWidth="3xl">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white text-sm">Delivery Location: {selectedPO.po.delivery_address}</p>
                <p className="text-slate-400">Target Date: {selectedPO.po.delivery_date}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedPO.po.status} size="sm" />
                <p className="font-mono font-bold text-emerald-400 text-base mt-1">${selectedPO.po.grand_total.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Unit Price</th>
                    <th className="px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedPO.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-bold text-white">{it.description}</td>
                      <td className="px-4 py-2.5 font-mono">{it.quantity} {it.unit}</td>
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

import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Eye, DollarSign, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { Invoice } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const SupplierInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [posList, setPosList] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    poId: '',
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    taxRate: 10,
    items: []
  });

  useEffect(() => {
    loadInvoices();
    api.getPOs().then((res) => {
      setPosList(res.filter((p) => p.status === 'Supplier Accepted' || p.status === 'Partially Delivered' || p.status === 'Completed'));
    }).catch(() => {});
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await api.getInvoices();
      setInvoices(res);
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
        quantity: it.quantity,
        unitPrice: it.unit_price,
        taxRate: 10
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

  const handleCreateInvoice = async () => {
    if (!formData.poId || formData.items.length === 0) {
      alert('Please select PO and verify items');
      return;
    }
    try {
      await api.createInvoice(formData);
      alert('Invoice submitted for automated 3-way matching!');
      setShowCreateModal(false);
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to submit invoice');
    }
  };

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice Number & PO',
      cell: (inv) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{inv.invoice_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">against PO {inv.po_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Billed Amount',
      cell: (inv) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${inv.total_amount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Due Date',
      cell: (inv) => <span className="text-xs text-slate-400 font-mono">{inv.due_date}</span>
    },
    {
      header: '3-Way Verification',
      cell: (inv) => <StatusBadge status={inv.matching_status} size="sm" />
    },
    {
      header: 'Payment Status',
      cell: (inv) => <StatusBadge status={inv.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Invoices & Accounts Receivable</h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit e-invoices against accepted purchase orders and track real-time automated 3-way matching status.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Submit New Invoice</span>
        </button>
      </div>

      <DataTable
        title="Submitted Invoices"
        data={invoices}
        columns={columns}
        searchPlaceholder="Search invoice number, PO..."
      />

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Submit Commercial Invoice" maxWidth="3xl">
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
                      {p.po_number} (${p.grand_total.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Payment Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            {formData.items.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Billed Line Items</h4>
                <div className="space-y-3">
                  {formData.items.map((it: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 grid grid-cols-12 gap-3 items-center text-xs">
                      <div className="col-span-6 font-bold text-white">{it.description}</div>
                      <div className="col-span-2">
                        <label className="text-slate-400 text-[10px]">Qty</label>
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => {
                            const upd = [...formData.items];
                            upd[idx].quantity = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, items: upd });
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-slate-200"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-slate-400 text-[10px]">Unit Price ($)</label>
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) => {
                            const upd = [...formData.items];
                            upd[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, items: upd });
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-emerald-400 font-bold"
                        />
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
                onClick={handleCreateInvoice}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Submit Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

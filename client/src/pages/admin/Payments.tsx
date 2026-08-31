import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Eye, CheckCircle2, DollarSign, Calendar, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { Payment } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  const [formData, setFormData] = useState<any>({
    invoiceId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Wire Transfer',
    paymentReference: `FEDWIRE-${Math.floor(100000000 + Math.random() * 900000000)}`,
    notes: 'Approved accounts payable automated release'
  });

  useEffect(() => {
    loadPayments();
    api.getInvoices().then((res) => {
      setInvoicesList(res.filter((inv) => inv.status === 'Approved' || inv.matching_status === 'Matched'));
    }).catch(() => {});
  }, []);

  const loadPayments = async () => {
    try {
      const res = await api.getPayments();
      setPayments(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = (invId: string) => {
    const inv = invoicesList.find((i) => i.id === invId);
    setFormData((p: any) => ({
      ...p,
      invoiceId: invId,
      amount: inv?.total_amount || 0
    }));
  };

  const handleDisbursePayment = async () => {
    if (!formData.invoiceId || formData.amount <= 0) {
      alert('Please select approved invoice');
      return;
    }
    try {
      await api.processPayment(formData);
      alert('Payment disbursed and marked as Completed!');
      setShowPayModal(false);
      loadPayments();
    } catch (err: any) {
      alert(err.message || 'Payment execution failed');
    }
  };

  const columns: Column<Payment>[] = [
    {
      header: 'Payment Ref & Voucher',
      cell: (py) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-emerald-400">{py.payment_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">Ref: {py.payment_reference}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Invoice Billed',
      cell: (py) => <span className="font-mono text-xs font-bold text-blue-400">{py.invoice_number}</span>
    },
    {
      header: 'Supplier',
      cell: (py) => (
        <div>
          <p className="font-bold text-white text-xs">{py.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{py.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Amount Disbursed',
      cell: (py) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${py.amount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Method',
      cell: (py) => <span className="text-xs text-slate-300 font-medium">{py.payment_method}</span>
    },
    {
      header: 'Execution Date',
      cell: (py) => <span className="text-xs text-slate-400 font-mono">{py.payment_date}</span>
    },
    {
      header: 'Status',
      cell: (py) => <StatusBadge status={py.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Finance Disbursements & Payments</h2>
          <p className="text-xs text-slate-400 mt-1">
            Execute payments against 3-way matched & approved invoices, track disbursement references, and generate remittance receipts.
          </p>
        </div>

        <button
          onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Disburse Payment</span>
        </button>
      </div>

      <DataTable
        title="Disbursement Ledger"
        data={payments}
        columns={columns}
        searchPlaceholder="Search payment ref, voucher, invoice, supplier..."
      />

      {/* Disburse Payment Modal */}
      {showPayModal && (
        <Modal isOpen={true} onClose={() => setShowPayModal(false)} title="Execute Invoice Payment" maxWidth="md">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Select Matched Invoice *</label>
              <select
                value={formData.invoiceId}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="">Select Invoice...</option>
                {invoicesList.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.supplier_name} - ${inv.total_amount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Amount ($ USD)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="Wire Transfer">Wire Transfer (SWIFT/ACH)</option>
                  <option value="Direct ACH">Direct ACH Deposit</option>
                  <option value="Corporate Card">Corporate Virtual Card</option>
                  <option value="Check">Check / Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Bank Wire / EFT Reference Number *</label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisbursePayment}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
              >
                Disburse Payment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

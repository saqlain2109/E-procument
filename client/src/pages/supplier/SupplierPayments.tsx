import React, { useState, useEffect } from 'react';
import { CreditCard, Eye, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { Payment } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SupplierPayments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
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

  const columns: Column<Payment>[] = [
    {
      header: 'Payment Voucher & Ref',
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
      header: 'Invoice Number',
      cell: (py) => <span className="font-mono text-xs font-bold text-blue-400">{py.invoice_number}</span>
    },
    {
      header: 'Amount Received',
      cell: (py) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${py.amount.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Disbursement Method',
      cell: (py) => <span className="text-xs text-slate-300 font-medium">{py.payment_method}</span>
    },
    {
      header: 'Payment Date',
      cell: (py) => <span className="text-xs text-slate-400 font-mono">{py.payment_date}</span>
    },
    {
      header: 'Status',
      cell: (py) => <StatusBadge status={py.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Payments & Remittance Advice</h2>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of electronic fund transfers, bank wire confirmations, and payment remittance vouchers.
        </p>
      </div>

      <DataTable
        title="Remittance Ledger"
        data={payments}
        columns={columns}
        searchPlaceholder="Search payment ref, invoice..."
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { FileSignature, Eye, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { Contract } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SupplierContracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

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
      header: 'Contract Value',
      cell: (c) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${(c.contract_value || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Effective Duration',
      cell: (c) => <span className="text-xs text-slate-300 font-mono">{c.start_date} to {c.end_date}</span>
    },
    {
      header: 'Status',
      cell: (c) => <StatusBadge status={c.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Active Legal Contracts</h2>
        <p className="text-xs text-slate-400 mt-1">
          Executed procurement master agreements, milestones, and deliverable commitments.
        </p>
      </div>

      <DataTable
        title="My Contracts"
        data={contracts}
        columns={columns}
        searchPlaceholder="Search contract number, title..."
      />
    </div>
  );
};

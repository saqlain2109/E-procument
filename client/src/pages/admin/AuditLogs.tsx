import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { DataTable, Column } from '../../components/common/DataTable';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await api.getAuditLogs({ limit: 200 });
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Timestamp & IP',
      cell: (l) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-200">{new Date(l.timestamp).toLocaleString()}</span>
          <p className="text-[10px] text-slate-500 font-mono">IP: {l.ip_address}</p>
        </div>
      )
    },
    {
      header: 'Actor & Role',
      cell: (l) => (
        <div>
          <p className="font-bold text-white text-xs">{l.user_email || 'System'}</p>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">{l.user_role}</span>
        </div>
      )
    },
    {
      header: 'Action Executed',
      cell: (l) => (
        <span className="font-mono text-xs font-bold text-amber-400">
          {l.action}
        </span>
      )
    },
    {
      header: 'Module Target',
      cell: (l) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
          {l.module}
        </span>
      )
    },
    {
      header: 'Audit Comments & Details',
      cell: (l) => (
        <p className="text-xs text-slate-300 max-w-md truncate" title={l.comments || ''}>
          {l.comments || 'Standard transaction recorded'}
        </p>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Tamper-Evident Audit Logs</h2>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
              <Lock className="w-3 h-3" /> Immutable Traceability
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail recording user identity, role authority, IP address, state mutations, and timestamps across the entire procurement lifecycle.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold text-slate-200"
        >
          Refresh Logs
        </button>
      </div>

      <DataTable
        title="Audit Event Ledger"
        data={logs}
        columns={columns}
        searchPlaceholder="Search user, action, module, record ID..."
        statusFilterKey="module"
        statusOptions={['AUTH', 'SUPPLIER', 'PURCHASE_REQUISITION', 'TENDER', 'BID', 'AWARD', 'PURCHASE_ORDER', 'INVOICE', 'WORKFLOW_CONFIG']}
      />
    </div>
  );
};

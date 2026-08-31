import React, { useState, useEffect } from 'react';
import { FileCheck, Lock, CheckCircle2, Eye, Calendar, DollarSign } from 'lucide-react';
import { api } from '../../api/client';
import { Bid } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export const MyBids: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = async () => {
    try {
      const res = await api.getMyBids();
      setBids(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Bid>[] = [
    {
      header: 'Bid Ref & Event',
      cell: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{b.bid_number}</span>
            <p className="text-sm font-bold text-white tracking-tight">{b.event_title}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Acknowledgement Code',
      cell: (b) => (
        <span className="font-mono text-xs text-slate-300 font-bold px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
          {b.acknowledgement_code}
        </span>
      )
    },
    {
      header: 'Submitted Price',
      cell: (b) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${(b.total_bid_amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Submitted On',
      cell: (b) => (
        <span className="text-xs text-slate-400 font-mono">
          {b.submission_timestamp ? new Date(b.submission_timestamp).toLocaleString() : '—'}
        </span>
      )
    },

    {
      header: 'Status',
      cell: (b) => <StatusBadge status={b.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">My Submitted Bids</h2>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of all sealed quotations, acknowledgement keys, and evaluation outcomes.
        </p>
      </div>

      <DataTable
        title="Submitted Proposals"
        data={bids}
        columns={columns}
        searchPlaceholder="Search bid number, acknowledgement code..."
        statusFilterKey="status"
        statusOptions={['Draft', 'Submitted', 'Evaluated', 'Awarded', 'Disqualified']}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { FolderLock, Calendar, DollarSign, ArrowRight, Eye, Search, Filter } from 'lucide-react';
import { api } from '../../api/client';
import { ProcurementEvent } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

interface Props {
  onSelectTenderForBidding: (tenderId: string) => void;
}

export const Opportunities: React.FC<Props> = ({ onSelectTenderForBidding }) => {
  const [tenders, setTenders] = useState<ProcurementEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenders();
  }, []);

  const loadTenders = async () => {
    try {
      const res = await api.getTenders();
      setTenders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<ProcurementEvent>[] = [
    {
      header: 'Event Ref & Title',
      cell: (t) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mt-0.5">
            <FolderLock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">{t.event_number}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{t.event_type}</span>
            </div>
            <p className="text-sm font-bold text-white tracking-tight mt-0.5">{t.title}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'procurement_category'
    },
    {
      header: 'Estimated Budget',
      cell: (t) => (
        <span className="font-mono text-xs font-bold text-emerald-400">
          ${(t.estimated_budget || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Submission Deadline',
      cell: (t) => (
        <div className="text-xs text-amber-400 font-mono flex items-center gap-1 font-bold">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(t.bid_submission_deadline).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (t) => (
        <button
          onClick={() => onSelectTenderForBidding(t.id)}
          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
        >
          <span>Participate & Bid</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sourcing Opportunities & Tenders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse active public tenders and invited RFQs, download technical specifications, and submit encrypted sealed bids.
          </p>
        </div>
      </div>

      <DataTable
        title="Open Procurement Events"
        data={tenders}
        columns={columns}
        searchPlaceholder="Search event number, title, category..."
      />
    </div>
  );
};

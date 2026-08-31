import React, { useState, useEffect } from 'react';
import {
  Building2,
  FolderLock,
  FileCheck,
  Award,
  ShoppingCart,
  Receipt,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';

interface Props {
  onNavigate: (tab: string, contextId?: string) => void;
}

export const SupplierDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.getSupplierDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Loading supplier workspace...</p>
      </div>
    );
  }

  const { supplier, kpis, openTenders, myRecentBids } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Supplier Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-slate-850 to-slate-900 border border-blue-500/20 p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                Supplier Command Center
              </span>
              <StatusBadge status={kpis.registrationStatus} size="sm" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">{supplier?.legal_name || 'Enterprise Supplier'}</h2>
            <p className="text-sm text-slate-300 font-mono">Vendor Code: {supplier?.supplier_code} • Country: {supplier?.country}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('supplier-opportunities')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <FolderLock className="w-4 h-4" />
              <span>Explore Open Tenders ({kpis.openOpportunitiesCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Open Opportunities"
          value={kpis.openOpportunitiesCount}
          subtext="Available RFQs & Tenders"
          icon={FolderLock}
          accentColor="blue"
          onClick={() => onNavigate('supplier-opportunities')}
        />
        <MetricCard
          title="Submitted Sealed Bids"
          value={kpis.submittedBidsCount}
          subtext="Under evaluation"
          icon={FileCheck}
          accentColor="purple"
          onClick={() => onNavigate('supplier-bids')}
        />
        <MetricCard
          title="Active Purchase Orders"
          value={kpis.purchaseOrdersCount}
          subtext={`${kpis.pendingDeliveriesCount} pending fulfillment`}
          icon={ShoppingCart}
          accentColor="emerald"
          onClick={() => onNavigate('supplier-pos')}
        />
        <MetricCard
          title="Total Payments Received"
          value={`$${(kpis.totalPaymentsReceived / 1000).toFixed(0)}k`}
          subtext="Disbursed remittance"
          icon={CreditCard}
          accentColor="amber"
          onClick={() => onNavigate('supplier-payments')}
        />
      </div>

      {/* Main Grid: Open Sourcing Events & My Bids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Open Opportunities */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active Sourcing Opportunities</h3>
              <p className="text-xs text-slate-400">Tenders, RFQs, and RFPs currently open for bid submission</p>
            </div>
            <button
              onClick={() => onNavigate('supplier-opportunities')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {openTenders?.map((t: any) => (
              <div key={t.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{t.event_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                      {t.event_type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white max-w-sm truncate">{t.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Deadline: <strong className="text-amber-400">{new Date(t.bid_submission_deadline).toLocaleString()}</strong>
                  </p>
                </div>

                <div className="text-right whitespace-nowrap space-y-2">
                  <p className="font-mono font-bold text-emerald-400 text-xs">${(t.estimated_budget || 0).toLocaleString()}</p>
                  <button
                    onClick={() => onNavigate('supplier-bid-submit', t.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm"
                  >
                    Submit Bid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Recent Bids */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">My Recent Bids</h3>
              <p className="text-xs text-slate-400">Sealed submissions and outcomes</p>
            </div>
            <button
              onClick={() => onNavigate('supplier-bids')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              All Bids <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {myRecentBids?.length > 0 ? (
              myRecentBids.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400">{b.bid_number}</span>
                    <p className="text-xs font-bold text-white truncate max-w-[200px]">{b.event_title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Ack: {b.acknowledgement_code}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <StatusBadge status={b.status} size="sm" />
                    <p className="font-mono font-bold text-emerald-400 text-xs">${(b.total_bid_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No bids submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

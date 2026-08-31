import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  FolderLock,
  FileCheck,
  FileSignature,
  Receipt,
  Inbox,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../../api/client';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';

interface Props {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.getAdminDashboard();
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
        <p className="text-sm font-semibold">Loading enterprise analytics dashboard...</p>
      </div>
    );
  }

  const { kpis, spendByCategory, suppliersByStatus, monthlySpend, recentEvents, recentApprovals } = data;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
                Enterprise Sourcing Platform
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">Global Procurement Control Tower</h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time multi-tier approval governance, 3-way invoice matching, dynamic evaluation matrices, and supplier risk intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('approvals')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <Inbox className="w-4 h-4" />
              <span>Approval Center ({kpis.pendingApprovals})</span>
            </button>
            <button
              onClick={() => onNavigate('tenders')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-xs transition-all"
            >
              <FolderLock className="w-4 h-4 text-blue-400" />
              <span>New RFQ / Tender</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Contracted Value"
          value={`$${(kpis.totalPoValue / 1000).toFixed(0)}k`}
          subtext="Active PO Commitments"
          icon={DollarSign}
          accentColor="blue"
          trend={{ value: '+14.2% vs last quarter', isPositive: true }}
          onClick={() => onNavigate('pos')}
        />
        <MetricCard
          title="Active Sourcing Events"
          value={kpis.activeTenders}
          subtext={`${kpis.closingSoon} closing this week`}
          icon={FolderLock}
          accentColor="purple"
          onClick={() => onNavigate('tenders')}
        />
        <MetricCard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          subtext="Requiring executive review"
          icon={Inbox}
          accentColor="amber"
          trend={{ value: 'Action Required', isPositive: false }}
          onClick={() => onNavigate('approvals')}
        />
        <MetricCard
          title="Approved Suppliers"
          value={kpis.approvedSuppliers}
          subtext={`Avg Rating: ${kpis.avgSupplierScore}%`}
          icon={Building2}
          accentColor="emerald"
          onClick={() => onNavigate('suppliers')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Procurement Trends */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-slate-850/60 border border-slate-800 backdrop-blur-sm shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Monthly Procurement Spend & Cash Outflow</h3>
              <p className="text-xs text-slate-400">PO commitments vs Invoiced vs Disbursed Payments</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-blue-400 border border-slate-700">
              FY 2026
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend}>
                <defs>
                  <linearGradient id="poGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="payGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any) => [`$${val.toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="poSpend" name="PO Commitments" stroke="#3b82f6" fill="url(#poGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="paid" name="Disbursed Payments" stroke="#10b981" fill="url(#payGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suppliers by Status Distribution */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-850/60 border border-slate-800 backdrop-blur-sm shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Supplier Ecosystem</h3>
            <p className="text-xs text-slate-400">Total {kpis.totalSuppliers} vendors across qualification tiers</p>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={suppliersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {suppliersByStatus.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">{kpis.totalSuppliers}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Suppliers</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            {suppliersByStatus.map((st: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-300 font-medium truncate">{st.status}:</span>
                <span className="text-white font-bold">{st.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spend By Category & Recent Sourcing Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spend by Category Bar */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-850/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Spend by Category</h3>
              <p className="text-xs text-slate-400">Allocated procurement demand</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Full Breakdown <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByCategory} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} width={120} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  formatter={(val: any) => [`$${val.toLocaleString()}`, 'Estimated Spend']}
                />
                <Bar dataKey="spend" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Active Sourcing Events */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-850/60 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Active Sourcing Events</h3>
              <p className="text-xs text-slate-400">Published RFQs, RFPs, and sealed tenders</p>
            </div>
            <button
              onClick={() => onNavigate('tenders')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All ({kpis.activeTenders}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {recentEvents.map((evt: any) => (
              <div key={evt.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{evt.event_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{evt.event_type}</span>
                  </div>
                  <p className="text-xs font-bold text-white max-w-sm truncate">{evt.title}</p>
                </div>

                <div className="text-right whitespace-nowrap space-y-1">
                  <StatusBadge status={evt.status} size="sm" />
                  <p className="text-[11px] font-bold text-emerald-400">${(evt.estimated_budget || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  FileCheck,
  Award,
  FileSignature,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Inbox,
  BarChart3,
  GitFork,
  Database,
  History,
  FolderLock,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTasksCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  pendingTasksCount = 0,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { user } = useAuth();
  const isSupplier = user?.role === 'Supplier';

  const adminMenuGroups = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'approvals', label: 'Approval Center', icon: Inbox, badge: pendingTasksCount }
      ]
    },
    {
      group: 'Supplier Management',
      items: [
        { id: 'suppliers', label: 'Suppliers Directory', icon: Building2 },
        { id: 'supplier-performance', label: 'Scorecards', icon: TrendingUp },
        { id: 'supplier-risk', label: 'Risk & Compliance', icon: ShieldAlert }
      ]
    },
    {
      group: 'Sourcing & Procurement',
      items: [
        { id: 'requisitions', label: 'Purchase Requests', icon: FileText },
        { id: 'tenders', label: 'RFQs, RFPs & Tenders', icon: FolderLock },
        { id: 'evaluations', label: 'Evaluation Workspace', icon: FileCheck },
        { id: 'awards', label: 'Award Management', icon: Award }
      ]
    },
    {
      group: 'Post-Award Execution',
      items: [
        { id: 'contracts', label: 'Contracts', icon: FileSignature },
        { id: 'pos', label: 'Purchase Orders', icon: ShoppingCart },
        { id: 'grns', label: 'Deliveries / GRN', icon: Truck },
        { id: 'invoices', label: 'Invoices & 3-Way Match', icon: Receipt },
        { id: 'payments', label: 'Disbursements', icon: CreditCard }
      ]
    },
    {
      group: 'Administration & Config',
      items: [
        ...(user?.role === 'Super Administrator'
          ? [{ id: 'users', label: 'User & Access Master', icon: Users }]
          : []),
        { id: 'workflows', label: 'Workflow Engine', icon: GitFork },
        { id: 'master-data', label: 'Master Data & Settings', icon: Database },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'audit', label: 'Tamper-Evident Audit', icon: History }
      ]
    }
  ];

  const supplierMenuItems = [
    { id: 'supplier-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'supplier-profile', label: 'My 360 Profile', icon: Building2 },
    { id: 'supplier-opportunities', label: 'Opportunities & Tenders', icon: FolderLock },
    { id: 'supplier-bids', label: 'My Sealed Bids', icon: FileCheck },
    { id: 'supplier-contracts', label: 'Contracts & Milestones', icon: FileSignature },
    { id: 'supplier-pos', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'supplier-deliveries', label: 'Shipment / GRN', icon: Truck },
    { id: 'supplier-invoices', label: 'Invoices (3-Way Match)', icon: Receipt },
    { id: 'supplier-payments', label: 'Payments & Remittance', icon: CreditCard },
    { id: 'supplier-documents', label: 'Compliance & Expiry', icon: ShieldAlert }
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const menuContent = (
    <div className="flex flex-col h-full bg-slate-900 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 flex-shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white uppercase">Procurify</h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase">
              {isSupplier ? 'Supplier Portal' : 'Enterprise Suite'}
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {isSupplier ? (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Supplier Navigation</p>
            {supplierMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </button>
              );
            })}
          </div>
        ) : (
          adminMenuGroups.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{grp.group}</p>
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                        {item.badge}
                      </span>
                    )}

                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-850/50">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase border border-slate-600 flex-shrink-0">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (lg and up) */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex-col h-full select-none">
        {menuContent}
      </aside>

      {/* 2. Mobile Responsive Drawer (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Slide-over Menu Panel */}
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {menuContent}
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Login } from './pages/auth/Login';
import { RegisterSupplier } from './pages/auth/RegisterSupplier';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { SupplierList } from './pages/admin/SupplierList';
import { Supplier360 } from './pages/admin/Supplier360';
import { ApprovalCenter } from './pages/admin/ApprovalCenter';
import { PurchaseRequisitions } from './pages/admin/PurchaseRequisitions';
import { TenderManagement } from './pages/admin/TenderManagement';
import { TenderDetail } from './pages/admin/TenderDetail';
import { BidEvaluationWorkspace } from './pages/admin/BidEvaluationWorkspace';
import { AwardManagement } from './pages/admin/AwardManagement';
import { ContractManagement } from './pages/admin/ContractManagement';
import { PurchaseOrders } from './pages/admin/PurchaseOrders';
import { GoodsReceipts } from './pages/admin/GoodsReceipts';
import { Invoices3WayMatch } from './pages/admin/Invoices3WayMatch';
import { Payments } from './pages/admin/Payments';
import { SupplierPerformance } from './pages/admin/SupplierPerformance';
import { SupplierRisk } from './pages/admin/SupplierRisk';
import { WorkflowAdmin } from './pages/admin/WorkflowAdmin';
import { MasterDataAdmin } from './pages/admin/MasterDataAdmin';
import { ReportsAnalytics } from './pages/admin/ReportsAnalytics';
import { AuditLogs } from './pages/admin/AuditLogs';
import { UserManagementAdmin } from './pages/admin/UserManagementAdmin';


// Supplier Pages
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { Opportunities } from './pages/supplier/Opportunities';
import { TenderBidSubmit } from './pages/supplier/TenderBidSubmit';
import { MyBids } from './pages/supplier/MyBids';
import { SupplierContracts } from './pages/supplier/SupplierContracts';
import { SupplierPOs } from './pages/supplier/SupplierPOs';
import { SupplierDeliveries } from './pages/supplier/SupplierDeliveries';
import { SupplierInvoices } from './pages/supplier/SupplierInvoices';
import { SupplierPayments } from './pages/supplier/SupplierPayments';
import { SupplierDocuments } from './pages/supplier/SupplierDocuments';
import { SupplierProfile } from './pages/supplier/SupplierProfile';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [showAuthRegister, setShowAuthRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Drill-down contexts
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [selectedEvaluationTenderId, setSelectedEvaluationTenderId] = useState<string | null>(null);
  const [bidSubmitTenderId, setBidSubmitTenderId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showAuthRegister) {
      return <RegisterSupplier onBackToLogin={() => setShowAuthRegister(false)} />;
    }
    return <Login onRegisterClick={() => setShowAuthRegister(true)} />;
  }

  const isSupplier = user.role_id === 'ROLE-SUPPLIER' || !!user.supplier_id;

  // Custom Navigation Handler
  const handleNavigate = (tab: string, contextId?: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (tab === 'supplier-bid-submit' && contextId) {
      setBidSubmitTenderId(contextId);
    }
    if (tab === 'tenders' && !contextId) {
      setSelectedTenderId(null);
    }
    if (tab === 'suppliers' && !contextId) {
      setSelectedSupplierId(null);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab: string) => {
          handleNavigate(tab);
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Topbar
          onNavigateToTab={(tab: string) => handleNavigate(tab)}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />




        {/* Dynamic Page Router */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ADMIN PORTAL ROUTES */}
          {!isSupplier && (
            <>
              {activeTab === 'dashboard' && <AdminDashboard onNavigate={handleNavigate} />}

              {(activeTab === 'suppliers' || activeTab === 'suppliers-directory') && !selectedSupplierId && (
                <SupplierList onSelectSupplier={(sId) => setSelectedSupplierId(sId)} />
              )}
              {(activeTab === 'suppliers' || activeTab === 'suppliers-directory') && selectedSupplierId && (
                <Supplier360 supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />
              )}

              {activeTab === 'approvals' && <ApprovalCenter />}
              {(activeTab === 'requisitions' || activeTab === 'purchase-requests') && <PurchaseRequisitions />}

              {(activeTab === 'tenders' || activeTab === 'rfqs') && !selectedTenderId && (
                <TenderManagement
                  onSelectTender={(tId) => setSelectedTenderId(tId)}
                  onNavigateToEvaluation={(tId) => {
                    setSelectedEvaluationTenderId(tId);
                    setActiveTab('evaluations');
                  }}
                />
              )}
              {(activeTab === 'tenders' || activeTab === 'rfqs') && selectedTenderId && (
                <TenderDetail
                  tenderId={selectedTenderId}
                  onBack={() => setSelectedTenderId(null)}
                  onNavigateToEvaluation={(tId) => {
                    setSelectedEvaluationTenderId(tId);
                    setActiveTab('evaluations');
                  }}
                />
              )}

              {(activeTab === 'evaluation' || activeTab === 'evaluations' || activeTab === 'bid-evaluation') && (
                <BidEvaluationWorkspace
                  tenderId={selectedEvaluationTenderId || undefined}
                  onBack={() => setActiveTab('tenders')}
                  onNavigateToAwards={() => setActiveTab('awards')}
                />
              )}

              {(activeTab === 'awards' || activeTab === 'award') && (
                <AwardManagement onNavigateToContracts={() => setActiveTab('contracts')} />
              )}

              {activeTab === 'contracts' && <ContractManagement />}
              {(activeTab === 'pos' || activeTab === 'purchase-orders') && <PurchaseOrders />}
              {(activeTab === 'grn' || activeTab === 'grns' || activeTab === 'deliveries') && <GoodsReceipts />}
              {(activeTab === 'invoices' || activeTab === 'three-way-match') && <Invoices3WayMatch />}
              {(activeTab === 'payments' || activeTab === 'disbursements') && <Payments />}
              {(activeTab === 'performance' || activeTab === 'supplier-performance' || activeTab === 'scorecards') && <SupplierPerformance />}
              {(activeTab === 'risk' || activeTab === 'supplier-risk' || activeTab === 'compliance') && <SupplierRisk />}
              {(activeTab === 'users' || activeTab === 'user-management') && <UserManagementAdmin />}
              {(activeTab === 'workflows' || activeTab === 'workflow') && <WorkflowAdmin />}
              {(activeTab === 'master-data' || activeTab === 'settings') && <MasterDataAdmin />}
              {(activeTab === 'reports' || activeTab === 'analytics') && <ReportsAnalytics />}
              {activeTab === 'audit' && <AuditLogs />}
            </>

          )}


          {/* SUPPLIER PORTAL ROUTES */}
          {isSupplier && (
            <>
              {(activeTab === 'dashboard' || activeTab === 'supplier-dashboard') && (
                <SupplierDashboard onNavigate={handleNavigate} />
              )}

              {activeTab === 'supplier-opportunities' && (
                <Opportunities
                  onSelectTenderForBidding={(tId) => {
                    setBidSubmitTenderId(tId);
                    setActiveTab('supplier-bid-submit');
                  }}
                />
              )}

              {activeTab === 'supplier-bid-submit' && bidSubmitTenderId && (
                <TenderBidSubmit
                  tenderId={bidSubmitTenderId}
                  onBack={() => setActiveTab('supplier-opportunities')}
                  onSuccess={() => setActiveTab('supplier-bids')}
                />
              )}

              {activeTab === 'supplier-bids' && <MyBids />}
              {activeTab === 'supplier-contracts' && <SupplierContracts />}
              {activeTab === 'supplier-pos' && <SupplierPOs />}
              {activeTab === 'supplier-deliveries' && <SupplierDeliveries />}
              {activeTab === 'supplier-invoices' && <SupplierInvoices />}
              {activeTab === 'supplier-payments' && <SupplierPayments />}
              {activeTab === 'supplier-documents' && <SupplierDocuments />}
              {activeTab === 'supplier-profile' && <SupplierProfile />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

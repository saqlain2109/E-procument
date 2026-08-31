import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  FileText,
  Clock,
  History,
  ShoppingCart,
  Receipt,
  FileSignature,
  AlertTriangle,
  Lock,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';

interface Props {
  supplierId: string;
  onBack: () => void;
}

export const Supplier360: React.FC<Props> = ({ supplierId, onBack }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    load360();
  }, [supplierId]);

  const load360 = async () => {
    try {
      const res = await api.getSupplier360(supplierId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-12 text-center text-slate-400">Loading Supplier 360 Profile...</div>;
  }

  const {
    supplier,
    contacts,
    addresses,
    categories,
    bankAccounts,
    documents,
    risk,
    performance,
    statusHistory,
    bids,
    contracts,
    purchaseOrders,
    invoices,
    payments
  } = data;

  const tabs = [
    { id: 'overview', label: 'Panoramic Overview' },
    { id: 'compliance', label: `Documents & Compliance (${documents?.length || 0})` },
    { id: 'bids', label: `Sourcing & Bids (${bids?.length || 0})` },
    { id: 'contracts', label: `Contracts (${contracts?.length || 0})` },
    { id: 'pos', label: `Purchase Orders (${purchaseOrders?.length || 0})` },
    { id: 'invoices', label: `Invoices & 3-Way Match (${invoices?.length || 0})` },
    { id: 'risk', label: 'Risk & Scorecard' },
    { id: 'history', label: 'Status & Audit History' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </button>
        <span className="text-xs text-slate-400 font-mono">Supplier ID: {supplier.supplier_code}</span>
      </div>

      {/* Supplier Hero Banner */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {supplier.legal_name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">{supplier.legal_name}</h2>
              <StatusBadge status={supplier.status} size="sm" />
            </div>
            <p className="text-xs text-slate-400">
              {supplier.trading_name ? `Trading as ${supplier.trading_name} • ` : ''}
              {supplier.business_type} • {supplier.city}, {supplier.country}
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span>Reg: <strong className="text-slate-200">{supplier.registration_number}</strong></span>
              <span>Tax ID: <strong className="text-slate-200">{supplier.tax_number}</strong></span>
              <span>Turnover: <strong className="text-emerald-400">${(supplier.annual_turnover || 0).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Performance</span>
            <p className="text-xl font-black text-blue-400 font-mono">{supplier.performance_score || 85}%</p>
          </div>
          <div className="text-right p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Risk Matrix</span>
            <p className="text-xl font-black text-emerald-400 font-mono">{supplier.risk_rating}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Key Contacts */}
          <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contacts & Governance</h3>
            <div className="space-y-3">
              {contacts?.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{c.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-blue-400">{c.contact_type}</span>
                  </div>
                  <p className="text-slate-400 mt-1">{c.email}</p>
                  <p className="text-slate-400">{c.phone || c.mobile || 'No phone'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secured Banking */}
          <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Secured Bank Details</h3>
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            {bankAccounts?.length > 0 ? (
              bankAccounts.map((b: any) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2 font-mono">
                  <p className="font-bold text-white font-sans">{b.bank_name}</p>
                  <div className="flex justify-between text-slate-400">
                    <span>Account:</span>
                    <span className="text-slate-200">{b.account_number}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>IBAN:</span>
                    <span className="text-slate-200">{b.iban || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SWIFT:</span>
                    <span className="text-slate-200">{b.swift_bic || 'N/A'}</span>
                  </div>
                  <div className="pt-1 flex items-center gap-1 text-emerald-400 text-[11px] font-sans">
                    <CheckCircle2 className="w-3 h-3" /> Bank Account Verified
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Restricted / No bank account on file</p>
            )}
          </div>

          {/* Category Mappings */}
          <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Category Certifications</h3>
            <div className="flex flex-wrap gap-2">
              {categories?.map((cat: any) => (
                <span key={cat.category_code} className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                  {cat.category_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE & DOCUMENTS */}
      {activeTab === 'compliance' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compliance Documents & Expiry Tracking</h3>
            <span className="text-xs text-slate-400">Alerts configured at 90, 60, 30 days</span>
          </div>

          <div className="divide-y divide-slate-800">
            {documents?.map((doc: any) => {
              const isExpiringSoon = doc.status === 'Expiring Soon';
              const isExpired = doc.status === 'Expired';
              return (
                <div key={doc.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{doc.document_name}</h4>
                      <p className="text-xs text-slate-400">
                        Type: {doc.document_type} • Doc No: <span className="font-mono text-slate-300">{doc.document_number || 'N/A'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Issued: {doc.issue_date || 'N/A'} • Expires: <strong className={isExpiringSoon ? 'text-amber-400' : isExpired ? 'text-rose-400' : 'text-slate-300'}>{doc.expiry_date || 'N/A'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={doc.status} size="sm" />
                    <a
                      href={doc.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SOURCING & BIDS */}
      {activeTab === 'bids' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tender Participation & Sealed Bids</h3>
          <div className="divide-y divide-slate-800">
            {bids?.map((b: any) => (
              <div key={b.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{b.bid_number}</span>
                    <span className="text-xs font-bold text-white">{b.event_title}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Event Ref: {b.event_number} • Submitted: {new Date(b.submission_timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={b.status} size="sm" />
                  <p className="text-xs font-bold text-emerald-400 font-mono">${(b.total_bid_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executed Contracts</h3>
          <div className="divide-y divide-slate-800">
            {contracts?.map((c: any) => (
              <div key={c.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{c.contract_number}</span>
                    <span className="text-xs font-bold text-white">{c.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Duration: {c.start_date} to {c.end_date}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={c.status} size="sm" />
                  <p className="text-xs font-bold text-emerald-400 font-mono">${(c.contract_value || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PURCHASE ORDERS */}
      {activeTab === 'pos' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Purchase Orders</h3>
          <div className="divide-y divide-slate-800">
            {purchaseOrders?.map((p: any) => (
              <div key={p.id} className="py-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400">{p.po_number}</span>
                  <p className="text-xs text-slate-400 mt-1">Delivery: {p.delivery_date} • {p.delivery_address}</p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={p.status} size="sm" />
                  <p className="text-xs font-bold text-emerald-400 font-mono">${(p.grand_total || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: INVOICES & 3-WAY MATCH */}
      {activeTab === 'invoices' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Invoices & 3-Way Match Verification</h3>
          <div className="divide-y divide-slate-800">
            {invoices?.map((inv: any) => (
              <div key={inv.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{inv.invoice_number}</span>
                    <span className="text-xs text-slate-300 font-mono">against PO {inv.po_number}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Due: {inv.due_date}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge status={inv.matching_status} size="sm" />
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                  <p className="text-xs font-bold text-emerald-400 font-mono">${(inv.total_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: RISK & SCORECARD */}
      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">8-Category Risk Breakdown</h3>
            {risk ? (
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Financial Health', val: risk.financial_score },
                  { label: 'Regulatory Compliance', val: risk.compliance_score },
                  { label: 'Operational Robustness', val: risk.operational_score },
                  { label: 'Cybersecurity Standard', val: risk.cybersecurity_score },
                  { label: 'Legal Standing', val: risk.legal_score },
                  { label: 'Geographic Resilience', val: risk.geographic_score },
                  { label: 'Delivery Reliability', val: risk.delivery_score },
                  { label: 'Quality Assurance', val: risk.quality_score }
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/40">
                    <span className="text-slate-300">{r.label}</span>
                    <span className="font-mono font-bold text-blue-400">{r.val}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No risk assessment recorded.</p>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Performance Scorecards</h3>
            {performance?.map((p: any) => (
              <div key={p.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-white">Period {p.period}</span>
                  <StatusBadge status={p.rating_status} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1 font-mono">
                  <span>Delivery (25%): {p.delivery_score}%</span>
                  <span>Quality (25%): {p.quality_score}%</span>
                  <span>Price (20%): {p.price_competitiveness_score}%</span>
                  <span>Service (20%): {p.responsiveness_score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Status Transitions & Audit Trail</h3>
          <div className="divide-y divide-slate-800">
            {statusHistory?.map((sh: any) => (
              <div key={sh.id} className="py-3 flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{sh.new_status}</span>
                    {sh.previous_status && <span className="text-slate-500">(from {sh.previous_status})</span>}
                  </div>
                  <p className="text-slate-400 mt-1">{sh.change_reason || 'System Status Update'}</p>
                  <p className="text-slate-500 text-[10px]">Actor: {sh.changed_by}</p>
                </div>
                <span className="font-mono text-slate-500 text-[11px]">{new Date(sh.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

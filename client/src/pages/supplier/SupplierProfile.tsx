import React, { useState, useEffect } from 'react';
import { Building2, Lock, ShieldCheck, Mail, Phone, MapPin, Globe, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SupplierProfile: React.FC = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getSupplierDashboard();
      if (res.supplier) {
        const full360 = await api.getSupplier360(res.supplier.id);
        setProfile(full360);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profile) {
    return <div className="p-12 text-center text-slate-400">Loading company profile...</div>;
  }

  const { supplier, contacts, addresses, categories, bankAccounts } = profile;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Supplier Corporate Profile</h2>
        <p className="text-xs text-slate-400 mt-1">
          Registered business entity details, primary authorized signatories, and secured banking information.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              {supplier.legal_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">{supplier.legal_name}</h3>
                <StatusBadge status={supplier.status} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{supplier.business_type} • {supplier.city}, {supplier.country}</p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Vendor Code</span>
            <p className="text-sm font-bold text-blue-400">{supplier.supplier_code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400">Registration Number</span>
            <p className="font-bold text-white font-mono">{supplier.registration_number}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400">Tax ID / VAT</span>
            <p className="font-bold text-white font-mono">{supplier.tax_number}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400">Annual Revenue</span>
            <p className="font-bold text-emerald-400 font-mono">${(supplier.annual_turnover || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Grid: Contacts & Secured Banking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authorized Contacts */}
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Authorized Signatories & Contacts</h4>
          <div className="space-y-3">
            {contacts?.map((c: any) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-white text-sm">{c.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-blue-400 font-bold">{c.contact_type}</span>
                </div>
                <p className="text-slate-400">{c.email} • {c.phone || c.mobile || 'No phone'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Secured Banking */}
        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Secured Bank Account Information</h4>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="space-y-3">
            {bankAccounts?.map((b: any) => (
              <div key={b.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs font-mono space-y-2">
                <p className="font-bold text-white font-sans text-sm">{b.bank_name}</p>
                <div className="flex justify-between text-slate-400">
                  <span>Account Number:</span>
                  <span className="text-slate-200">{b.account_number}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>IBAN:</span>
                  <span className="text-slate-200">{b.iban || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SWIFT / BIC:</span>
                  <span className="text-slate-200">{b.swift_bic || 'N/A'}</span>
                </div>
                <div className="pt-1 flex items-center gap-1.5 text-emerald-400 text-[11px] font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Direct Deposit Verified
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

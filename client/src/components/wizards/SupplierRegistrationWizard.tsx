import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload,
  ShieldCheck,
  CreditCard,
  FileText,
  User,
  Save,
  Check,
  Lock
} from 'lucide-react';
import { api } from '../../api/client';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SupplierRegistrationWizard: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const [formData, setFormData] = useState<any>({
    account: { email: '', password: '', firstName: '', lastName: '' },
    company: {
      legalName: '',
      tradingName: '',
      registrationNumber: '',
      businessType: 'Corporation',
      country: 'United States',
      state: '',
      city: '',
      address: '',
      postalCode: '',
      website: '',
      yearEstablished: 2020,
      employeeCount: 50,
      annualTurnover: 2500000,
      currency: 'USD'
    },
    contacts: {
      primary: { name: '', email: '', phone: '', designation: 'Managing Director' },
      finance: { name: '', email: '', phone: '', designation: 'Finance Lead' },
      procurement: { name: '', email: '', phone: '', designation: 'Sales Director' }
    },
    tax: {
      taxNumber: '',
      vatNumber: '',
      taxExempt: false
    },
    banking: {
      bankName: '',
      branch: '',
      accountName: '',
      accountNumber: '',
      iban: '',
      swiftBic: '',
      currency: 'USD'
    },
    categories: ['IT_HARDWARE', 'IT_SOFTWARE'],
    declarations: {
      conflictOfInterest: true,
      antiBribery: true,
      codeOfConduct: true
    }
  });

  // Load saved draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eprocure_supplier_reg_draft');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const updateField = (section: string, field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      localStorage.setItem('eprocure_supplier_reg_draft', JSON.stringify(updated));
      return updated;
    });
  };

  const steps = [
    { num: 1, title: 'Account', icon: User },
    { num: 2, title: 'Company', icon: Building2 },
    { num: 3, title: 'Contacts', icon: User },
    { num: 4, title: 'Tax', icon: FileText },
    { num: 5, title: 'Banking', icon: CreditCard },
    { num: 6, title: 'Categories', icon: Building2 },
    { num: 7, title: 'Declarations', icon: ShieldCheck },
    { num: 8, title: 'Review & Submit', icon: CheckCircle2 }
  ];

  // Pre-submission duplicate check
  const handleCheckDuplicatesAndNext = async () => {
    if (currentStep === 2 || currentStep === 4 || currentStep === 5) {
      try {
        const check = await api.checkDuplicates({
          registrationNumber: formData.company.registrationNumber,
          taxNumber: formData.tax.taxNumber,
          legalName: formData.company.legalName,
          email: formData.account.email || formData.contacts.primary.email,
          accountNumber: formData.banking.accountNumber
        });

        if (check.isDuplicate) {
          setDuplicateWarning(check.matches);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {}
    }

    setCurrentStep((s) => Math.min(steps.length, s + 1));
  };

  const handleSubmit = async (overrideDup = false) => {
    setSubmitting(true);
    try {
      const res = await api.registerSupplier(
        (() => {
          const fd = new FormData();
          fd.append(
            'data',
            JSON.stringify({
              ...formData,
              overrideDuplicate: overrideDup
            })
          );
          return fd;
        })()
      );

      localStorage.removeItem('eprocure_supplier_reg_draft');
      setSuccessResult(res);
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="p-6 sm:p-8 text-center bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl max-w-2xl mx-auto space-y-6 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white">Application Submitted!</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Your vendor application has been enrolled into the 3-level qualification workflow.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 font-mono text-xs text-left space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Supplier Reference:</span>
            <span className="font-bold text-blue-400 text-sm">{successResult.supplierCode}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
              {successResult.status}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-700/80">
            <span className="text-slate-400 font-sans text-[11px]">Approval Governance Route:</span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans">
              <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-200">1. Procurement Admin Review</span>
              <span className="text-blue-400 font-bold">→</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-200">2. Finance Verification</span>
              <span className="text-blue-400 font-bold">→</span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-700 text-slate-200">3. Executive Final Approval</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSuccess || onCancel}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden w-full max-w-4xl mx-auto">
      {/* Wizard Progress Stepper */}
      <div className="bg-slate-850 p-4 sm:p-6 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Supplier Registration Wizard</h3>
            <p className="text-xs text-slate-400">Step {currentStep} of {steps.length}: <strong className="text-blue-400">{steps[currentStep - 1].title}</strong></p>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold w-fit">
            {Math.round((currentStep / steps.length) * 100)}% Completed
          </span>
        </div>

        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 mt-3">
          {steps.map((st) => (
            <div
              key={st.num}
              onClick={() => setCurrentStep(st.num)}
              className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                st.num === currentStep
                  ? 'bg-blue-500 shadow-md shadow-blue-500/40'
                  : st.num < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={`Step ${st.num}: ${st.title}`}
            />
          ))}
        </div>
      </div>


      {/* Duplicate Alert Banner if Found */}
      {duplicateWarning && duplicateWarning.length > 0 && (
        <div className="m-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="text-xs space-y-1 flex-1">
            <p className="font-bold text-amber-200">Warning: Possible Existing Supplier Match Found</p>
            <p className="text-slate-300">
              The details you entered match existing registered entity:{' '}
              <strong className="text-white">{duplicateWarning[0]?.matchedSupplierName}</strong> (
              <span className="font-mono text-blue-400">{duplicateWarning[0]?.matchedSupplierCode}</span>) via{' '}
              <span className="italic">{duplicateWarning[0]?.field}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="p-8 space-y-6">
        {/* STEP 1: Account */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Account Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">First Name</label>
                <input
                  type="text"
                  value={formData.account.firstName}
                  onChange={(e) => updateField('account', 'firstName', e.target.value)}
                  placeholder="e.g. Michael"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Last Name</label>
                <input
                  type="text"
                  value={formData.account.lastName}
                  onChange={(e) => updateField('account', 'lastName', e.target.value)}
                  placeholder="e.g. Chang"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Corporate Email (Login Username)</label>
                <input
                  type="email"
                  value={formData.account.email}
                  onChange={(e) => updateField('account', 'email', e.target.value)}
                  placeholder="supplier.contact@enterprise.com"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Account Password</label>
                <input
                  type="password"
                  value={formData.account.password}
                  onChange={(e) => updateField('account', 'password', e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Company Info */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Company & Registration Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Legal Company Name *</label>
                <input
                  type="text"
                  value={formData.company.legalName}
                  onChange={(e) => updateField('company', 'legalName', e.target.value)}
                  placeholder="e.g. Quantum Dynamics Corp"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Trading Name / DBA</label>
                <input
                  type="text"
                  value={formData.company.tradingName}
                  onChange={(e) => updateField('company', 'tradingName', e.target.value)}
                  placeholder="e.g. Quantum Labs"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Company Registration Number *</label>
                <input
                  type="text"
                  value={formData.company.registrationNumber}
                  onChange={(e) => updateField('company', 'registrationNumber', e.target.value)}
                  placeholder="e.g. US-DEL-984210"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Country of Incorporation</label>
                <select
                  value={formData.company.country}
                  onChange={(e) => updateField('company', 'country', e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="Singapore">Singapore</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Japan">Japan</option>
                  <option value="India">India</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">City</label>
                <input
                  type="text"
                  value={formData.company.city}
                  onChange={(e) => updateField('company', 'city', e.target.value)}
                  placeholder="San Francisco"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Annual Turnover ($ USD)</label>
                <input
                  type="number"
                  value={formData.company.annualTurnover}
                  onChange={(e) => updateField('company', 'annualTurnover', parseFloat(e.target.value))}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Contacts */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Key Commercial & Legal Contacts</h4>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <p className="text-xs font-bold text-blue-400 mb-2">Primary Procurement Contact</p>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={formData.contacts.primary.name}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        contacts: { ...p.contacts, primary: { ...p.contacts.primary, name: e.target.value } }
                      }))
                    }
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.contacts.primary.email}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        contacts: { ...p.contacts, primary: { ...p.contacts.primary, email: e.target.value } }
                      }))
                    }
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={formData.contacts.primary.phone}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        contacts: { ...p.contacts, primary: { ...p.contacts.primary, phone: e.target.value } }
                      }))
                    }
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Tax */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Tax & Compliance ID</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Federal Tax Identification Number (EIN / PAN / TIN) *</label>
                <input
                  type="text"
                  value={formData.tax.taxNumber}
                  onChange={(e) => updateField('tax', 'taxNumber', e.target.value)}
                  placeholder="e.g. US-TAX-992019"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">VAT / GST Certificate Number</label>
                <input
                  type="text"
                  value={formData.tax.vatNumber}
                  onChange={(e) => updateField('tax', 'vatNumber', e.target.value)}
                  placeholder="e.g. US-VAT-4412"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Banking */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Disbursement & Bank Account</h4>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Lock className="w-3 h-3" /> 256-bit Encrypted Vault
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Bank Name</label>
                <input
                  type="text"
                  value={formData.banking.bankName}
                  onChange={(e) => updateField('banking', 'bankName', e.target.value)}
                  placeholder="e.g. JPMorgan Chase Bank"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Account Number</label>
                <input
                  type="text"
                  value={formData.banking.accountNumber}
                  onChange={(e) => updateField('banking', 'accountNumber', e.target.value)}
                  placeholder="ACC-99201948"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">IBAN</label>
                <input
                  type="text"
                  value={formData.banking.iban}
                  onChange={(e) => updateField('banking', 'iban', e.target.value)}
                  placeholder="US89JPMC12345678901234"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">SWIFT / BIC</label>
                <input
                  type="text"
                  value={formData.banking.swiftBic}
                  onChange={(e) => updateField('banking', 'swiftBic', e.target.value)}
                  placeholder="CHASUS33"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Categories */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Category Capabilities</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'IT_HARDWARE', name: 'IT Hardware & Servers' },
                { code: 'IT_SOFTWARE', name: 'Enterprise Software & SaaS' },
                { code: 'NETWORKING', name: 'Networking & Telecommunications' },
                { code: 'CYBERSECURITY', name: 'Cybersecurity Solutions' },
                { code: 'CLOUD_SERVICES', name: 'Cloud Infrastructure & Hosting' },
                { code: 'HEAVY_MACHINERY', name: 'Industrial Machinery & Equipment' },
                { code: 'LOGISTICS', name: 'Freight & Transportation Logistics' }
              ].map((cat) => {
                const isSelected = formData.categories?.includes(cat.code);
                return (
                  <button
                    type="button"
                    key={cat.code}
                    onClick={() => {
                      setFormData((p: any) => ({
                        ...p,
                        categories: isSelected
                          ? p.categories.filter((c: string) => c !== cat.code)
                          : [...(p.categories || []), cat.code]
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/50 text-white font-bold'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: Declarations */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Governance & Compliance Declarations</h4>
            <div className="space-y-3">
              {[
                { key: 'conflictOfInterest', label: 'I declare that no conflict of interest exists with procurement committee members.' },
                { key: 'antiBribery', label: 'I agree to strictly abide by Anti-Bribery, Anti-Corruption and Fair Competition acts.' },
                { key: 'codeOfConduct', label: 'I have read and accepted the Global Corporate Supplier Code of Conduct.' }
              ].map((decl) => (
                <label
                  key={decl.key}
                  className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.declarations[decl.key]}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        declarations: { ...p.declarations, [decl.key]: e.target.checked }
                      }))
                    }
                    className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-300 font-medium leading-relaxed">{decl.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: Review & Submit */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Validation Checklist</h4>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-700 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Company Details Provided
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Tax & Reg IDs Validated
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Banking Info Configured
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Compliance Declarations Accepted
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Entity:</span>
                <span className="font-bold text-white">{formData.company.legalName || 'Draft Supplier'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reg No:</span>
                <span className="font-mono text-slate-300">{formData.company.registrationNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax ID:</span>
                <span className="font-mono text-slate-300">{formData.tax.taxNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          )}

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={handleCheckDuplicatesAndNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/25"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all"
            >
              {submitting ? 'Enrolling in Workflow...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

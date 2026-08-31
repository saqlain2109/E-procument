import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SupplierRegistrationWizard } from '../../components/wizards/SupplierRegistrationWizard';

interface Props {
  onBackToLogin: () => void;
}

export const RegisterSupplier: React.FC<Props> = ({ onBackToLogin }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </button>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">Vendor Qualification Onboarding</span>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">Enterprise Supplier Onboarding</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Complete your vendor qualification with automated duplicate tax and registration verification.
          </p>
        </div>

        <SupplierRegistrationWizard
          onSuccess={() => {
            alert('Registration submitted! You may now sign in using your authorized contact credentials.');
            onBackToLogin();
          }}
          onCancel={onBackToLogin}
        />
      </div>
    </div>
  );
};

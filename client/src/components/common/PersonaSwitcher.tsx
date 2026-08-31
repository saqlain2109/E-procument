import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Shield, Building2, ChevronDown, Check, Sparkles } from 'lucide-react';

export const PersonaSwitcher: React.FC = () => {
  const { user, personas, switchPersona, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-xs text-blue-300 transition-all shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
        <span className="font-semibold text-slate-200">Role:</span>
        <span className="font-bold text-white max-w-[150px] truncate">
          {user?.role || 'Guest'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-800 mb-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Persona Switcher (Demo Simulator)
              </p>
              <p className="text-[11px] text-slate-400">
                Jump into any persona with exact permissions & workflows
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1">
              {personas.map((p) => {
                const isSelected = user?.email === p.email;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchPersona({ userId: p.id, email: p.email, roleName: p.role_name });
                      setIsOpen(false);
                    }}

                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                        : 'hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          p.supplier_name ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {p.supplier_name ? <Building2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {p.role_name} {p.supplier_name ? `• ${p.supplier_name}` : ''}
                        </p>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

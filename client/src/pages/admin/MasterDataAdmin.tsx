import React, { useState, useEffect } from 'react';
import { Database, Mail, Hash, Globe, Plus, Edit3, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';

export const MasterDataAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'numbering' | 'emailTemplates' | 'departments'>('categories');
  const [categories, setCategories] = useState<any[]>([]);
  const [numbering, setNumbering] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Email template editor modal
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [cats, num, emails, depts] = await Promise.all([
        api.getMasterData('CATEGORY'),
        api.getNumberingConfigs(),
        api.getEmailTemplates(),
        api.getDepartments()
      ]);
      setCategories(cats);
      setNumbering(num);
      setEmailTemplates(emails);
      setDepartments(depts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmailEditor = (tpl: any) => {
    setSelectedTemplate(tpl);
    setTemplateSubject(tpl.subject);
    setTemplateBody(tpl.body_template);
  };

  const handleSaveEmailTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await api.updateEmailTemplate(selectedTemplate.id, {
        subject: templateSubject,
        bodyTemplate: templateBody
      });
      alert('Email notification template updated successfully!');
      setSelectedTemplate(null);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update template');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Master Data & System Settings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain product categories, numbering sequences, customizable email notification templates, and organization units.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        {[
          { id: 'categories', label: 'Procurement Categories', icon: Database },
          { id: 'emailTemplates', label: 'Email Templates', icon: Mail },
          { id: 'numbering', label: 'Document Numbering Schemes', icon: Hash },
          { id: 'departments', label: 'Departments & Cost Centers', icon: Globe }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">UNSPSC / Sourcing Hierarchy</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-blue-400 font-bold text-[11px]">{c.code}</span>
                  <span className="text-emerald-400 font-bold text-[10px]">Active</span>
                </div>
                <h4 className="mt-1 font-bold text-white text-sm">{c.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES */}
      {activeTab === 'emailTemplates' && (
        <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Notification Templates (Supports Tokens)</h3>
          <div className="divide-y divide-slate-800">
            {emailTemplates.map((tpl) => (
              <div key={tpl.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{tpl.code}</span>
                    <h4 className="text-sm font-bold text-white">{tpl.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Subject: {tpl.subject}</p>
                </div>
                <button
                  onClick={() => handleOpenEmailEditor(tpl)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NUMBERING SCHEMES */}
      {activeTab === 'numbering' && (
        <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Automated Number Generation Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {numbering.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white uppercase">{n.module}</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">{n.prefix}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Current Sequence:</span>
                  <span className="text-emerald-400 font-bold">{n.current_number}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-mono">
                  <span>Format:</span>
                  <span className="text-slate-300">{n.format_pattern}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="rounded-3xl bg-slate-850 border border-slate-800 p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Organization Hierarchy & Budgets</h3>
          <div className="space-y-4">
            {departments.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">{d.code}</span>
                    <h4 className="font-bold text-white text-sm">{d.name}</h4>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">Budget Limit: ${(d.budget_limit || 0).toLocaleString()}</span>
                </div>

                {d.cost_centers && d.cost_centers.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                    {d.cost_centers.map((cc: any) => (
                      <div key={cc.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex justify-between font-mono">
                        <span className="text-slate-300 font-sans">{cc.name} ({cc.code})</span>
                        <span className="text-blue-400 font-bold">${cc.allocated_budget?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Email Template Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          title={`Edit Email Template: ${selectedTemplate.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Subject Line *</label>
              <input
                type="text"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Body Content (Dynamic token support) *</label>
              <textarea
                rows={6}
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmailTemplate}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Update Template
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

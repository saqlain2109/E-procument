import React, { useState } from 'react';
import {
  FolderLock,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../api/client';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TenderCreationWizard: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    eventType: 'RFQ',
    title: '',
    description: '',
    procurementCategory: 'IT_HARDWARE',
    departmentId: 'DEPT-IT',
    estimatedBudget: 250000,
    currency: 'USD',
    bidSubmissionDeadline: '2026-09-30T18:00',
    expectedAwardDate: '2026-10-15',
    deliveryLocation: 'Global Data Center, Suite 400',
    paymentTerms: 'Net 30 Days',
    deliveryTerms: 'DDP (Delivered Duty Paid)',
    contractDuration: '12 Months',
    isPublic: true,
    technicalWeight: 60,
    commercialWeight: 40,
    items: [
      { description: 'High-Density Rack Server Nodes (1U)', quantity: 20, unit: 'Units', estimatedPrice: 8500 },
      { description: '100GbE Optical Transceivers & DAC Cables', quantity: 40, unit: 'Units', estimatedPrice: 450 }
    ],
    technicalRequirements: [
      { title: 'Minimum 5 Years of Corporate Experience', type: 'YES_NO', weight: 20 },
      { title: 'ISO 27001 & SOC 2 Type II Compliance Certifications', type: 'DOCUMENT', weight: 20 },
      { title: '24/7 SLA Response Time under 15 Minutes', type: 'YES_NO', weight: 20 }
    ],
    evaluationCriteria: [
      { stage: 'Technical', name: 'Technical Architecture & Compliance', weight: 30 },
      { stage: 'Technical', name: 'Vendor SLA & Track Record', weight: 30 },
      { stage: 'Commercial', name: 'Evaluated Commercial Pricing', weight: 40 }
    ]
  });

  const steps = [
    { num: 1, title: 'Basic Information' },
    { num: 2, title: 'Items & Specs' },
    { num: 3, title: 'Technical Requirements' },
    { num: 4, title: 'Evaluation Criteria' },
    { num: 5, title: 'Timeline & Publish' }
  ];

  const addItem = () => {
    setFormData((p: any) => ({
      ...p,
      items: [...p.items, { description: '', quantity: 1, unit: 'Units', estimatedPrice: 1000 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData((p: any) => ({
      ...p,
      items: p.items.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createTender(formData);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to create tender');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden max-w-4xl mx-auto">
      {/* Stepper Header */}
      <div className="bg-slate-850 p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Sourcing Event Creation Wizard</h3>
          <p className="text-xs text-slate-400">Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
          {Math.round((currentStep / steps.length) * 100)}% Completed
        </span>
      </div>

      <div className="p-8 space-y-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Event Overview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Procurement Method / Event Type *</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="RFQ">Request for Quotation (RFQ)</option>
                  <option value="RFP">Request for Proposal (RFP)</option>
                  <option value="OPEN_TENDER">Open Tender</option>
                  <option value="RESTRICTED_TENDER">Restricted Tender</option>
                  <option value="REVERSE_AUCTION">Reverse Auction</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Procurement Category</label>
                <select
                  value={formData.procurementCategory}
                  onChange={(e) => setFormData({ ...formData, procurementCategory: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="IT_HARDWARE">IT Hardware & Servers</option>
                  <option value="IT_SOFTWARE">Enterprise Software & SaaS</option>
                  <option value="NETWORKING">Networking & Telecommunications</option>
                  <option value="CYBERSECURITY">Cybersecurity Solutions</option>
                  <option value="CLOUD_SERVICES">Cloud Infrastructure & Hosting</option>
                  <option value="HEAVY_MACHINERY">Industrial Machinery</option>
                  <option value="LOGISTICS">Logistics & Supply Chain</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400">Sourcing Event Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Turnkey High-Density Server Infrastructure Provisioning"
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400">Scope of Work / Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed specifications and scope requirements..."
                  className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Estimated Budget ($ USD)</label>
                <input
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="DEPT-IT">Information Technology</option>
                  <option value="DEPT-OPS">Supply Chain & Operations</option>
                  <option value="DEPT-ENG">Engineering & Plant</option>
                  <option value="DEPT-FIN">Finance & Accounting</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Items & Specifications */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Bill of Quantities (Line Items)</h4>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((it: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6">
                    <label className="text-[11px] text-slate-400">Item Description</label>
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => {
                        const updated = [...formData.items];
                        updated[idx].description = e.target.value;
                        setFormData({ ...formData, items: updated });
                      }}
                      placeholder="Description"
                      className="mt-0.5 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400">Qty</label>
                    <input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => {
                        const updated = [...formData.items];
                        updated[idx].quantity = parseFloat(e.target.value);
                        setFormData({ ...formData, items: updated });
                      }}
                      className="mt-0.5 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[11px] text-slate-400">Unit Price ($)</label>
                    <input
                      type="number"
                      value={it.estimatedPrice}
                      onChange={(e) => {
                        const updated = [...formData.items];
                        updated[idx].estimatedPrice = parseFloat(e.target.value);
                        setFormData({ ...formData, items: updated });
                      }}
                      className="mt-0.5 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-750"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Technical Requirements */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Technical Qualification Criteria</h4>
            <div className="space-y-3">
              {formData.technicalRequirements.map((tr: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{tr.title}</p>
                    <span className="text-[10px] text-blue-400 font-mono">Response Type: {tr.type}</span>
                  </div>
                  <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg font-bold">Weight: {tr.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Evaluation Criteria */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Weighting Engine</h4>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
              <div>
                <label className="text-xs font-semibold text-slate-300">Technical Evaluation Weight (%)</label>
                <input
                  type="number"
                  value={formData.technicalWeight}
                  onChange={(e) => setFormData({ ...formData, technicalWeight: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Commercial Evaluation Weight (%)</label>
                <input
                  type="number"
                  value={formData.commercialWeight}
                  onChange={(e) => setFormData({ ...formData, commercialWeight: parseFloat(e.target.value) })}
                  className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Timeline & Publish */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Deadlines & Terms</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Bid Submission Deadline *</label>
                <input
                  type="datetime-local"
                  value={formData.bidSubmissionDeadline}
                  onChange={(e) => setFormData({ ...formData, bidSubmissionDeadline: e.target.value })}
                  className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Target Award Date</label>
                <input
                  type="date"
                  value={formData.expectedAwardDate}
                  onChange={(e) => setFormData({ ...formData, expectedAwardDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Footer */}
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
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white">
            Cancel
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(steps.length, s + 1))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/25"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
            >
              {submitting ? 'Creating Event...' : 'Create Sourcing Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

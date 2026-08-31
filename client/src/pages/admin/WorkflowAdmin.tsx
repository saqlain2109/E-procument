import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Plus,
  Trash2,
  Settings,
  Clock,
  CheckCircle2,
  Shield,
  Layers,
  ArrowDown,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';

export const WorkflowAdmin: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [showAddLevelModal, setShowAddLevelModal] = useState(false);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

  // New level form state
  const [newLevel, setNewLevel] = useState({
    levelName: '',
    approverType: 'ROLE',
    roleId: 'ROLE-PROC-ADMIN',
    approvalType: 'SEQUENTIAL',
    conditionField: '',
    conditionOperator: '>',
    conditionValue: '',
    slaHours: 24
  });

  // New workflow form state
  const [newWf, setNewWf] = useState({
    name: '',
    module: 'PURCHASE_ORDER',
    description: ''
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await api.getWorkflows();
      setWorkflows(res);
      if (res.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(res[0]);
      } else if (selectedWorkflow) {
        const current = res.find((w: any) => w.id === selectedWorkflow.id);
        if (current) setSelectedWorkflow(current);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLevel = async () => {
    if (!selectedWorkflow || !newLevel.levelName) {
      alert('Please provide level name');
      return;
    }

    try {
      await api.addWorkflowLevel(selectedWorkflow.id, newLevel);
      setShowAddLevelModal(false);
      setNewLevel({
        levelName: '',
        approverType: 'ROLE',
        roleId: 'ROLE-PROC-ADMIN',
        approvalType: 'SEQUENTIAL',
        conditionField: '',
        conditionOperator: '>',
        conditionValue: '',
        slaHours: 24
      });
      loadWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to add level');
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!confirm('Are you sure you want to remove this approval stage?')) return;
    try {
      await api.deleteWorkflowLevel(levelId);
      loadWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to delete level');
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newWf.name || !newWf.module) {
      alert('Please fill all fields');
      return;
    }
    try {
      await api.createWorkflow(newWf);
      setShowNewWorkflowModal(false);
      setNewWf({ name: '', module: 'PURCHASE_ORDER', description: '' });
      loadWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to create workflow');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Dynamic Workflow Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
              Configuration-Driven
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero hardcoding. Configure multi-tier sequential, parallel, quorum, and amount-based rules on the fly.
          </p>
        </div>

        <button
          onClick={() => setShowNewWorkflowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow Definition</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflow Master Selector Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Registered Workflows</h3>
          <div className="space-y-2">
            {workflows.map((wf) => {
              const isSelected = selectedWorkflow?.id === wf.id;
              return (
                <button
                  key={wf.id}
                  onClick={() => setSelectedWorkflow(wf)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-850/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700 font-mono font-bold">
                      {wf.module}
                    </span>
                    <span className="text-xs text-slate-400">{wf.levels?.length || 0} Levels</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-white tracking-tight">{wf.name}</h4>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{wf.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Workflow Levels Canvas */}
        <div className="lg:col-span-8 space-y-4">
          {selectedWorkflow ? (
            <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedWorkflow.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      v{selectedWorkflow.version}.0 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedWorkflow.description}</p>
                </div>

                <button
                  onClick={() => setShowAddLevelModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Approval Level
                </button>
              </div>

              {/* Visual Sequence Chain */}
              <div className="space-y-4">
                {selectedWorkflow.levels && selectedWorkflow.levels.length > 0 ? (
                  selectedWorkflow.levels.map((lvl: any, idx: number) => (
                    <React.Fragment key={lvl.id}>
                      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black text-sm flex items-center justify-center shadow-inner">
                            {lvl.level_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{lvl.level_name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                                {lvl.role_name || lvl.user_email || 'Approver Authority'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-400" /> SLA: {lvl.sla_hours}h
                              </span>
                              {lvl.condition_field && (
                                <span className="text-blue-400 font-mono font-semibold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20">
                                  Condition: {lvl.condition_field} {lvl.condition_operator} ${parseFloat(lvl.condition_value).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteLevel(lvl.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                          title="Remove level"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {idx < selectedWorkflow.levels.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-4 h-4 text-slate-600 animate-bounce" />
                        </div>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                    No approval levels defined yet for this process.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">Select a workflow to edit its levels</div>
          )}
        </div>
      </div>

      {/* Add Level Modal */}
      {showAddLevelModal && selectedWorkflow && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddLevelModal(false)}
          title={`Add Dynamic Approval Level (${selectedWorkflow.name})`}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Level Name *</label>
              <input
                type="text"
                placeholder="e.g. Chief Risk & Compliance Officer Sign-off"
                value={newLevel.levelName}
                onChange={(e) => setNewLevel({ ...newLevel, levelName: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Assigned Role Authority</label>
                <select
                  value={newLevel.roleId}
                  onChange={(e) => setNewLevel({ ...newLevel, roleId: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="ROLE-SUPER-ADMIN">Super Administrator / CEO</option>
                  <option value="ROLE-PROC-ADMIN">Procurement Administrator</option>
                  <option value="ROLE-FINANCE">Finance Director / CFO</option>
                  <option value="ROLE-EVALUATOR">Technical Evaluation Lead</option>
                  <option value="ROLE-APPROVER">Department Approver / VP</option>
                  <option value="ROLE-CONTRACT-MGR">Contract Manager</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">SLA Due Duration (Hours)</label>
                <input
                  type="number"
                  value={newLevel.slaHours}
                  onChange={(e) => setNewLevel({ ...newLevel, slaHours: parseInt(e.target.value, 10) || 24 })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            {/* Condition Threshold */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Optional Trigger Condition</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Field</label>
                  <select
                    value={newLevel.conditionField}
                    onChange={(e) => setNewLevel({ ...newLevel, conditionField: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value="">None (Always Trigger)</option>
                    <option value="amount">Transaction Amount</option>
                    <option value="category">Category</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Operator</label>
                  <select
                    value={newLevel.conditionOperator}
                    onChange={(e) => setNewLevel({ ...newLevel, conditionOperator: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    <option value=">">&gt; (Greater than)</option>
                    <option value=">=">&gt;= (Greater or equal)</option>
                    <option value="<">&lt; (Less than)</option>
                    <option value="==">== (Exact match)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Threshold Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 50000"
                    value={newLevel.conditionValue}
                    onChange={(e) => setNewLevel({ ...newLevel, conditionValue: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddLevelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddLevel}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Save Dynamic Level
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create New Workflow Master Modal */}
      {showNewWorkflowModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowNewWorkflowModal(false)}
          title="Create New Workflow Master"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Workflow Name *</label>
              <input
                type="text"
                placeholder="e.g. Tier-1 Fast-Track RFQ Approval"
                value={newWf.name}
                onChange={(e) => setNewWf({ ...newWf, name: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Module Target *</label>
              <select
                value={newWf.module}
                onChange={(e) => setNewWf({ ...newWf, module: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="PURCHASE_ORDER">Purchase Order</option>
                <option value="PURCHASE_REQUISITION">Purchase Requisition</option>
                <option value="SUPPLIER_REGISTRATION">Supplier Registration</option>
                <option value="TENDER_PUBLISH">Tender Publication</option>
                <option value="BID_AWARD">Bid Award</option>
                <option value="INVOICE">Invoice Payment</option>
                <option value="CONTRACT">Contract Approval</option>
                <option value="SUPPLIER_SUSPENSION">Supplier Suspension</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <textarea
                rows={3}
                placeholder="Describe the governance purpose..."
                value={newWf.description}
                onChange={(e) => setNewWf({ ...newWf, description: e.target.value })}
                className="mt-1 w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewWorkflowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkflow}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Create Workflow
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

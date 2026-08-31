import React, { useState, useEffect } from 'react';
import { FileText, Plus, Eye, DollarSign, Calendar, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { ProcurementRequest } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const PurchaseRequisitions: React.FC = () => {
  const [requisitions, setRequisitions] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any | null>(null);

  const [formData, setFormData] = useState<any>({
    title: '',
    requestingDepartmentId: 'DEPT-IT',
    procurementCategory: 'IT_HARDWARE',
    description: '',
    requiredDate: '2026-09-30',
    deliveryLocation: 'HQ Tech Building, 4th Floor',
    justification: 'Quarterly datacenter compute scale-up',
    items: [
      { description: 'High-Density Compute Server Blade', quantity: 5, unit: 'Units', estimatedUnitPrice: 12000 }
    ]
  });

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    try {
      const res = await api.getRequisitions();
      setRequisitions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePR = async (isDraft = false) => {
    if (!formData.title || !formData.items || formData.items.length === 0) {
      alert('Please fill mandatory fields');
      return;
    }
    try {
      await api.createRequisition({ ...formData, isDraft });
      setShowCreateModal(false);
      loadPRs();
    } catch (err: any) {
      alert(err.message || 'Failed to create PR');
    }
  };

  const viewPRDetail = async (id: string) => {
    try {
      const res = await api.getRequisitionDetail(id);
      setSelectedPR(res);
    } catch (e) {
      alert('Failed to load PR detail');
    }
  };

  const columns: Column<ProcurementRequest>[] = [
    {
      header: 'Requisition Ref & Title',
      cell: (pr) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-400">{pr.request_number}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{pr.department_name}</span>
          </div>
          <p className="text-sm font-bold text-white tracking-tight mt-0.5">{pr.title}</p>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'procurement_category'
    },
    {
      header: 'Estimated Total',
      cell: (pr) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${pr.estimated_total.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Required Date',
      cell: (pr) => <span className="text-xs text-slate-400 font-mono">{pr.required_date}</span>
    },
    {
      header: 'Status',
      cell: (pr) => <StatusBadge status={pr.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (pr) => (
        <button
          onClick={() => viewPRDetail(pr.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
        >
          <Eye className="w-3.5 h-3.5" /> Details
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Purchase Requisitions (PR)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Internal department procurement requests with automated amount-threshold approval routing.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Requisition</span>
        </button>
      </div>

      <DataTable
        title="Purchase Requests"
        data={requisitions}
        columns={columns}
        searchPlaceholder="Search requisition number, title, department..."
        statusFilterKey="status"
        statusOptions={['Draft', 'Submitted', 'Department Approval', 'Approved', 'Rejected']}
      />

      {/* Create PR Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="New Purchase Requisition" maxWidth="3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400">Requisition Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Datacenter Network Switches & Transceivers"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Requesting Department</label>
                <select
                  value={formData.requestingDepartmentId}
                  onChange={(e) => setFormData({ ...formData, requestingDepartmentId: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                >
                  <option value="DEPT-IT">Information Technology</option>
                  <option value="DEPT-OPS">Supply Chain & Operations</option>
                  <option value="DEPT-ENG">Engineering & Infrastructure</option>
                  <option value="DEPT-FIN">Finance</option>
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
                  <option value="LOGISTICS">Logistics & Freight</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Required By Date</label>
                <input
                  type="date"
                  value={formData.requiredDate}
                  onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Delivery Location</label>
                <input
                  type="text"
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Requisition Line Items</h4>
              {formData.items.map((it: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].description = e.target.value;
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-6 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].quantity = parseFloat(e.target.value);
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price ($)"
                    value={it.estimatedUnitPrice}
                    onChange={(e) => {
                      const upd = [...formData.items];
                      upd[idx].estimatedUnitPrice = parseFloat(e.target.value);
                      setFormData({ ...formData, items: upd });
                    }}
                    className="col-span-4 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreatePR(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PR Detail Modal */}
      {selectedPR && (
        <Modal isOpen={true} onClose={() => setSelectedPR(null)} title={`Purchase Requisition ${selectedPR.pr.request_number}`} maxWidth="3xl">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Title:</span>
                <span className="font-bold text-white">{selectedPR.pr.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="text-slate-200">{selectedPR.pr.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requester:</span>
                <span className="text-slate-200">{selectedPR.pr.first_name} {selectedPR.pr.last_name} ({selectedPR.pr.requester_email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Total:</span>
                <span className="font-mono font-bold text-emerald-400">${selectedPR.pr.estimated_total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <StatusBadge status={selectedPR.pr.status} size="sm" />
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5">Qty</th>
                    <th className="px-4 py-2.5">Unit Price</th>
                    <th className="px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedPR.items.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-medium text-white">{it.description}</td>
                      <td className="px-4 py-2.5 font-mono">{it.quantity} {it.unit}</td>
                      <td className="px-4 py-2.5 font-mono">${it.estimated_unit_price.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">${it.estimated_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

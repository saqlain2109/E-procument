import React, { useState, useEffect } from 'react';
import { FileText, Plus, Upload, AlertTriangle, CheckCircle2, Eye, Calendar, Clock } from 'lucide-react';
import { api } from '../../api/client';
import { SupplierDocument } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const SupplierDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [formData, setFormData] = useState({
    documentType: 'Tax Clearance Certificate',
    documentName: 'Annual Tax Compliance Certificate 2026-2027',
    documentNumber: 'TAX-2026-8891',
    issueDate: '2026-01-01',
    expiryDate: '2027-01-01'
  });

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await api.getSupplierDocuments();
      setDocuments(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDoc = async () => {
    if (!formData.documentName || !formData.documentType) {
      alert('Please fill mandatory fields');
      return;
    }
    try {
      await api.uploadSupplierDocument({
        ...formData,
        fileName: `${formData.documentName.replace(/\s+/g, '_')}.pdf`,
        filePath: `/uploads/documents/${Date.now()}.pdf`,
        fileSize: 1024 * 512,
        mimeType: 'application/pdf'
      });
      alert('Document uploaded and compliance record updated!');
      setShowUploadModal(false);
      loadDocs();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  const columns: Column<SupplierDocument>[] = [
    {
      header: 'Document Name & Type',
      cell: (d) => (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs text-blue-400 font-bold">{d.document_type}</span>
            <p className="text-sm font-bold text-white tracking-tight">{d.document_name}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Certificate / Doc No',
      cell: (d) => <span className="font-mono text-xs text-slate-300">{d.document_number || 'N/A'}</span>
    },
    {
      header: 'Expiry Date',
      cell: (d) => {
        const isExpiring = d.status === 'Expiring Soon';
        const isExpired = d.status === 'Expired';
        return (
          <div className="space-y-0.5 font-mono">
            <span className={`text-xs font-bold ${isExpiring ? 'text-amber-400' : isExpired ? 'text-rose-400' : 'text-slate-300'}`}>
              {d.expiry_date || 'No Expiry'}
            </span>
            {isExpiring && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1 font-sans font-semibold">
                <AlertTriangle className="w-3 h-3" /> Expiry Alert (Within 90 Days)
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: 'Verification Status',
      cell: (d) => <StatusBadge status={d.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Compliance Document Vault</h2>
          <p className="text-xs text-slate-400 mt-1">
            Maintain valid legal certifications, tax clearances, and ISO credentials with automated 90/60/30-day expiry notifications.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Renew Document</span>
        </button>
      </div>

      <DataTable
        title="Compliance Vault"
        data={documents}
        columns={columns}
        searchPlaceholder="Search document name, type, number..."
        statusFilterKey="status"
        statusOptions={['Valid', 'Expiring Soon', 'Expired']}
      />

      {/* Upload Document Modal */}
      {showUploadModal && (
        <Modal isOpen={true} onClose={() => setShowUploadModal(false)} title="Upload Compliance Document" maxWidth="md">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Document Type *</label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              >
                <option value="Commercial Registration">Commercial Registration / Trade License</option>
                <option value="Tax Clearance Certificate">Tax Clearance Certificate / Tax ID</option>
                <option value="ISO Certification">ISO 9001 / ISO 27001 Certification</option>
                <option value="Bank Account Verification">Bank Account Verification Letter</option>
                <option value="Insurance Policy">Commercial General Liability Insurance</option>
                <option value="Other Compliance Doc">Other Compliance Document</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Document Name / Title *</label>
              <input
                type="text"
                value={formData.documentName}
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Certificate / Document Number</label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Issue Date</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 text-center space-y-2">
              <Upload className="w-6 h-6 text-blue-400 mx-auto" />
              <p className="text-xs text-slate-300">Drag and drop file here or browse</p>
              <p className="text-[10px] text-slate-500 font-mono">PDF, PNG, JPG up to 10MB</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadDoc}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Save Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

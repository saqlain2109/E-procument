import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, AlertTriangle, RefreshCw, Eye, DollarSign, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { Invoice } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export const Invoices3WayMatch: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [matchingInProgress, setMatchingInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await api.getInvoices();
      setInvoices(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewInvoiceDetail = async (id: string) => {
    try {
      const res = await api.getInvoiceDetail(id);
      setSelectedInvoice(res);
    } catch (e) {
      alert('Failed to load invoice details');
    }
  };

  const handleRunMatch = async (id: string) => {
    setMatchingInProgress(id);
    try {
      const res = await api.run3WayMatch(id);
      alert(res.message);
      loadInvoices();
      if (selectedInvoice && selectedInvoice.invoice.id === id) {
        viewInvoiceDetail(id);
      }
    } catch (err: any) {
      alert(err.message || 'Match calculation failed');
    } finally {
      setMatchingInProgress(null);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice Number & PO Ref',
      cell: (inv) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{inv.invoice_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">against PO {inv.po_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Supplier',
      cell: (inv) => (
        <div>
          <p className="font-bold text-white text-xs">{inv.supplier_name}</p>
          <span className="text-[11px] text-slate-400 font-mono">{inv.supplier_code}</span>
        </div>
      )
    },
    {
      header: 'Billed Total',
      cell: (inv) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          ${inv.total_amount.toLocaleString()}
        </span>
      )
    },
    {
      header: '3-Way Match Verification',
      cell: (inv) => {
        const isException = inv.matching_status === 'Exception';
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isException
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isException ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {inv.matching_status}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Workflow Status',
      cell: (inv) => <StatusBadge status={inv.status} size="sm" />
    },
    {
      header: 'Actions',
      cell: (inv) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => viewInvoiceDetail(inv.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all border border-blue-500/30"
          >
            <Eye className="w-3.5 h-3.5" /> Inspect
          </button>
          <button
            onClick={() => handleRunMatch(inv.id)}
            disabled={matchingInProgress === inv.id}
            title="Re-run 3-Way Matching Engine"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${matchingInProgress === inv.id ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Invoices & 3-Way Match Verification</h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated tolerance verification matching Purchase Orders $\leftrightarrow$ Goods Receipt Notes (GRN) $\leftrightarrow$ Vendor Invoices.
          </p>
        </div>
      </div>

      <DataTable
        title="Accounts Payable Invoices"
        data={invoices}
        columns={columns}
        searchPlaceholder="Search invoice number, PO, supplier..."
        statusFilterKey="matching_status"
        statusOptions={['Matched', 'Exception', 'Under Verification']}
      />

      {/* Invoice & 3-Way Discrepancy Inspection Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`3-Way Match Audit: Invoice ${selectedInvoice.invoice.invoice_number}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400">Supplier:</span>
                <p className="font-bold text-white mt-0.5">{selectedInvoice.invoice.supplier_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Associated PO:</span>
                <p className="font-bold text-blue-400 font-mono mt-0.5">{selectedInvoice.invoice.po_number}</p>
              </div>
              <div>
                <span className="text-slate-400">Invoiced Amount:</span>
                <p className="font-mono font-bold text-emerald-400 mt-0.5">${selectedInvoice.invoice.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-400">3-Way Match Status:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedInvoice.invoice.matching_status} size="sm" />
                </div>
              </div>
            </div>

            {/* Discrepancy Alert Box if Exception */}
            {selectedInvoice.invoice.matching_status === 'Exception' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Automated 3-Way Match Exceptions Detected</span>
                </div>
                <p className="text-slate-300">
                  The automated verification engine found line item discrepancies between the vendor invoice and the dock Goods Received Note (GRN):
                </p>

                {/* Parsed Clean Discrepancy Breakdown */}
                {selectedInvoice.invoice.discrepancy_details && (
                  <div className="space-y-2">
                    {(() => {
                      let list: any[] = [];
                      try {
                        const parsed = typeof selectedInvoice.invoice.discrepancy_details === 'string'
                          ? JSON.parse(selectedInvoice.invoice.discrepancy_details)
                          : selectedInvoice.invoice.discrepancy_details;
                        list = Array.isArray(parsed) ? parsed : [parsed];
                      } catch (e) {
                        list = [{ reason: selectedInvoice.invoice.discrepancy_details }];
                      }

                      return list.map((disc: any, dIdx: number) => (
                        <div
                          key={dIdx}
                          className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-xs space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-white text-sm">
                              {disc.description || `Line Item #${disc.itemNumber || dIdx + 1}`}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              ⚠️ Variance Exception
                            </span>
                          </div>

                          <div className="text-rose-200 font-semibold flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{disc.reason || 'Discrepancy detected during 3-Way matching verification'}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 font-mono text-[11px] bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-400 block font-sans text-[10px]">PO Ordered Qty:</span>
                              <span className="font-bold text-white">{disc.poQty ?? '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans text-[10px]">Dock Received (GRN):</span>
                              <span className="font-bold text-amber-400">{disc.grnQty ?? 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans text-[10px]">Invoiced Billed Qty:</span>
                              <span className="font-bold text-rose-400">{disc.invQty ?? '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans text-[10px]">Quantity Variance:</span>
                              <span className="font-bold text-rose-400">
                                {disc.quantityVariance !== undefined ? `+${disc.quantityVariance} Qty` : 'Mismatch'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}


            {/* Line Items Comparison Table */}
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Item Description</th>
                    <th className="px-4 py-3">Invoiced Qty</th>
                    <th className="px-4 py-3">PO Unit Price</th>
                    <th className="px-4 py-3">Invoiced Unit Price</th>
                    <th className="px-4 py-3">Variance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedInvoice.items?.map((it: any) => {
                    const hasVariance = it.variance_qty > 0 || it.variance_price > 0;
                    return (
                      <tr key={it.id} className={hasVariance ? 'bg-rose-500/5' : ''}>
                        <td className="px-4 py-3 font-bold text-white">{it.description || it.po_description}</td>
                        <td className="px-4 py-3 font-mono">{it.quantity}</td>
                        <td className="px-4 py-3 font-mono">${it.po_unit_price?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-100">${it.unit_price.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {hasVariance ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1 font-mono">
                              <AlertTriangle className="w-3.5 h-3.5" /> Price Diff: +${it.variance_price}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Perfect Match
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => handleRunMatch(selectedInvoice.invoice.id)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-Evaluate 3-Way Match
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

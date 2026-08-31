import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import { api } from '../../api/client';
import { DataTable, Column } from '../../components/common/DataTable';

export const ReportsAnalytics: React.FC = () => {
  const [reportType, setReportType] = useState<'spend' | 'suppliers' | 'financial' | 'compliance'>('spend');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [reportType]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (reportType === 'spend') {
        const prs = await api.getRequisitions();
        setData(prs);
      } else if (reportType === 'suppliers') {
        const sups = await api.getSuppliers();
        setData(sups);
      } else if (reportType === 'financial') {
        const invs = await api.getInvoices();
        setData(invs);
      } else if (reportType === 'compliance') {
        const risks = await api.getRiskMatrix();
        setData(risks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getColumns = (): Column<any>[] => {
    if (reportType === 'spend') {
      return [
        { header: 'Requisition Ref', accessorKey: 'request_number' },
        { header: 'Department', accessorKey: 'department_name' },
        { header: 'Category', accessorKey: 'procurement_category' },
        { header: 'Title', accessorKey: 'title' },
        { header: 'Estimated Total ($)', cell: (r) => `$${r.estimated_total.toLocaleString()}` },
        { header: 'Status', accessorKey: 'status' }
      ];
    } else if (reportType === 'suppliers') {
      return [
        { header: 'Supplier Code', accessorKey: 'supplier_code' },
        { header: 'Legal Entity', accessorKey: 'legal_name' },
        { header: 'Country', accessorKey: 'country' },
        { header: 'Risk Rating', accessorKey: 'risk_rating' },
        { header: 'Performance Score', cell: (r) => `${r.performance_score}%` },
        { header: 'Status', accessorKey: 'status' }
      ];
    } else if (reportType === 'financial') {
      return [
        { header: 'Invoice Number', accessorKey: 'invoice_number' },
        { header: 'Supplier', accessorKey: 'supplier_name' },
        { header: 'PO Ref', accessorKey: 'po_number' },
        { header: 'Billed Amount ($)', cell: (r) => `$${r.total_amount.toLocaleString()}` },
        { header: '3-Way Match', accessorKey: 'matching_status' },
        { header: 'Status', accessorKey: 'status' }
      ];
    } else {
      return [
        { header: 'Supplier Entity', accessorKey: 'supplier_name' },
        { header: 'Cybersecurity Score', cell: (r) => `${r.cybersecurity_score}%` },
        { header: 'Financial Score', cell: (r) => `${r.financial_score}%` },
        { header: 'Compliance Score', cell: (r) => `${r.compliance_score}%` },
        { header: 'Risk Rating', accessorKey: 'overall_risk_rating' },
        { header: 'Mitigation Plan', accessorKey: 'mitigation_plan' }
      ];
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Executive Reports & BI Export</h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export consolidated procurement spend, vendor registers, accounts payable, and compliance reports.
          </p>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 bg-slate-850 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {[
          { id: 'spend', label: 'Procurement Spend by Department' },
          { id: 'suppliers', label: 'Supplier Register & Performance' },
          { id: 'financial', label: 'Financial & Invoice Matching' },
          { id: 'compliance', label: 'Compliance & Risk Governance' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === t.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTable
        title={`Report: ${reportType.toUpperCase()}`}
        data={data}
        columns={getColumns()}
        searchPlaceholder="Filter report records..."
      />
    </div>
  );
};

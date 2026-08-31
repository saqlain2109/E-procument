import React, { useState, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Filter, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  title?: string;
  actions?: React.ReactNode;
  statusFilterKey?: keyof T;
  statusOptions?: string[];
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFields,
  title,
  actions,
  statusFilterKey,
  statusOptions
}: Props<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Status Filter
      if (statusFilterKey && selectedStatus !== 'ALL') {
        if (String(item[statusFilterKey]) !== selectedStatus) {
          return false;
        }
      }

      // 2. Search Text
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        });
      }

      // Fallback: search all values
      return Object.values(item).some(
        (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm, selectedStatus, statusFilterKey, searchFields]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `${title || 'Export'}_${Date.now()}.xlsx`);
  };

  // Export to CSV
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || 'Export'}_${Date.now()}.csv`;
    link.click();
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.text(title || 'Data Report', 14, 15);

    const headers = columns.map((c) => c.header);
    const rows = filteredData.map((row) =>
      columns.map((c) => {
        if (c.accessorKey) return String(row[c.accessorKey] ?? '');
        return '';
      })
    );

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    doc.save(`${title || 'Export'}_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {title && <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>}

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          {statusOptions && (
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl p-1">
            <button
              onClick={exportToExcel}
              title="Export to Excel"
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={exportToPDF}
              title="Export to PDF"
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={exportToCSV}
              title="Export to CSV"
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Custom Action Buttons */}
          {actions}
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700/50 shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/90 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-700">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-5 py-4">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-700/30 transition-colors duration-150">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-5 py-4 whitespace-nowrap">
                        {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey] ?? '') : ''}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/60 border-t border-slate-700 text-xs text-slate-400">
          <div>
            Showing <span className="font-medium text-white">{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium text-white">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{' '}
            <span className="font-medium text-white">{filteredData.length}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

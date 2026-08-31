import React, { useState, useEffect } from 'react';
import { Truck, Plus, Eye, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { GoodsReceipt } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SupplierDeliveries: React.FC = () => {
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGRNs();
  }, []);

  const loadGRNs = async () => {
    try {
      const res = await api.getGRNs();
      setGrns(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<GoodsReceipt>[] = [
    {
      header: 'Delivery Ref & Waybill',
      cell: (g) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-blue-400">{g.grn_number}</span>
            <p className="text-[11px] text-slate-400 font-mono">Waybill: {g.delivery_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Associated PO',
      cell: (g) => <span className="font-mono text-xs font-bold text-slate-200">{g.po_number}</span>
    },
    {
      header: 'Delivery Date',
      cell: (g) => <span className="text-xs text-slate-400 font-mono">{g.delivery_date}</span>
    },
    {
      header: 'Inspection Status',
      cell: (g) => <StatusBadge status={g.status} size="sm" />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Shipments & Deliveries (GRN)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Track warehouse receiving dock inspection notes, accepted quantities, and delivery status.
        </p>
      </div>

      <DataTable
        title="Delivery Records"
        data={grns}
        columns={columns}
        searchPlaceholder="Search delivery ref, PO..."
      />
    </div>
  );
};

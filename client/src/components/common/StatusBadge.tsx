import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, FileText, Ban, RefreshCw } from 'lucide-react';

interface Props {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'qualified':
      case 'preferred':
      case 'completed':
      case 'matched':
      case 'paid':
      case 'valid':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
          dot: 'bg-emerald-400'
        };

      case 'pending':
      case 'submitted':
      case 'under review':
      case 'under verification':
      case 'under evaluation':
      case 'pending approval':
      case 'approval':
      case 'scheduled':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock,
          dot: 'bg-amber-400'
        };

      case 'exception':
      case 'clarification required':
      case 'clarification requested':
      case 'partially delivered':
      case 'expiring soon':
      case 'sent back':
        return {
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          icon: AlertTriangle,
          dot: 'bg-orange-400'
        };

      case 'rejected':
      case 'unsuccessful':
      case 'disqualified':
      case 'cancelled':
      case 'failed':
      case 'expired':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: XCircle,
          dot: 'bg-rose-400'
        };

      case 'suspended':
      case 'blacklisted':
      case 'debarred':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: Ban,
          dot: 'bg-purple-400'
        };

      case 'published':
      case 'question period':
      case 'bid submission':
      case 'sent to supplier':
      case 'supplier accepted':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: RefreshCw,
          dot: 'bg-blue-400'
        };

      case 'draft':
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          icon: FileText,
          dot: 'bg-slate-400'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-sm gap-2 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${sizeClasses[size]} tracking-wide transition-all`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <span>{status || 'Unknown'}</span>
    </span>
  );
};

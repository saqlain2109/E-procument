import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  onClick?: () => void;
}

export const MetricCard: React.FC<Props> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  accentColor = 'blue',
  onClick
}) => {
  const colorMap = {
    blue: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20 text-blue-400 group-hover:border-blue-500/40',
    emerald: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/40',
    amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400 group-hover:border-amber-500/40',
    purple: 'from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/40',
    rose: 'from-rose-500/10 to-red-500/10 border-rose-500/20 text-rose-400 group-hover:border-rose-500/40'
  };

  const iconBgMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[accentColor]} border p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${iconBgMap[accentColor]} transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtext || trend) && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/50 pt-3">
          <span>{subtext}</span>
          {trend && (
            <span className={`inline-flex items-center gap-1 font-semibold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

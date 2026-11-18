import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface StatDiffRow {
  label: string;
  current: string | number;
  next: string | number;
  delta?: string;
}

export const UpgradeStatDiff: React.FC<{
  rows: StatDiffRow[];
  title?: string;
}> = ({ rows, title = 'Dự kiến khi nâng cấp' }) => {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl bg-slate-950/90 border border-emerald-400/30 p-2.5 text-left">
      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-1.5">
        {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-2 text-[11px] bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1"
          >
            <span className="text-slate-300 font-semibold truncate">{r.label}</span>
            <span className="font-mono-nums font-bold flex items-center gap-1 shrink-0">
              <span className="text-slate-400">{r.current}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="text-white">{r.next}</span>
              {r.delta && <span className="text-emerald-300 font-black">({r.delta})</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

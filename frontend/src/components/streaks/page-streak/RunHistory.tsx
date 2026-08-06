'use client';

import React from 'react';
import { HistoryEntry } from '@/types/pageStreak';

interface RunHistoryProps {
  history: HistoryEntry[];
  iconByPerk?: Record<string, string>;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const RunHistory: React.FC<RunHistoryProps> = ({ history, iconByPerk = {} }) => {
  if (history.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-600">No matches reported yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-slate-600">
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Attempt</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Page</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Build</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Result</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, index) => (
            <tr key={`${entry.attempt}-${entry.page_number}-${index}`} className="text-slate-400">
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.attempt}</td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.page_number}</td>
              <td className="border-b border-slate-900 px-2 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.perks.map((perk) => (
                    <span
                      key={perk}
                      title={perk}
                      className="grid h-9 w-9 flex-none place-items-center bg-orange-400/60"
                      style={{ clipPath: DIAMOND }}
                    >
                      <span
                        className="grid h-[82%] w-[82%] place-items-center bg-gradient-to-br from-amber-900/80 to-slate-950"
                        style={{ clipPath: DIAMOND }}
                      >
                        {iconByPerk[perk] && (
                          <img src={iconByPerk[perk]} alt={perk} className="h-[96%] w-[96%] object-contain" />
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="border-b border-slate-900 px-2 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                    entry.result === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {entry.result}
                </span>
              </td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">
                {new Date(entry.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

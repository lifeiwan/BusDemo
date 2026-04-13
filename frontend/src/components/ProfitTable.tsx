import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfitRow } from '../types';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type SortCol = 'revenue' | 'accountsReceivable' | 'costs' | 'cogs' | 'ga' | 'netProfit' | 'margin';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-30">⇅</span>;
  return <span className="ml-1">{dir === 'desc' ? '↓' : '↑'}</span>;
}

interface Props {
  rows: ProfitRow[];
  showAR?: boolean;
  showCostSplit?: boolean;
}

export default function ProfitTable({ rows, showAR, showCostSplit }: Props) {
  const { t } = useTranslation();
  const colSpan = 5 + (showAR ? 1 : 0) + (showCostSplit ? 1 : 0);

  const [sortCol, setSortCol] = useState<SortCol>('netProfit');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  function thCls(col: SortCol) {
    return `text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${
      sortCol === col ? 'text-blue-600' : 'text-slate-500'
    }`;
  }

  const sorted = [...rows].sort((a, b) => {
    let av = 0, bv = 0;
    switch (sortCol) {
      case 'revenue':           av = a.revenue;                    bv = b.revenue; break;
      case 'accountsReceivable':av = a.accountsReceivable ?? 0;    bv = b.accountsReceivable ?? 0; break;
      case 'costs':             av = a.costs;                      bv = b.costs; break;
      case 'cogs':              av = a.cogs ?? 0;                  bv = b.cogs ?? 0; break;
      case 'ga':                av = a.ga ?? 0;                    bv = b.ga ?? 0; break;
      case 'netProfit':         av = a.netProfit;                  bv = b.netProfit; break;
      case 'margin':            av = a.margin;                     bv = b.margin; break;
    }
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.rank')}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.name')}</th>

            <th className={thCls('revenue')} onClick={() => handleSort('revenue')}>
              {t('profitTable.revenue')}<SortIcon active={sortCol === 'revenue'} dir={sortDir} />
            </th>

            {showAR && (
              <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${sortCol === 'accountsReceivable' ? 'text-blue-600' : 'text-amber-600'}`}
                onClick={() => handleSort('accountsReceivable')}>
                {t('profitTable.accountsReceivable')}<SortIcon active={sortCol === 'accountsReceivable'} dir={sortDir} />
              </th>
            )}

            {showCostSplit ? (
              <>
                <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${sortCol === 'cogs' ? 'text-blue-600' : 'text-orange-600'}`}
                  onClick={() => handleSort('cogs')}>
                  {t('profitTable.cogs')}<SortIcon active={sortCol === 'cogs'} dir={sortDir} />
                </th>
                <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${sortCol === 'ga' ? 'text-blue-600' : 'text-purple-600'}`}
                  onClick={() => handleSort('ga')}>
                  {t('profitTable.ga')}<SortIcon active={sortCol === 'ga'} dir={sortDir} />
                </th>
              </>
            ) : (
              <th className={thCls('costs')} onClick={() => handleSort('costs')}>
                {t('profitTable.costs')}<SortIcon active={sortCol === 'costs'} dir={sortDir} />
              </th>
            )}

            <th className={thCls('netProfit')} onClick={() => handleSort('netProfit')}>
              {t('profitTable.netProfit')}<SortIcon active={sortCol === 'netProfit'} dir={sortDir} />
            </th>

            <th className={thCls('margin')} onClick={() => handleSort('margin')}>
              {t('profitTable.margin')}<SortIcon active={sortCol === 'margin'} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
              <td className="px-4 py-3 text-right text-slate-700">{fmt$(row.revenue)}</td>
              {showAR && (
                <td className="px-4 py-3 text-right">
                  <span className={`font-semibold ${(row.accountsReceivable ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {fmt$(row.accountsReceivable ?? 0)}
                  </span>
                </td>
              )}
              {showCostSplit ? (
                <>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt$(row.cogs ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt$(row.ga ?? 0)}</td>
                </>
              ) : (
                <td className="px-4 py-3 text-right text-red-600">{fmt$(row.costs)}</td>
              )}
              <td className={`px-4 py-3 text-right font-semibold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {row.netProfit < 0 ? '-' : ''}{fmt$(row.netProfit)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`text-xs font-semibold ${row.margin >= 20 ? 'text-green-600' : row.margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {row.margin.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">{t('common.noData')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

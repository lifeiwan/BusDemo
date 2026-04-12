import { useTranslation } from 'react-i18next';
import type { ProfitRow } from '../types';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface Props {
  rows: ProfitRow[];
  showAR?: boolean;
  showCostSplit?: boolean;
}

export default function ProfitTable({ rows, showAR, showCostSplit }: Props) {
  const { t } = useTranslation();
  const colSpan = 5 + (showAR ? 1 : 0) + (showCostSplit ? 1 : 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.rank')}</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.name')}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.revenue')}</th>
            {showAR && <th className="text-right px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wide">{t('profitTable.accountsReceivable')}</th>}
            {showCostSplit ? (
              <>
                <th className="text-right px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">{t('profitTable.cogs')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-purple-600 uppercase tracking-wide">{t('profitTable.ga')}</th>
              </>
            ) : (
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.costs')}</th>
            )}
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.netProfit')}</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('profitTable.margin')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">{t('common.noData')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

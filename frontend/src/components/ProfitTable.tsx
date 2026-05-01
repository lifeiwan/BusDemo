import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfitRow } from '../types';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type SortCol = 'revenue' | 'accountsReceivable' | 'costs' | 'cogs' | 'ga' | 'netProfit' | 'margin' | 'fuelCost' | 'maintenanceCost' | 'driverPayroll' | 'driverFees';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-30">⇅</span>;
  return <span className="ml-1">{dir === 'desc' ? '↓' : '↑'}</span>;
}

interface Props {
  rows: ProfitRow[];
  showAR?: boolean;
  showCostSplit?: boolean;
  showVehicleCosts?: boolean;
  showDriverCosts?: boolean;
}

export default function ProfitTable({ rows, showAR, showCostSplit, showVehicleCosts, showDriverCosts }: Props) {
  const { t } = useTranslation();

  const defaultSort: SortCol = showVehicleCosts || showDriverCosts ? 'revenue' : 'netProfit';
  const [sortCol, setSortCol] = useState<SortCol>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  function thCls(col: SortCol, colorClass = 'text-slate-500') {
    return `text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 transition-colors ${
      sortCol === col ? 'text-blue-600' : colorClass
    }`;
  }

  const sorted = [...rows].sort((a, b) => {
    const val = (r: ProfitRow): number => {
      switch (sortCol) {
        case 'revenue':           return r.revenue;
        case 'accountsReceivable':return r.accountsReceivable ?? 0;
        case 'costs':             return r.costs;
        case 'cogs':              return r.cogs ?? 0;
        case 'ga':                return r.ga ?? 0;
        case 'netProfit':         return r.netProfit;
        case 'margin':            return r.margin;
        case 'fuelCost':          return r.fuelCost ?? 0;
        case 'maintenanceCost':   return r.maintenanceCost ?? 0;
        case 'driverPayroll':     return r.driverPayroll ?? 0;
        case 'driverFees':        return r.driverFees ?? 0;
      }
    };
    return sortDir === 'desc' ? val(b) - val(a) : val(a) - val(b);
  });

  // Compute colSpan for empty state
  let colSpan = 4; // rank + name + revenue + costs (baseline)
  if (showAR) colSpan++;
  if (showCostSplit) colSpan += 2; // cogs + ga instead of costs
  if (!showVehicleCosts && !showDriverCosts) colSpan += 2; // netProfit + margin
  if (showVehicleCosts) colSpan += 2; // fuel + maintenance
  if (showDriverCosts) colSpan += 2; // payroll + fees

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
              <th className={thCls('accountsReceivable', 'text-amber-600')} onClick={() => handleSort('accountsReceivable')}>
                {t('profitTable.accountsReceivable')}<SortIcon active={sortCol === 'accountsReceivable'} dir={sortDir} />
              </th>
            )}

            {/* ── Vehicle cost columns ── */}
            {showVehicleCosts ? (
              <>
                <th className={thCls('costs')} onClick={() => handleSort('costs')}>
                  {t('profitTable.costs')}<SortIcon active={sortCol === 'costs'} dir={sortDir} />
                </th>
                <th className={thCls('fuelCost', 'text-orange-600')} onClick={() => handleSort('fuelCost')}>
                  {t('profitTable.fuelCost')}<SortIcon active={sortCol === 'fuelCost'} dir={sortDir} />
                </th>
                <th className={thCls('maintenanceCost', 'text-purple-600')} onClick={() => handleSort('maintenanceCost')}>
                  {t('profitTable.maintenanceCost')}<SortIcon active={sortCol === 'maintenanceCost'} dir={sortDir} />
                </th>
              </>
            ) : showDriverCosts ? (
              <>
                <th className={thCls('driverPayroll', 'text-orange-600')} onClick={() => handleSort('driverPayroll')}>
                  {t('profitTable.driverPayroll')}<SortIcon active={sortCol === 'driverPayroll'} dir={sortDir} />
                </th>
                <th className={thCls('driverFees', 'text-purple-600')} onClick={() => handleSort('driverFees')}>
                  {t('profitTable.driverFees')}<SortIcon active={sortCol === 'driverFees'} dir={sortDir} />
                </th>
              </>
            ) : showCostSplit ? (
              <>
                <th className={thCls('cogs', 'text-orange-600')} onClick={() => handleSort('cogs')}>
                  {t('profitTable.cogs')}<SortIcon active={sortCol === 'cogs'} dir={sortDir} />
                </th>
                <th className={thCls('ga', 'text-purple-600')} onClick={() => handleSort('ga')}>
                  {t('profitTable.ga')}<SortIcon active={sortCol === 'ga'} dir={sortDir} />
                </th>
              </>
            ) : (
              <th className={thCls('costs')} onClick={() => handleSort('costs')}>
                {t('profitTable.costs')}<SortIcon active={sortCol === 'costs'} dir={sortDir} />
              </th>
            )}

            {/* ── Net profit + margin — hidden for vehicle/driver tabs ── */}
            {!showVehicleCosts && !showDriverCosts && (
              <>
                <th className={thCls('netProfit')} onClick={() => handleSort('netProfit')}>
                  {t('profitTable.netProfit')}<SortIcon active={sortCol === 'netProfit'} dir={sortDir} />
                </th>
                <th className={thCls('margin')} onClick={() => handleSort('margin')}>
                  {t('profitTable.margin')}<SortIcon active={sortCol === 'margin'} dir={sortDir} />
                </th>
              </>
            )}
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

              {showVehicleCosts ? (
                <>
                  <td className="px-4 py-3 text-right text-red-600">{fmt$(row.costs)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt$(row.fuelCost ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt$(row.maintenanceCost ?? 0)}</td>
                </>
              ) : showDriverCosts ? (
                <>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt$(row.driverPayroll ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt$(row.driverFees ?? 0)}</td>
                </>
              ) : showCostSplit ? (
                <>
                  <td className="px-4 py-3 text-right text-orange-600">{fmt$(row.cogs ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmt$(row.ga ?? 0)}</td>
                </>
              ) : (
                <td className="px-4 py-3 text-right text-red-600">{fmt$(row.costs)}</td>
              )}

              {!showVehicleCosts && !showDriverCosts && (
                <>
                  <td className={`px-4 py-3 text-right font-semibold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.netProfit < 0 ? '-' : ''}{fmt$(row.netProfit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-semibold ${row.margin >= 20 ? 'text-green-600' : row.margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.margin.toFixed(1)}%
                    </span>
                  </td>
                </>
              )}
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

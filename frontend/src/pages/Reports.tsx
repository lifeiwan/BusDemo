import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { buildPLReport, sumMonths, cogsTotal, gaTotal, netProfit } from '../lib/report';
import type { PLMonthData } from '../lib/report';
import { GA_CATEGORIES } from '../data/gaEntries';

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function fmt(n: number): string {
  if (n === 0) return '—';
  const abs = '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `(${abs})` : abs;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Table sub-components ──────────────────────────────────

function SectionHeader({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-slate-700">
      <td className="px-4 py-2 text-xs font-bold text-slate-100 uppercase tracking-widest sticky left-0 bg-slate-700 z-10">
        {label}
      </td>
      {Array.from({ length: colCount }).map((_, i) => <td key={i} className="bg-slate-700" />)}
    </tr>
  );
}

function DataRow({ label, values, color = 'slate', bold = false, indent = true }: {
  label: string; values: number[];
  color?: 'slate' | 'red' | 'green'; bold?: boolean; indent?: boolean;
}) {
  const textCls = color === 'red' ? 'text-red-600' : color === 'green' ? 'text-green-600' : 'text-slate-700';
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 ${bold ? 'bg-slate-50' : ''}`}>
      <td className={`px-4 py-2 text-sm sticky left-0 z-10 ${bold ? 'bg-slate-50 font-semibold text-slate-700' : 'bg-white text-slate-600'} ${indent ? 'pl-8' : ''}`}>
        {label}
      </td>
      {values.map((v, i) => {
        const isYtd = i === values.length - 1;
        return (
          <td key={i} className={`px-3 py-2 text-right text-sm whitespace-nowrap ${textCls} ${bold ? 'font-semibold' : ''} ${isYtd ? 'border-l border-slate-200 font-semibold' : ''}`}>
            {fmt(v)}
          </td>
        );
      })}
    </tr>
  );
}

function ProfitRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="border-t-2 border-slate-300 bg-slate-100">
      <td className="px-4 py-3 text-sm font-bold text-slate-800 sticky left-0 bg-slate-100 z-10">
        {label}
      </td>
      {values.map((v, i) => {
        const isYtd = i === values.length - 1;
        return (
          <td key={i} className={`px-3 py-3 text-right text-sm font-bold whitespace-nowrap ${v >= 0 ? 'text-green-600' : 'text-red-600'} ${isYtd ? 'border-l border-slate-200' : ''}`}>
            {fmt(v)}
          </td>
        );
      })}
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────

export default function Reports() {
  const data = useData();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    data.gaEntries.forEach(e => years.add(Number(e.date.slice(0, 4))));
    data.fuelEntries.forEach(e => years.add(Number(e.date.slice(0, 4))));
    data.maintenanceEntries.forEach(e => years.add(Number(e.date.slice(0, 4))));
    return [...years].sort((a, b) => b - a);
  }, [data, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const report = useMemo(() => buildPLReport(selectedYear, data), [selectedYear, data]);

  const isCurrentYear = selectedYear === currentYear;
  // Show months 0..currentMonth for current year, all 12 for past years
  const monthCount = isCurrentYear ? currentMonth + 1 : 12;

  const displayCols: PLMonthData[] = report.months.slice(0, monthCount);
  const ytdCol: PLMonthData = useMemo(() => sumMonths(displayCols), [displayCols]);

  // Table columns = month columns + YTD total
  const tableCols = [...displayCols, ytdCol];
  const tableLabels = [...MONTH_SHORT.slice(0, monthCount), 'YTD'];
  const colCount = tableLabels.length;

  const knownCats = new Set(GA_CATEGORIES as readonly string[]);
  const extraGaCats = useMemo(() => {
    const extra = new Set<string>();
    for (const m of displayCols) {
      for (const cat of Object.keys(m.ga)) {
        if (!knownCats.has(cat)) extra.add(cat);
      }
    }
    return [...extra].sort();
  }, [displayCols]);

  function handleExport() {
    const header = ['Category', ...tableLabels].join(',');
    function row(label: string, vals: number[]) {
      return [label, ...vals.map(v => v.toFixed(0))].join(',');
    }
    const lines = [
      `P&L Report — ${selectedYear}`,
      '',
      header,
      'REVENUE',
      row('Revenue', tableCols.map(c => c.revenue)),
      '',
      'COST OF GOODS SOLD',
      row('Driver Payroll',       tableCols.map(c => c.driverPayroll)),
      row('Fuel',                 tableCols.map(c => c.fuel)),
      row('Repair & Maintenance', tableCols.map(c => c.maintenance)),
      row('Insurance',            tableCols.map(c => c.insurance)),
      row('Loan',                 tableCols.map(c => c.loan)),
      row('ELD',                  tableCols.map(c => c.eld)),
      row('Management Fee',       tableCols.map(c => c.managementFee)),
      row('Parking & Wash',       tableCols.map(c => c.parking)),
      row('EZ-Pass',              tableCols.map(c => c.ezPass)),
      row('Other',                tableCols.map(c => c.otherCogs)),
      row('COGS Total',           tableCols.map(cogsTotal)),
      '',
      row('Gross Profit', tableCols.map(c => c.revenue - cogsTotal(c))),
      '',
      'G&A EXPENSES',
      ...GA_CATEGORIES.map(cat => row(cat, tableCols.map(c => c.ga[cat] ?? 0))),
      ...extraGaCats.map(cat => row(cat, tableCols.map(c => c.ga[cat] ?? 0))),
      row('G&A Total', tableCols.map(gaTotal)),
      '',
      row('Net Profit', tableCols.map(netProfit)),
    ];
    downloadCsv(lines.join('\n'), `PL_Report_${selectedYear}.csv`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">P&amp;L Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isCurrentYear
              ? `${MONTH_SHORT[0]}–${MONTH_SHORT[monthCount - 1]} ${selectedYear} with YTD total`
              : `Full year ${selectedYear}`}
          </p>
        </div>
        <button onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
          ↓ Export CSV
        </button>
      </div>

      {/* Year tabs */}
      <div className="flex gap-1 mb-5">
        {availableYears.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedYear === y ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {y}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide sticky left-0 bg-slate-800 z-20 min-w-[200px]">
                  {selectedYear}
                </th>
                {tableLabels.map((label, i) => (
                  <th key={i}
                    className={`px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                      label === 'YTD' ? 'text-blue-300 border-l border-slate-600' : 'text-slate-300'
                    }`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="Revenue" colCount={colCount} />
              <DataRow label="Revenue" values={tableCols.map(c => c.revenue)} color="green" />

              <SectionHeader label="Cost of Goods Sold" colCount={colCount} />
              <DataRow label="Driver Payroll"       values={tableCols.map(c => c.driverPayroll)} color="red" />
              <DataRow label="Fuel"                 values={tableCols.map(c => c.fuel)}          color="red" />
              <DataRow label="Repair & Maintenance" values={tableCols.map(c => c.maintenance)}   color="red" />
              <DataRow label="Insurance"            values={tableCols.map(c => c.insurance)}     color="red" />
              <DataRow label="Loan"                 values={tableCols.map(c => c.loan)}          color="red" />
              <DataRow label="ELD"                  values={tableCols.map(c => c.eld)}           color="red" />
              <DataRow label="Management Fee"       values={tableCols.map(c => c.managementFee)} color="red" />
              <DataRow label="Parking & Wash"       values={tableCols.map(c => c.parking)}       color="red" />
              <DataRow label="EZ-Pass"              values={tableCols.map(c => c.ezPass)}        color="red" />
              <DataRow label="Other"                values={tableCols.map(c => c.otherCogs)}     color="red" />
              <DataRow label="COGS Total"           values={tableCols.map(cogsTotal)}            color="red" bold indent={false} />

              <ProfitRow label="Gross Profit" values={tableCols.map(c => c.revenue - cogsTotal(c))} />

              <SectionHeader label="G&A Expenses" colCount={colCount} />
              {GA_CATEGORIES.map(cat => (
                <DataRow key={cat} label={cat} values={tableCols.map(c => c.ga[cat] ?? 0)} color="red" />
              ))}
              {extraGaCats.map(cat => (
                <DataRow key={cat} label={cat} values={tableCols.map(c => c.ga[cat] ?? 0)} color="red" />
              ))}
              <DataRow label="G&A Total" values={tableCols.map(gaTotal)} color="red" bold indent={false} />

              <ProfitRow label="Net Profit" values={tableCols.map(netProfit)} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

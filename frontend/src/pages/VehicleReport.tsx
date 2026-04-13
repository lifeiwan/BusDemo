import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { buildVehicleMonthReport, buildVehicleYTDReport } from '../lib/report';
import type { VehicleMonthRow } from '../lib/report';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// sentinel: 12 = YTD
const YTD = 12;

type ColKey = keyof Omit<VehicleMonthRow, 'vehicleId' | 'label'>;

const COLS: { key: ColKey; label: string }[] = [
  { key: 'revenue',       label: 'Revenue' },
  { key: 'payroll',       label: 'Payroll' },
  { key: 'fuel',          label: 'Fuel' },
  { key: 'repair',        label: 'Repair' },
  { key: 'others',        label: 'Others' },
  { key: 'ezPass',        label: 'EZ-Pass' },
  { key: 'insurance',     label: 'Insurance' },
  { key: 'managementFee', label: 'Mgmt Fee' },
  { key: 'loan',          label: 'Loan' },
  { key: 'parking',       label: 'Parking & Wash' },
  { key: 'eld',           label: 'ELD' },
  { key: 'net',           label: 'Net' },
];

function fmt(n: number): string {
  if (n === 0) return '—';
  const abs = '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `(${abs})` : abs;
}

function sumRows(rows: VehicleMonthRow[]): VehicleMonthRow {
  const acc: VehicleMonthRow = {
    vehicleId: 0, label: 'Fleet Total',
    revenue: 0, payroll: 0, fuel: 0, repair: 0, others: 0,
    ezPass: 0, insurance: 0, managementFee: 0, loan: 0, parking: 0, eld: 0, net: 0,
  };
  for (const r of rows) {
    for (const col of COLS) acc[col.key] += r[col.key];
  }
  return acc;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildCsv(label: string, rows: VehicleMonthRow[], total: VehicleMonthRow): string {
  const header = ['Vehicle', ...COLS.map(c => c.label)].join(',');
  const dataRows = [...rows, total].map(r =>
    [r.label, ...COLS.map(c => r[c.key].toFixed(0))].join(',')
  );
  return [`Vehicle Report — ${label}`, '', header, ...dataRows].join('\n');
}

export default function VehicleReport() {
  const data = useData();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    data.gaEntries.forEach(e => years.add(Number(e.date.slice(0, 4))));
    data.fuelEntries.forEach(e => years.add(Number(e.date.slice(0, 4))));
    return [...years].sort((a, b) => b - a);
  }, [data, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const isCurrentYear = selectedYear === currentYear;

  function selectYear(y: number) {
    setSelectedYear(y);
    if (y === currentYear && selectedMonth !== YTD && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }

  // YTD month count: for current year = months up to today, for past years = full 12
  const ytdMonthCount = isCurrentYear ? currentMonth + 1 : 12;

  const rows = useMemo(() => {
    if (selectedMonth === YTD) return buildVehicleYTDReport(selectedYear, ytdMonthCount, data);
    return buildVehicleMonthReport(selectedYear, selectedMonth, data);
  }, [selectedYear, selectedMonth, ytdMonthCount, data]);

  const total = useMemo(() => sumRows(rows), [rows]);

  const periodLabel = selectedMonth === YTD
    ? `YTD ${selectedYear}`
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  function handleExport() {
    const fileTag = selectedMonth === YTD ? 'YTD' : MONTH_SHORT[selectedMonth];
    downloadCsv(buildCsv(periodLabel, rows, total), `Vehicle_Report_${selectedYear}_${fileTag}.csv`);
  }

  function isDisabled(m: number) {
    return isCurrentYear && m !== YTD && m > currentMonth;
  }

  function tabCls(m: number) {
    const active = selectedMonth === m;
    const disabled = isDisabled(m);
    const isYtd = m === YTD;
    if (disabled) return 'text-slate-300 cursor-default px-3 py-1 rounded-full text-sm font-medium';
    if (active && isYtd) return 'bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium';
    if (active) return 'bg-slate-700 text-white px-3 py-1 rounded-full text-sm font-medium';
    return 'bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1 rounded-full text-sm font-medium transition-colors';
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vehicle Monthly Report</h1>
          <p className="text-sm text-slate-500 mt-1">Per-bus revenue and cost breakdown</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Year + Month pickers */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => selectYear(y)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedYear === y ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-300" />

        <div className="flex gap-1 flex-wrap">
          {MONTH_NAMES.map((name, m) => (
            <button key={m} onClick={() => !isDisabled(m) && setSelectedMonth(m)}
              disabled={isDisabled(m)} className={tabCls(m)}>
              {name}
            </button>
          ))}
          {/* YTD tab after Dec */}
          <button onClick={() => setSelectedMonth(YTD)} className={tabCls(YTD)}>
            YTD
          </button>
        </div>
      </div>

      {/* Vehicle table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-white">{periodLabel} — Per Vehicle</span>
          <span className="text-xs text-slate-400">
            {rows.filter(r => r.revenue > 0).length} of {rows.length} vehicles active
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10 min-w-[220px]">
                  Vehicle
                </th>
                {COLS.map(col => (
                  <th key={col.key}
                    className={`text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                      col.key === 'net'
                        ? 'text-slate-700 border-l border-slate-200'
                        : col.key === 'revenue'
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.vehicleId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800 sticky left-0 bg-white z-10 text-sm">
                    {row.label}
                  </td>
                  {COLS.map(col => {
                    const v = row[col.key];
                    const isNet = col.key === 'net';
                    return (
                      <td key={col.key}
                        className={`px-3 py-2.5 text-right text-sm whitespace-nowrap ${
                          isNet
                            ? `font-semibold border-l border-slate-100 ${v >= 0 ? 'text-green-600' : 'text-red-600'}`
                            : col.key === 'revenue'
                              ? 'text-green-700'
                              : 'text-red-600'
                        }`}>
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Fleet total */}
              <tr className="border-t-2 border-slate-300 bg-slate-100">
                <td className="px-4 py-2.5 text-sm font-bold text-slate-700 sticky left-0 bg-slate-100 z-10">
                  Fleet Total
                </td>
                {COLS.map(col => {
                  const v = total[col.key];
                  const isNet = col.key === 'net';
                  return (
                    <td key={col.key}
                      className={`px-3 py-2.5 text-right text-sm font-bold whitespace-nowrap ${
                        isNet
                          ? `border-l border-slate-200 ${v >= 0 ? 'text-green-600' : 'text-red-600'}`
                          : col.key === 'revenue'
                            ? 'text-green-700'
                            : 'text-red-600'
                      }`}>
                      {fmt(v)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

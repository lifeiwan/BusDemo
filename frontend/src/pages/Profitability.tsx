import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProfitTable from '../components/ProfitTable';
import {
  profitByJobGroup, profitByVehicle, profitByCustomer, profitByDriver,
  profitByMonthRange, currentMonthRange,
} from '../lib/profit';
import { useData } from '../context/DataContext';
import type { DateRange } from '../lib/profit';
import type { ProfitRow } from '../types';

type TabKey = 'jobGroup' | 'vehicle' | 'customer' | 'driver' | 'period';
const TAB_KEYS: TabKey[] = ['jobGroup', 'vehicle', 'customer', 'driver', 'period'];

const URL_TO_KEY: Record<string, TabKey> = {
  'Job Group': 'jobGroup', 'Vehicle': 'vehicle',
  'Customer': 'customer', 'Driver': 'driver', 'Period': 'period',
};

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function makePresets(): Record<string, () => DateRange> {
  return {
    thisMonth: currentMonthRange,
    last3: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      };
    },
    last6: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      };
    },
    ytd: () => {
      const now = new Date();
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      };
    },
    last12: () => {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
      };
    },
  };
}

export default function Profitability() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') ?? '';
  const initialKey: TabKey = URL_TO_KEY[urlTab] ?? 'period';
  const [activeKey, setActiveKey] = useState<TabKey>(initialKey);
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange);
  const [activePreset, setActivePreset] = useState<string>('thisMonth');
  const data = useData();

  const presets = useMemo(makePresets, []);

  function applyPreset(key: string) {
    setDateRange(presets[key]());
    setActivePreset(key);
  }

  function handleDateChange(field: 'startDate' | 'endDate', val: string) {
    setDateRange(r => ({ ...r, [field]: val }));
    setActivePreset(''); // custom range — deselect preset
  }

  const rows = useMemo((): ProfitRow[] => {
    switch (activeKey) {
      case 'jobGroup': return profitByJobGroup(dateRange, data);
      case 'vehicle':  return profitByVehicle(dateRange, data);
      case 'customer': return profitByCustomer(dateRange, data);
      case 'driver':   return profitByDriver(dateRange, data);
      case 'period':   return profitByMonthRange(dateRange, data);
    }
  }, [activeKey, dateRange, data]);

  const chartData = rows.map(r => ({
    name: r.label.length > 14 ? r.label.slice(0, 12) + '…' : r.label,
    [t('profitTable.revenue')]: Math.round(r.revenue),
    [t('profitTable.costs')]: Math.round(r.costs),
    [t('profitTable.netProfit')]: Math.round(r.netProfit),
  }));

  const presetKeys: { key: string; labelKey: string }[] = [
    { key: 'thisMonth', labelKey: 'profitability.presetThisMonth' },
    { key: 'last3',     labelKey: 'profitability.presetLast3'     },
    { key: 'last6',     labelKey: 'profitability.presetLast6'     },
    { key: 'ytd',       labelKey: 'profitability.presetYTD'       },
    { key: 'last12',    labelKey: 'profitability.presetLast12'    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">{t('profitability.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('profitability.subtitle')}</p>
      </div>

      {/* ── Date range bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Preset buttons */}
        <div className="flex gap-1 flex-wrap">
          {presetKeys.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                activePreset === p.key
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 hidden sm:block" />

        {/* Custom range inputs */}
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500 text-xs font-medium">{t('profitability.from')}</label>
          <input
            type="date"
            value={dateRange.startDate}
            max={dateRange.endDate}
            onChange={e => handleDateChange('startDate', e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-slate-500 text-xs font-medium">{t('profitability.to')}</label>
          <input
            type="date"
            value={dateRange.endDate}
            min={dateRange.startDate}
            onChange={e => handleDateChange('endDate', e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Dimension tabs ── */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {TAB_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeKey === key ? 'bg-blue-500 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t(`profitability.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => fmt$(v)} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => typeof v === 'number' ? fmt$(v) : v} />
            <Legend />
            <Bar dataKey={t('profitTable.revenue')} fill="#3b82f6" />
            <Bar dataKey={t('profitTable.costs')} fill="#ef4444" />
            <Bar dataKey={t('profitTable.netProfit')} fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <ProfitTable rows={rows} showAR={activeKey === 'customer'} showCostSplit={activeKey === 'period'} />
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProfitTable from '../components/ProfitTable';
import {
  profitByJobGroup, profitByVehicle, profitByCustomer, profitByDriver, profitByPeriod,
  currentMonthRange,
} from '../lib/profit';
import { useData } from '../context/DataContext';
import type { ProfitRow } from '../types';

const TABS = ['Job Group', 'Vehicle', 'Customer', 'Driver', 'Period'] as const;
type Tab = typeof TABS[number];

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Profitability() {
  const [searchParams] = useSearchParams();
  const initialTab = (TABS as readonly string[]).includes(searchParams.get('tab') ?? '')
    ? searchParams.get('tab') as Tab
    : 'Period';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const data = useData();
  const range = useMemo(currentMonthRange, []);

  const rows = useMemo((): ProfitRow[] => {
    switch (activeTab) {
      case 'Job Group': return profitByJobGroup(range, data);
      case 'Vehicle':   return profitByVehicle(range, data);
      case 'Customer':  return profitByCustomer(range, data);
      case 'Driver':    return profitByDriver(range, data);
      case 'Period':    return profitByPeriod(6, data);
    }
  }, [activeTab, range, data]);

  const chartData = rows.map(r => ({
    name: r.label.length > 14 ? r.label.slice(0, 12) + '…' : r.label,
    Revenue: Math.round(r.revenue),
    Costs: Math.round(r.costs),
    Profit: Math.round(r.netProfit),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Profitability</h1>
        <p className="text-sm text-slate-500 mt-1">Revenue, costs, and net profit by dimension</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab ? 'bg-blue-500 text-white' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => fmt$(v)} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => typeof v === 'number' ? fmt$(v) : v} />
            <Legend />
            <Bar dataKey="Revenue" fill="#3b82f6" />
            <Bar dataKey="Costs" fill="#ef4444" />
            <Bar dataKey="Profit" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <ProfitTable rows={rows} />
      </div>
    </div>
  );
}

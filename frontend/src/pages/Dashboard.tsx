import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import { getDashboardKPIs, currentMonthRange } from '../lib/profit';
import { useData } from '../context/DataContext';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Dashboard() {
  const data = useData();
  const range = useMemo(currentMonthRange, []);
  const kpis = useMemo(() => getDashboardKPIs(range, data), [range, data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Month-to-date performance overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue (MTD)"
          value={fmt$(kpis.totalRevenue)}
          sparkline={kpis.sparklineRevenue}
        />
        <StatCard
          label="Total Profit (MTD)"
          value={(kpis.totalProfit < 0 ? '-' : '') + fmt$(kpis.totalProfit)}
          sparkline={kpis.sparklineProfit}
          positive={kpis.totalProfit >= 0}
        />
        <StatCard label="Profit Margin" value={kpis.profitMargin.toFixed(1) + '%'} />
        <StatCard label="Top Customer" value={kpis.topCustomer} />
        <StatCard label="Most Profitable Vehicle" value={kpis.mostProfitableVehicle} />
        <StatCard label="Fleet Utilization" value={kpis.fleetUtilizationRate.toFixed(0) + '%'} />
      </div>
    </div>
  );
}

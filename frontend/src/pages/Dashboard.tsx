import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/StatCard';
import { getDashboardKPIs, currentMonthRange } from '../lib/profit';
import { useData } from '../context/DataContext';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Dashboard() {
  const { t } = useTranslation();
  const data = useData();
  const range = useMemo(currentMonthRange, []);
  const kpis = useMemo(() => getDashboardKPIs(range, data), [range, data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={t('dashboard.totalRevenue')}
          value={fmt$(kpis.totalRevenue)}
          sparkline={kpis.sparklineRevenue}
        />
        <StatCard
          label={t('dashboard.totalProfit')}
          value={(kpis.totalProfit < 0 ? '-' : '') + fmt$(kpis.totalProfit)}
          sparkline={kpis.sparklineProfit}
          positive={kpis.totalProfit >= 0}
        />
        <StatCard label={t('dashboard.profitMargin')} value={kpis.profitMargin.toFixed(1) + '%'} />
        <StatCard label={t('dashboard.topCustomer')} value={kpis.topCustomer} />
        <StatCard label={t('dashboard.mostProfitableVehicle')} value={kpis.mostProfitableVehicle} />
        <StatCard label={t('dashboard.fleetUtilization')} value={kpis.fleetUtilizationRate.toFixed(0) + '%'} />
      </div>
    </div>
  );
}

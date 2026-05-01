import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';

export default function Dashboard() {
  const { t } = useTranslation();
  const { jobs, vehicles, drivers, customers } = useData();

  const activeJobs = jobs
    .filter(j => j.status === 'active')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function vehicleLabel(id: number | null) {
    if (!id) return '—';
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.year} ${v.make} ${v.model}` : '—';
  }

  function driverLabel(id: number | null) {
    if (!id) return '—';
    return drivers.find(d => d.id === id)?.name ?? '—';
  }

  function customerLabel(id: number | null) {
    if (!id) return '—';
    return customers.find(c => c.id === id)?.name ?? '—';
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('dashboard.activeJobsSubtitle')}</p>
      </div>

      {activeJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center text-slate-400">
          {t('dashboard.noActiveJobs')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.jobName')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.date')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.vehicle')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.driver')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('dashboard.customer')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{job.name}</td>
                  <td className="px-4 py-3 text-slate-600">{job.startDate}</td>
                  <td className="px-4 py-3 text-slate-600">{vehicleLabel(job.vehicleId)}</td>
                  <td className="px-4 py-3 text-slate-600">{driverLabel(job.driverId)}</td>
                  <td className="px-4 py-3 text-slate-600">{customerLabel(job.customerId)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/ops/jobs/${job.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      {t('dashboard.enterDetails')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

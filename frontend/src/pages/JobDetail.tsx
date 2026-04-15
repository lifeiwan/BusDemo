import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import JobModal from '../components/JobModal';

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function JobDetail() {
  const { id } = useParams();
  const { jobs, jobGroups, vehicles, drivers, customers, jobLineItems } = useData();

  const { t } = useTranslation();
  const job = jobs.find(j => j.id === Number(id));
  const [editing, setEditing] = useState(false);
  if (!job) return <Navigate to="/ops/jobs" replace />;

  const jobGroup = jobGroups.find(jg => jg.id === job.jobGroupId);
  const vehicle = vehicles.find(v => v.id === job.vehicleId);
  const driver = job.driverId ? drivers.find(d => d.id === job.driverId) : null;
  const customer = customers.find(c => c.id === job.customerId);
  const lineItems = jobLineItems
    .filter(li => li.jobId === job.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const costItems = lineItems.filter(li => li.direction === 'cost');
  const incomeItems = lineItems.filter(li => li.direction === 'income');
  const totalCosts = costItems.reduce((s, li) => s + li.amount, 0);
  const totalIncome = incomeItems.reduce((s, li) => s + li.amount, 0);
  const netLineItems = totalIncome - totalCosts;

  return (
    <div>
      {editing && <JobModal editing={job} onClose={() => setEditing(false)} />}
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link to="/ops/job-groups" className="hover:text-blue-600">{t('jobDetail.breadcrumbGroups')}</Link>
          <span>/</span>
          {jobGroup && (
            <>
              <Link to="/ops/job-groups" className="hover:text-blue-600">{jobGroup.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-700">{job.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{job.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {jobGroup?.name} · {job.recurrence.replace('_', '-')} · {job.startDate}
              {job.endDate ? ` → ${job.endDate}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge value={job.status} />
            <button onClick={() => setEditing(true)}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('jobDetail.revenue')}</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(job.revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('jobDetail.driverCost')}</p>
          <p className="text-2xl font-bold text-red-600">{job.driverPayroll > 0 ? fmt$(job.driverPayroll) : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('jobDetail.paymentsReceived')}</p>
          <p className="text-2xl font-bold text-green-600">{job.paymentsReceived > 0 ? fmt$(job.paymentsReceived) : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">{t('jobDetail.accountsReceivable')}</p>
          <p className={`text-2xl font-bold ${job.revenue - job.paymentsReceived > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {fmt$(job.revenue - job.paymentsReceived)}
          </p>
        </div>
      </div>

      {/* Details + Line Items side by side */}
      <div className="grid grid-cols-3 gap-4">
        {/* Job details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 mb-4">{t('jobDetail.details')}</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.contactName')}</dt>
              <dd>
                {customer
                  ? <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline font-medium">{customer.name}</Link>
                  : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.vehicleLabel')}</dt>
              <dd>
                {vehicle
                  ? <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</Link>
                  : <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.driverLabel')}</dt>
              <dd className="font-medium text-slate-700">{driver?.name ?? <span className="text-slate-400">{t('jobDetail.unassigned')}</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.recurrenceLabel')}</dt>
              <dd className="text-slate-700 capitalize">{job.recurrence.replace('_', '-')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.startDateLabel')}</dt>
              <dd className="text-slate-700">{job.startDate}</dd>
            </div>
            {job.endDate && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.endDateLabel')}</dt>
                <dd className="text-slate-700">{job.endDate}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t('jobDetail.statusLabel')}</dt>
              <dd><Badge value={job.status} /></dd>
            </div>
          </dl>
        </div>

        {/* Line items */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">{t('jobDetail.feesTable')}</h2>
          </div>
          {lineItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-400 text-sm">{t('jobDetail.noFees')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[t('common.date'), t('jobs.feeCategory'), t('jobs.feeType'), t('jobDetail.amount'), t('common.notes')].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map(li => (
                  <tr key={li.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{li.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{li.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${li.direction === 'cost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {li.direction === 'cost' ? t('jobs.feeCost') : t('jobs.feeIncome')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${li.direction === 'cost' ? 'text-red-600' : 'text-green-600'}`}>
                      {li.direction === 'cost' ? '-' : '+'}{fmt$(li.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{li.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('jobDetail.netFees')}</td>
                  <td className={`px-4 py-3 font-bold ${netLineItems >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netLineItems >= 0 ? '+' : ''}{fmt$(netLineItems)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

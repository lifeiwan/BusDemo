import { useParams, Navigate, Link } from 'react-router-dom';
import { customers, jobs, vehicles, drivers, jobGroups } from '../data';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CustomerDetail() {
  const { id } = useParams();
  const customer = customers.find(c => c.id === Number(id));
  if (!customer) return <Navigate to="/master/customers" replace />;

  const customerJobs = jobs.filter(j => j.customerId === customer.id);
  const totalRevenue = customerJobs.reduce((s, j) => s + j.revenue, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {customer.contactName} · {customer.email} · {customer.phone}
        </p>
        {customer.notes && <p className="text-sm text-slate-400 mt-1">{customer.notes}</p>}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-slate-800">{customerJobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Revenue (All Time)</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(totalRevenue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Job', 'Group', 'Vehicle', 'Driver', 'Revenue', 'Date', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customerJobs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No jobs</td></tr>
            )}
            {customerJobs.map(job => {
              const v = vehicles.find(x => x.id === job.vehicleId);
              const d = job.driverId ? drivers.find(x => x.id === job.driverId) : null;
              const jg = jobGroups.find(x => x.id === job.jobGroupId);
              return (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{job.name}</td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {v ? (
                      <Link to={`/master/vehicles/${v.id}`} className="text-blue-600 hover:underline">
                        {v.year} {v.make} {v.model}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(job.revenue)}</td>
                  <td className="px-4 py-3 text-slate-500">{job.startDate}</td>
                  <td className="px-4 py-3"><Badge value={job.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

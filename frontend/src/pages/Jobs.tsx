import { Link } from 'react-router-dom';
import { jobs, vehicles, drivers, customers, jobGroups } from '../data';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Jobs() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">{jobs.length} total jobs</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Job', 'Group', 'Customer', 'Vehicle', 'Driver', 'Revenue', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const vehicle = vehicles.find(v => v.id === job.vehicleId);
              const driver = job.driverId ? drivers.find(d => d.id === job.driverId) : null;
              const customer = customers.find(c => c.id === job.customerId);
              const jg = jobGroups.find(x => x.id === job.jobGroupId);
              return (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{job.name}</td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {customer ? (
                      <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline">
                        {customer.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {vehicle ? (
                      <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(job.revenue)}</td>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import JobModal from '../components/JobModal';
import type { Job } from '../types';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Jobs() {
  const { jobs, vehicles, drivers, customers, jobGroups, jobLineItems, deleteJob } = useData();

  const [modal, setModal] = useState<{ open: boolean; editing: Job | null }>({ open: false, editing: null });

  function del(j: Job) {
    if (window.confirm(`Delete "${j.name}"?`)) deleteJob(j.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">{jobs.length} total jobs</p>
        </div>
        <button onClick={() => setModal({ open: true, editing: null })}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          + Add Job
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Job', 'Group', 'Customer', 'Vehicle', 'Driver', 'Revenue', 'Status', ''].map(h => (
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
              const lineItemCount = jobLineItems.filter(li => li.jobId === job.id).length;
              return (
                <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link to={`/profit/jobs/${job.id}`} className="text-blue-600 hover:underline">{job.name}</Link>
                    {lineItemCount > 0 && <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{lineItemCount} fees</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{jg?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {customer ? <Link to={`/master/customers/${customer.id}`} className="text-blue-600 hover:underline">{customer.name}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {vehicle ? <Link to={`/master/vehicles/${vehicle.id}`} className="text-blue-600 hover:underline">{vehicle.year} {vehicle.make} {vehicle.model}</Link> : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{driver?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(job.revenue)}</td>
                  <td className="px-4 py-3"><Badge value={job.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, editing: job })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                      <button onClick={() => del(job)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <JobModal editing={modal.editing} onClose={() => setModal({ open: false, editing: null })} />
      )}
    </div>
  );
}

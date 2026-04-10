import { useMemo } from 'react';
import { jobGroups, jobs } from '../data';
import { profitByJobGroup, currentMonthRange } from '../lib/profit';
import ProfitTable from '../components/ProfitTable';
import Badge from '../components/Badge';

export default function JobGroups() {
  const range = useMemo(currentMonthRange, []);
  const rows = useMemo(() => profitByJobGroup(range), [range]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Job Groups</h1>
        <p className="text-sm text-slate-500 mt-1">Route contracts and one-time job categories</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {jobGroups.map(jg => {
          const count = jobs.filter(j => j.jobGroupId === jg.id).length;
          return (
            <div key={jg.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-800">{jg.name}</span>
                <Badge value={jg.type} />
              </div>
              <p className="text-sm text-slate-500">{jg.description}</p>
              <p className="text-sm text-slate-400 mt-1">{count} job{count !== 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Profitability by Job Group (Current Month)</h2>
        </div>
        <ProfitTable rows={rows} />
      </div>
    </div>
  );
}

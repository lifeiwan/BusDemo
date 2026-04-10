import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { profitByJobGroup, currentMonthRange } from '../lib/profit';
import { useData } from '../context/DataContext';
import ProfitTable from '../components/ProfitTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import type { JobGroup } from '../types';

type FormState = Omit<JobGroup, 'id'>;
const blank: FormState = { name: '', type: 'route', description: '' };

export default function JobGroups() {
  const data = useData();
  const { jobGroups, jobs, addJobGroup, updateJobGroup, deleteJobGroup } = data;
  const range = useMemo(currentMonthRange, []);
  const rows = useMemo(() => profitByJobGroup(range, data), [range, data]);

  const [modal, setModal] = useState<{ open: boolean; editing: JobGroup | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(jg: JobGroup) { setForm({ name: jg.name, type: jg.type, description: jg.description }); setModal({ open: true, editing: jg }); }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) {
      updateJobGroup({ ...modal.editing, ...form });
    } else {
      addJobGroup(form);
    }
    close();
  }

  function del(jg: JobGroup) {
    if (window.confirm(`Delete "${jg.name}"? This cannot be undone.`)) deleteJobGroup(jg.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Job Groups</h1>
          <p className="text-sm text-slate-500 mt-1">Route contracts and one-time job categories</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          + Add Job Group
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {jobGroups.map(jg => {
          const groupJobs = jobs
            .filter(j => j.jobGroupId === jg.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));
          const displayJobs = groupJobs.slice(0, 5);
          return (
            <div key={jg.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              {/* Card header */}
              <div className="p-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{jg.name}</span>
                    <Badge value={jg.type} />
                  </div>
                  {jg.description && <p className="text-sm text-slate-500">{jg.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(jg)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                  <button onClick={() => del(jg)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                </div>
              </div>

              {/* Jobs list */}
              <div className="border-t border-slate-100 px-4 py-2 flex-1">
                {groupJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">No jobs</p>
                ) : (
                  <ul className="space-y-1">
                    {displayJobs.map(j => (
                      <li key={j.id} className="flex items-center justify-between text-sm gap-2">
                        <Link
                          to={`/profit/jobs/${j.id}`}
                          className="text-blue-600 hover:underline truncate"
                        >
                          {j.name}
                        </Link>
                        <Badge value={j.status} />
                      </li>
                    ))}
                    {groupJobs.length > 5 && (
                      <li className="text-xs text-slate-400 pt-1">
                        +{groupJobs.length - 5} more — <Link to="/profit/jobs" className="text-blue-500 hover:underline">view all</Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">{groupJobs.length} job{groupJobs.length !== 1 ? 's' : ''}</span>
                <Link
                  to="/profit/profitability?tab=Job+Group"
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium hover:underline"
                >
                  View profitability →
                </Link>
              </div>
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

      {modal.open && (
        <Modal title={modal.editing ? 'Edit Job Group' : 'Add Job Group'} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Shuttle Routes" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as JobGroup['type'] }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="route">Route (recurring)</option>
                <option value="one_time">One-Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? 'Save Changes' : 'Add Job Group'}
              </button>
              <button onClick={close} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

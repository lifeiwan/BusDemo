import { useState } from 'react';
import { useData } from '../context/DataContext';
import Modal from './Modal';
import type { Job, JobLineItem } from '../types';

type FormState = Omit<Job, 'id'>;

function blankForm(vehicleId = 0, driverId: number | null = null, customerId = 0, jobGroupId = 0): FormState {
  return {
    name: '', jobGroupId, vehicleId, driverId, customerId,
    revenue: 0, recurrence: 'one_time',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null, status: 'scheduled',
  };
}

type DraftLineItem = Omit<JobLineItem, 'id' | 'jobId'> & { _key: number };
let _keyCounter = 0;
function draftKey() { return ++_keyCounter; }

const PRESET_CATEGORIES = ['Toll', 'Parking', 'Reimbursement', 'Other'];

type FuelDraft = { enabled: boolean; gallons: string; cpg: string; odometer: string };
const blankFuelDraft = (): FuelDraft => ({ enabled: false, gallons: '', cpg: '', odometer: '' });

interface Props {
  /** null = Add mode, Job = Edit mode */
  editing: Job | null;
  onClose: () => void;
}

export default function JobModal({ editing, onClose }: Props) {
  const data = useData();
  const { jobs, vehicles, drivers, customers, jobGroups, jobLineItems,
    addJob, updateJob,
    addJobLineItem, deleteJobLineItemsByJobId,
    addFuel } = data;

  // Initialise form from editing job or blank
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? { name: editing.name, jobGroupId: editing.jobGroupId, vehicleId: editing.vehicleId, driverId: editing.driverId, customerId: editing.customerId, revenue: editing.revenue, recurrence: editing.recurrence, startDate: editing.startDate, endDate: editing.endDate, status: editing.status }
      : blankForm(vehicles[0]?.id ?? 0, null, customers[0]?.id ?? 0, jobGroups[0]?.id ?? 0)
  );

  const [draftItems, setDraftItems] = useState<DraftLineItem[]>(() =>
    editing
      ? jobLineItems.filter(li => li.jobId === editing.id).map(li => ({
          _key: draftKey(),
          date: li.date, category: li.category,
          direction: li.direction, amount: li.amount, notes: li.notes,
        }))
      : []
  );

  const [newItem, setNewItem] = useState<Omit<DraftLineItem, '_key'>>({
    date: editing?.startDate ?? new Date().toISOString().slice(0, 10),
    category: 'Toll', direction: 'cost', amount: 0, notes: '',
  });

  const [fuelDraft, setFuelDraft] = useState<FuelDraft>(blankFuelDraft);

  function addDraftItem() {
    if (!newItem.amount || Number(newItem.amount) === 0) return;
    setDraftItems(prev => [...prev, { ...newItem, amount: Number(newItem.amount), _key: draftKey() }]);
    setNewItem(prev => ({ ...prev, amount: 0, notes: '' }));
  }

  function removeDraftItem(key: number) {
    setDraftItems(prev => prev.filter(x => x._key !== key));
  }

  function save() {
    if (!form.name.trim() || !form.vehicleId || !form.customerId || !form.jobGroupId) return;
    const payload = { ...form, revenue: Number(form.revenue), endDate: form.endDate || null };

    let jobId: number;
    if (editing) {
      updateJob({ ...editing, ...payload });
      jobId = editing.id;
      deleteJobLineItemsByJobId(jobId);
    } else {
      jobId = jobs.length === 0 ? 1 : Math.max(...jobs.map(j => j.id)) + 1;
      addJob(payload);
    }

    for (const item of draftItems) {
      addJobLineItem({ jobId, date: item.date, category: item.category, direction: item.direction, amount: item.amount, notes: item.notes });
    }

    if (fuelDraft.enabled && fuelDraft.gallons && fuelDraft.cpg && form.vehicleId) {
      const gallons = parseFloat(fuelDraft.gallons);
      const cpg = parseFloat(fuelDraft.cpg);
      addFuel({
        vehicleId: form.vehicleId,
        date: form.startDate,
        gallons, cpg,
        total: parseFloat((gallons * cpg).toFixed(2)),
        odometer: fuelDraft.odometer ? parseInt(fuelDraft.odometer) : 0,
        full: true,
      });
    }

    onClose();
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = field === 'driverId'
      ? (e.target.value === '' ? null : Number(e.target.value))
      : ['vehicleId', 'customerId', 'jobGroupId'].includes(field)
        ? Number(e.target.value)
        : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  const fuelTotal = fuelDraft.gallons && fuelDraft.cpg
    ? (parseFloat(fuelDraft.gallons) * parseFloat(fuelDraft.cpg)).toFixed(2)
    : '—';

  const lineItemsTotal = draftItems.reduce((s, x) => x.direction === 'cost' ? s - x.amount : s + x.amount, 0);

  const fmt$ = (n: number) => '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <Modal title={editing ? 'Edit Job' : 'Add Job'} onClose={onClose} wide>
      <div className="space-y-5">

        {/* ── Job Details ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Name *</label>
            <input value={form.name} onChange={set('name')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Airport Shuttle Route A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Group *</label>
            <select value={form.jobGroupId} onChange={set('jobGroupId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— select —</option>
              {jobGroups.map(jg => <option key={jg.id} value={jg.id}>{jg.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
            <select value={form.customerId} onChange={set('customerId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— select —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
            <select value={form.vehicleId} onChange={set('vehicleId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>— select —</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
            <select value={form.driverId ?? ''} onChange={set('driverId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— unassigned —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Revenue ($)</label>
            <input type="number" value={form.revenue} onChange={set('revenue')} min={0}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recurrence</label>
            <select value={form.recurrence} onChange={set('recurrence')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={set('startDate')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={form.endDate ?? ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value || null }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={set('status')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* ── One-Time Fees ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">One-Time Fees &amp; Reimbursements</h3>
            {draftItems.length > 0 && (
              <span className={`text-xs font-semibold ${lineItemsTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net: {lineItemsTotal >= 0 ? '+' : ''}{fmt$(lineItemsTotal)}
              </span>
            )}
          </div>

          {draftItems.length > 0 && (
            <div className="mb-2 rounded-lg border border-slate-200 overflow-hidden text-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map(item => (
                    <tr key={item._key} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-600">{item.date}</td>
                      <td className="px-3 py-2 font-medium">{item.category}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.direction === 'cost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {item.direction === 'cost' ? 'Cost' : 'Income'}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${item.direction === 'cost' ? 'text-red-600' : 'text-green-600'}`}>
                        {item.direction === 'cost' ? '-' : '+'}{fmt$(item.amount)}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{item.notes || '—'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeDraftItem(item._key)} className="text-slate-300 hover:text-red-500 transition-colors text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Add fee / reimbursement</p>
            <div className="flex gap-1 mb-2">
              {PRESET_CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => setNewItem(x => ({ ...x, category: cat }))}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${newItem.category === cat ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Date</label>
                <input type="date" value={newItem.date}
                  onChange={e => setNewItem(x => ({ ...x, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category</label>
                <input value={newItem.category}
                  onChange={e => setNewItem(x => ({ ...x, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Toll" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select value={newItem.direction}
                  onChange={e => setNewItem(x => ({ ...x, direction: e.target.value as 'cost' | 'income' }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cost">Cost</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Amount ($)</label>
                <input type="number" value={newItem.amount} min={0} step="0.01"
                  onChange={e => setNewItem(x => ({ ...x, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notes</label>
                <input value={newItem.notes}
                  onChange={e => setNewItem(x => ({ ...x, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="optional" />
              </div>
            </div>
            <button onClick={addDraftItem}
              className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors">
              + Add
            </button>
          </div>
        </div>

        {/* ── Fuel Entry ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="fuel-toggle" checked={fuelDraft.enabled}
              onChange={e => setFuelDraft(f => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-blue-500" />
            <label htmlFor="fuel-toggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Log fuel fill-up for this job
            </label>
            {form.vehicleId > 0 && (
              <span className="text-xs text-slate-400">
                → {vehicles.find(v => v.id === form.vehicleId)?.make} {vehicles.find(v => v.id === form.vehicleId)?.model}
              </span>
            )}
          </div>

          {fuelDraft.enabled && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Gallons</label>
                  <input type="number" value={fuelDraft.gallons} min={0} step="0.001"
                    onChange={e => setFuelDraft(f => ({ ...f, gallons: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Cost per Gallon ($)</label>
                  <input type="number" value={fuelDraft.cpg} min={0} step="0.001"
                    onChange={e => setFuelDraft(f => ({ ...f, cpg: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Odometer</label>
                  <input type="number" value={fuelDraft.odometer} min={0}
                    onChange={e => setFuelDraft(f => ({ ...f, odometer: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Total (calculated)</label>
                  <div className="px-2 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded">
                    {fuelTotal !== '—' ? `$${fuelTotal}` : '—'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Entry dated {form.startDate} will appear in the vehicle's Fuel tab.
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            {editing ? 'Save Changes' : 'Add Job'}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

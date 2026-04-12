import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import type { Vehicle } from '../types';

type FormState = Omit<Vehicle, 'id'>;
const blank: FormState = { year: new Date().getFullYear(), make: '', model: '', vin: '', licensePlate: '', status: 'active', mileage: 0, color: '' };

export default function Vehicles() {
  const { t } = useTranslation();
  const { vehicles, maintenanceEntries, addVehicle, updateVehicle, deleteVehicle } = useData();

  const [modal, setModal] = useState<{ open: boolean; editing: Vehicle | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(v: Vehicle) {
    setForm({ year: v.year, make: v.make, model: v.model, vin: v.vin, licensePlate: v.licensePlate, status: v.status, mileage: v.mileage, color: v.color });
    setModal({ open: true, editing: v });
  }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.make.trim() || !form.model.trim()) return;
    const payload = { ...form, year: Number(form.year), mileage: Number(form.mileage) };
    if (modal.editing) updateVehicle({ ...modal.editing, ...payload });
    else addVehicle(payload);
    close();
  }

  function del(v: Vehicle) {
    if (window.confirm(t('vehicles.confirmDelete', { name: `${v.year} ${v.make} ${v.model}` }))) deleteVehicle(v.id);
  }

  const lastSvc = (id: number) => {
    const entries = maintenanceEntries.filter(e => e.vehicleId === id).sort((a, b) => b.date.localeCompare(a.date));
    return entries[0]?.date ?? '—';
  };

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('vehicles.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('vehicles.subtitle', { count: vehicles.length })}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('vehicles.add')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {[t('vehicles.vehicle'), t('vehicles.licensePlate'), t('vehicles.color'), t('vehicles.mileage'), t('common.status'), t('vehicles.lastService'), ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/master/vehicles/${v.id}`} className="font-medium text-blue-600 hover:underline">
                    {v.year} {v.make} {v.model}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{v.licensePlate}</td>
                <td className="px-4 py-3 text-slate-600">{v.color}</td>
                <td className="px-4 py-3 text-slate-600">{v.mileage.toLocaleString()} mi</td>
                <td className="px-4 py-3"><Badge value={v.status} /></td>
                <td className="px-4 py-3 text-slate-500">{lastSvc(v.id)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                    <button onClick={() => del(v)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <Modal title={modal.editing ? t('vehicles.editTitle') : t('vehicles.addTitle')} onClose={close}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.year')}</label>
                <input type="number" value={form.year} onChange={set('year')} min={1990} max={2030}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.make')} *</label>
                <input value={form.make} onChange={set('make')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ford" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.model')} *</label>
                <input value={form.model} onChange={set('model')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="F-150" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.licensePlate')}</label>
                <input value={form.licensePlate} onChange={set('licensePlate')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABC-1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.vin')}</label>
                <input value={form.vin} onChange={set('vin')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.color')}</label>
                <input value={form.color} onChange={set('color')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="White" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('vehicles.mileage')}</label>
                <input type="number" value={form.mileage} onChange={set('mileage')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.status')}</label>
                <select value={form.status} onChange={set('status')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">{t('status.active')}</option>
                  <option value="maintenance">{t('status.maintenance')}</option>
                  <option value="out_of_service">{t('status.out_of_service')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('vehicles.add')}
              </button>
              <button onClick={close} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

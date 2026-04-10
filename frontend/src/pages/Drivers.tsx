import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { currentMonthRange } from '../lib/profit';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import type { Driver } from '../types';

type FormState = Omit<Driver, 'id'>;
const blank: FormState = { name: '', license: '', licenseExpiry: '', phone: '', status: 'active' };

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Drivers() {
  const { t } = useTranslation();
  const data = useData();
  const { drivers, driverVehicleAssignments, vehicles, driverCosts, addDriver, updateDriver, deleteDriver } = data as typeof data & { driverVehicleAssignments: import('../types').DriverVehicleAssignment[] };
  const range = useMemo(currentMonthRange, []);

  const [modal, setModal] = useState<{ open: boolean; editing: Driver | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(d: Driver) {
    setForm({ name: d.name, license: d.license, licenseExpiry: d.licenseExpiry, phone: d.phone, status: d.status });
    setModal({ open: true, editing: d });
  }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) updateDriver({ ...modal.editing, ...form });
    else addDriver(form);
    close();
  }

  function del(d: Driver) {
    if (window.confirm(t('drivers.confirmDelete', { name: d.name }))) deleteDriver(d.id);
  }

  const currentVehicle = (driverId: number) => {
    const a = driverVehicleAssignments?.find((x: { driverId: number; endDate: string | null }) => x.driverId === driverId && !x.endDate);
    if (!a) return '—';
    const v = vehicles.find((x: { id: number }) => x.id === a.vehicleId);
    return v ? `${v.year} ${v.make} ${v.model}` : '—';
  };

  const driverCostMTD = (driverId: number) =>
    driverCosts.filter(c => c.driverId === driverId && c.date >= range.startDate && c.date <= range.endDate)
      .reduce((s, c) => s + c.amount, 0);

  const isExpiringSoon = (expiry: string) => (new Date(expiry).getTime() - Date.now()) / 86400000 < 90;

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('drivers.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('drivers.subtitle', { count: drivers.length })}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('drivers.add')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {[t('drivers.title'), t('common.phone'), t('drivers.license'), t('drivers.licenseExpiry'), t('drivers.currentVehicle'), t('drivers.costMtd'), t('common.status'), ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.license}</td>
                <td className={`px-4 py-3 text-sm ${isExpiringSoon(d.licenseExpiry) ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                  {d.licenseExpiry}
                  {isExpiringSoon(d.licenseExpiry) && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{t('drivers.expiringSoon')}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{currentVehicle(d.id)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(driverCostMTD(d.id))}</td>
                <td className="px-4 py-3"><Badge value={d.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                    <button onClick={() => del(d)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <Modal title={modal.editing ? t('drivers.editTitle') : t('drivers.addTitle')} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('drivers.fullName')} *</label>
              <input value={form.name} onChange={set('name')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('drivers.fullNamePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('drivers.license')}</label>
                <input value={form.license} onChange={set('license')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('drivers.licensePlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('drivers.licenseExpiry')}</label>
                <input type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.phone')}</label>
                <input value={form.phone} onChange={set('phone')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="555-0100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.status')}</label>
                <select value={form.status} onChange={set('status')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">{t('status.active')}</option>
                  <option value="inactive">{t('status.inactive')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('drivers.add')}
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

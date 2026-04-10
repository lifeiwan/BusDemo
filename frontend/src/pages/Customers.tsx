import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { profitByCustomer, currentMonthRange } from '../lib/profit';
import Modal from '../components/Modal';
import type { Customer } from '../types';

type FormState = Omit<Customer, 'id'>;
const blank: FormState = { name: '', contactName: '', email: '', phone: '', notes: '' };

function fmt$(n: number) {
  return '$' + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Customers() {
  const { t } = useTranslation();
  const data = useData();
  const { customers, jobs, addCustomer, updateCustomer, deleteCustomer } = data;
  const range = useMemo(currentMonthRange, []);
  const profitRows = useMemo(() => profitByCustomer(range, data), [range, data]);
  const profitMap = Object.fromEntries(profitRows.map(r => [r.id, r]));

  const [modal, setModal] = useState<{ open: boolean; editing: Customer | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(c: Customer) {
    setForm({ name: c.name, contactName: c.contactName, email: c.email, phone: c.phone, notes: c.notes });
    setModal({ open: true, editing: c });
  }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) updateCustomer({ ...modal.editing, ...form });
    else addCustomer(form);
    close();
  }

  function del(c: Customer) {
    const jobCount = jobs.filter(j => j.customerId === c.id).length;
    const msg = jobCount > 0
      ? t('customers.confirmDeleteWithJobs', { name: c.name, count: jobCount })
      : t('customers.confirmDelete', { name: c.name });
    if (window.confirm(msg)) deleteCustomer(c.id);
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('customers.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('customers.subtitle', { count: customers.length })}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('customers.add')}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {[t('customers.title'), t('customers.contactName'), t('common.email'), t('customers.totalJobs'), t('customers.revenueMtd'), t('customers.netProfitMtd'), ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const jobCount = jobs.filter(j => j.customerId === c.id).length;
              const profit = profitMap[c.id];
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/master/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.contactName}</td>
                  <td className="px-4 py-3 text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 text-slate-600">{jobCount}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{profit ? fmt$(profit.revenue) : '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${profit && profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit ? (profit.netProfit < 0 ? '-' : '') + fmt$(profit.netProfit) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                      <button onClick={() => del(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <Modal title={modal.editing ? t('customers.editTitle') : t('customers.addTitle')} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('customers.companyName')} *</label>
              <input value={form.name} onChange={set('name')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('customers.companyNamePlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('customers.contactName')}</label>
                <input value={form.contactName} onChange={set('contactName')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.phone')}</label>
                <input value={form.phone} onChange={set('phone')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="555-0100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.email')}</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.notes')}</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('customers.add')}
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

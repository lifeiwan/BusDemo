import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';
import { GA_CATEGORIES } from '../data/gaEntries';
import type { GaEntry } from '../types';

type FormState = Omit<GaEntry, 'id'>;

function blankForm(): FormState {
  return {
    category: GA_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    notes: '',
  };
}

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function GaExpenses() {
  const { t } = useTranslation();
  const { gaEntries, addGaEntry, updateGaEntry, deleteGaEntry } = useData();

  const [modal, setModal] = useState<{ open: boolean; editing: GaEntry | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blankForm);

  function openAdd() {
    setForm(blankForm());
    setModal({ open: true, editing: null });
  }

  function openEdit(entry: GaEntry) {
    setForm({ category: entry.category, date: entry.date, amount: entry.amount, notes: entry.notes });
    setModal({ open: true, editing: entry });
  }

  function save() {
    if (!form.category || !form.date || !form.amount) return;
    const payload = { ...form, amount: Number(form.amount) };
    if (modal.editing) {
      updateGaEntry({ ...modal.editing, ...payload });
    } else {
      addGaEntry(payload);
    }
    setModal({ open: false, editing: null });
  }

  function del(entry: GaEntry) {
    if (window.confirm(t('gaExpenses.confirmDelete', { date: entry.date, category: entry.category }))) {
      deleteGaEntry(entry.id);
    }
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  // Sort entries by date descending
  const sorted = useMemo(() => [...gaEntries].sort((a, b) => b.date.localeCompare(a.date)), [gaEntries]);

  // Summary by category
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of gaEntries) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [gaEntries]);

  const grandTotal = gaEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {modal.open && (
        <Modal title={modal.editing ? t('gaExpenses.editTitle') : t('gaExpenses.addTitle')} onClose={() => setModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('gaExpenses.category')} *</label>
                <select value={form.category} onChange={set('category')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {GA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.date')} *</label>
                <input type="date" value={form.date} onChange={set('date')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('gaExpenses.amount')} *</label>
                <input type="number" value={form.amount} min={0} step="0.01" onChange={set('amount')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.notes')}</label>
                <input value={form.notes} onChange={set('notes')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('common.optional')} />
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('gaExpenses.add')}
              </button>
              <button onClick={() => setModal({ open: false, editing: null })} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('gaExpenses.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('gaExpenses.subtitle')}</p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
          {t('gaExpenses.add')}
        </button>
      </div>

      {/* Category summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t('gaExpenses.summaryTitle')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {byCategory.map(([cat, total]) => (
            <div key={cat} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-600 truncate">{cat}</span>
              <span className="text-sm font-semibold text-slate-800 ml-2 shrink-0">{fmt$(total)}</span>
            </div>
          ))}
        </div>
        {byCategory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">{t('gaExpenses.total')}</span>
            <span className="text-lg font-bold text-red-600">{fmt$(grandTotal)}</span>
          </div>
        )}
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.date')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('gaExpenses.category')}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('gaExpenses.amount')}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.notes')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(entry => (
              <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{entry.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{entry.category}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt$(entry.amount)}</td>
                <td className="px-4 py-3 text-slate-500">{entry.notes || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openEdit(entry)} className="text-xs text-blue-600 hover:underline">{t('common.edit')}</button>
                    <button onClick={() => del(entry)} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('common.noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

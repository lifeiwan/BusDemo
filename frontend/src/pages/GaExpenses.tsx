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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function GaExpenses() {
  const { t } = useTranslation();
  const { gaEntries, addGaEntry, updateGaEntry, deleteGaEntry } = useData();

  const [modal, setModal] = useState<{ open: boolean; editing: GaEntry | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blankForm);

  // Year selector
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set(gaEntries.map(e => Number(e.date.slice(0, 4))));
    years.add(currentYear);
    return [...years].sort((a, b) => b - a);
  }, [gaEntries, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  function selectYear(y: number) {
    setSelectedYear(y);
    setSelectedMonth(null);
  }

  function toggleMonth(m: number) {
    setSelectedMonth(prev => prev === m ? null : m);
  }

  const isCurrentYear = selectedYear === currentYear;
  const today = new Date().toISOString().slice(0, 10);

  // Entries for selected year
  const yearEntries = useMemo(
    () => gaEntries.filter(e => e.date.startsWith(String(selectedYear))),
    [gaEntries, selectedYear]
  );

  // Monthly totals for selected year
  const monthlyTotals = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const prefix = `${selectedYear}-${mm}`;
      const total = yearEntries
        .filter(e => e.date.startsWith(prefix))
        .reduce((s, e) => s + e.amount, 0);
      const isFuture = isCurrentYear && `${prefix}-01` > today;
      return { name, month: i + 1, total, isFuture, prefix };
    });
  }, [yearEntries, selectedYear, isCurrentYear, today]);

  const maxMonthlyTotal = Math.max(...monthlyTotals.map(m => m.total), 1);
  const yearTotal = monthlyTotals.reduce((s, m) => s + m.total, 0);

  // Category totals — driven by selected month or YTD/full-year
  const summaryEntries = useMemo(() => {
    if (selectedMonth !== null) {
      const mm = String(selectedMonth).padStart(2, '0');
      return yearEntries.filter(e => e.date.startsWith(`${selectedYear}-${mm}`));
    }
    return isCurrentYear ? yearEntries.filter(e => e.date <= today) : yearEntries;
  }, [yearEntries, selectedMonth, selectedYear, isCurrentYear, today]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of summaryEntries) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [summaryEntries]);

  const summaryTotal = summaryEntries.reduce((s, e) => s + e.amount, 0);

  // Entries table: filtered to selected month (or all year), sorted by date descending
  const sorted = useMemo(() => {
    const base = selectedMonth !== null
      ? yearEntries.filter(e => {
          const mm = String(selectedMonth).padStart(2, '0');
          return e.date.startsWith(`${selectedYear}-${mm}`);
        })
      : yearEntries;
    return [...base].sort((a, b) => b.date.localeCompare(a.date));
  }, [yearEntries, selectedMonth, selectedYear]);

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

      {/* Year tabs */}
      <div className="flex gap-1 mb-5">
        {availableYears.map(y => (
          <button
            key={y}
            onClick={() => selectYear(y)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedYear === y
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Two-column layout: YTD by Category + Monthly Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* YTD / Full-year category summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {selectedMonth !== null
                ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} — by Category`
                : t('gaExpenses.summaryTitle')}
            </h2>
            {selectedMonth === null && (
              <span className="text-xs text-slate-400">
                {isCurrentYear ? t('gaExpenses.ytdNote') : t('gaExpenses.fullYear')}
              </span>
            )}
            {selectedMonth !== null && (
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-xs text-blue-500 hover:underline"
              >
                ✕ clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {byCategory.map(([cat, total]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 truncate">{cat}</span>
                <span className="text-sm font-semibold text-slate-800 ml-2 shrink-0">{fmt$(total)}</span>
              </div>
            ))}
            {byCategory.length === 0 && (
              <p className="text-sm text-slate-400">{t('common.noData')}</p>
            )}
          </div>
          {byCategory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">{t('gaExpenses.total')}</span>
              <span className="text-lg font-bold text-red-600">{fmt$(summaryTotal)}</span>
            </div>
          )}
        </div>

        {/* Monthly totals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">{t('gaExpenses.monthlyTitle')}</h2>
            <span className="text-xs text-slate-400 font-medium">{selectedYear}</span>
          </div>
          <div className="space-y-1">
            {monthlyTotals.map(({ name, month, total, isFuture }) => {
              const isSelected = selectedMonth === month;
              return (
                <button
                  key={name}
                  onClick={() => !isFuture && toggleMonth(month)}
                  disabled={isFuture}
                  className={`w-full flex items-center gap-3 px-2 py-1 rounded-lg transition-colors text-left ${
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-blue-300'
                      : isFuture
                        ? 'cursor-default'
                        : 'hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <span className={`text-xs font-medium w-8 shrink-0 ${
                    isSelected ? 'text-blue-600' : isFuture ? 'text-slate-300' : 'text-slate-500'
                  }`}>{name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    {total > 0 && (
                      <div
                        className={`h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-purple-400'}`}
                        style={{ width: `${(total / maxMonthlyTotal) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-semibold w-16 text-right shrink-0 ${
                    isSelected ? 'text-blue-700' : isFuture ? 'text-slate-300' : total > 0 ? 'text-slate-800' : 'text-slate-300'
                  }`}>
                    {total > 0 ? fmt$(total) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">{selectedYear} {t('gaExpenses.total')}</span>
            <span className="text-lg font-bold text-red-600">{fmt$(yearTotal)}</span>
          </div>
        </div>
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {selectedMonth !== null
              ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} Entries`
              : `${selectedYear} Entries`}
          </span>
          <span className="text-xs text-slate-400">{sorted.length} records</span>
        </div>
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

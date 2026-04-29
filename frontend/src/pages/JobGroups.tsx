import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canEdit } from '../lib/permissions';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import JobModal from '../components/JobModal';
import type { Job, JobGroup } from '../types';

type FormState = Omit<JobGroup, 'id'>;

const blank: FormState = {
  name: '', type: 'route', description: '',
  customerId: null, vehicleId: null,
  defaultRevenue: 0, defaultDriverPayroll: 0,
  recurrence: 'one_time',
};

function suggestNextDate(group: JobGroup, jobs: Job[]): string {
  const today = new Date();
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  if (group.recurrence === 'one_time') return fmt(today);
  const groupJobs = jobs.filter(j => j.jobGroupId === group.id);
  const latestDate = groupJobs.map(j => j.startDate).sort().at(-1);
  if (!latestDate) return fmt(today);
  const [y, m, d] = latestDate.split('-').map(Number);
  const base = new Date(y, m - 1, d); // local time — avoids timezone boundary issues
  if (group.recurrence === 'daily')   base.setDate(base.getDate() + 1);
  if (group.recurrence === 'weekly')  base.setDate(base.getDate() + 7);
  if (group.recurrence === 'monthly') base.setMonth(base.getMonth() + 1);
  return fmt(base);
}

export default function JobGroups() {
  const { t } = useTranslation();
  const { appRole } = useAuth();
  const editable = canEdit(appRole, 'ops');
  const data = useData();
  const { jobGroups, jobs, vehicles, customers, addJobGroup, updateJobGroup, deleteJobGroup } = data;

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  const [modal, setModal] = useState<{ open: boolean; editing: JobGroup | null }>({ open: false, editing: null });
  const [form, setForm] = useState<FormState>(blank);
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; prefill: Partial<Omit<Job, 'id'>> | null }>({ open: false, prefill: null });

  function openAdd() { setForm(blank); setModal({ open: true, editing: null }); }
  function openEdit(jg: JobGroup) {
    setForm({
      name: jg.name, type: jg.type, description: jg.description,
      customerId: jg.customerId, vehicleId: jg.vehicleId,
      defaultRevenue: jg.defaultRevenue, defaultDriverPayroll: jg.defaultDriverPayroll,
      recurrence: jg.recurrence,
    });
    setModal({ open: true, editing: jg });
  }
  function close() { setModal({ open: false, editing: null }); }

  function save() {
    if (!form.name.trim()) return;
    if (modal.editing) updateJobGroup({ ...modal.editing, ...form });
    else addJobGroup(form);
    close();
  }

  function del(jg: JobGroup) {
    if (window.confirm(t('jobGroups.confirmDelete', { name: jg.name }))) deleteJobGroup(jg.id);
  }

  function openSchedule(jg: JobGroup) {
    const nextDate = suggestNextDate(jg, jobs);
    const prefill: Partial<Omit<Job, 'id'>> = {
      name: `${jg.name} — ${nextDate}`,
      jobGroupId: jg.id,
      startDate: nextDate,
      revenue: jg.defaultRevenue,
      driverPayroll: jg.defaultDriverPayroll,
      ...(jg.vehicleId != null ? { vehicleId: jg.vehicleId } : {}),
      ...(jg.customerId != null ? { customerId: jg.customerId } : {}),
    };
    setScheduleModal({ open: true, prefill });
  }

  const setF = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = ['customerId', 'vehicleId'].includes(field)
      ? (e.target.value === '' ? null : Number(e.target.value))
      : ['defaultRevenue', 'defaultDriverPayroll'].includes(field)
        ? Number(e.target.value)
        : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('jobGroups.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('jobGroups.subtitle')}</p>
        </div>
        {editable && (
          <button onClick={openAdd} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
            {t('jobGroups.add')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {jobGroups.map(jg => {
          const groupJobs = jobs
            .filter(j => j.jobGroupId === jg.id)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));
          const displayJobs = groupJobs.slice(0, 5);
          const hasJobToday = groupJobs.some(j => j.startDate === today && j.status === 'scheduled');
          return (
            <div key={jg.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-4 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {hasJobToday && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={t('jobGroups.scheduledToday')} />
                    )}
                    <span className="font-semibold text-slate-800">{jg.name}</span>
                    <Badge value={jg.type} />
                    <Badge value={jg.recurrence} />
                  </div>
                  {jg.description && <p className="text-sm text-slate-500">{jg.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {jg.defaultRevenue > 0 && `$${jg.defaultRevenue.toLocaleString()} / run`}
                  </p>
                </div>
                {editable && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(jg)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('common.edit')}>✎</button>
                    <button onClick={() => del(jg)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete')}>✕</button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 px-4 py-2 flex-1">
                {groupJobs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">{t('jobGroups.noJobs')}</p>
                ) : (
                  <ul className="space-y-1">
                    {displayJobs.map(j => (
                      <li key={j.id} className="flex items-center justify-between text-sm gap-2">
                        <Link to={`/ops/jobs/${j.id}`} className="text-blue-600 hover:underline truncate">{j.name}</Link>
                        <Badge value={j.status} />
                      </li>
                    ))}
                    {groupJobs.length > 5 && (
                      <li className="text-xs text-slate-400 pt-1">
                        {t('common.more', { count: groupJobs.length - 5 })} — <Link to="/ops/jobs" className="text-blue-500 hover:underline">{t('common.viewAll')}</Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">{groupJobs.length} {t('sidebar.jobs').toLowerCase()}</span>
                {editable && (
                  <button
                    onClick={() => openSchedule(jg)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    {t('jobGroups.schedule')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit/Add Job Group Modal */}
      {modal.open && (
        <Modal title={modal.editing ? t('jobGroups.editTitle') : t('jobGroups.addTitle')} onClose={close}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')} *</label>
              <input value={form.name} onChange={setF('name')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Shuttle Routes" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.type')}</label>
                <select value={form.type} onChange={setF('type')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="route">{t('jobGroups.typeRoute')}</option>
                  <option value="one_time">{t('jobGroups.typeOneTime')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.recurrence')}</label>
                <select value={form.recurrence} onChange={setF('recurrence')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="one_time">{t('jobs.recurrenceOneTime')}</option>
                  <option value="daily">{t('jobs.recurrenceDaily')}</option>
                  <option value="weekly">{t('jobs.recurrenceWeekly')}</option>
                  <option value="monthly">{t('jobs.recurrenceMonthly')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.customer')}</label>
              <select value={form.customerId ?? ''} onChange={setF('customerId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('jobs.select')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.vehicle')}</label>
              <select value={form.vehicleId ?? ''} onChange={setF('vehicleId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('jobs.select')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.defaultRevenue')}</label>
                <input type="number" value={form.defaultRevenue} onChange={setF('defaultRevenue')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('jobGroups.defaultDriverPayroll')}</label>
                <input type="number" value={form.defaultDriverPayroll} onChange={setF('defaultDriverPayroll')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.description')}</label>
              <textarea value={form.description} onChange={setF('description')}
                rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {modal.editing ? t('common.save') : t('jobGroups.add')}
              </button>
              <button onClick={close} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Next Run Modal */}
      {scheduleModal.open && scheduleModal.prefill && (
        <JobModal
          editing={null}
          prefill={scheduleModal.prefill}
          onClose={() => setScheduleModal({ open: false, prefill: null })}
        />
      )}
    </div>
  );
}

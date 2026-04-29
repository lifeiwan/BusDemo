import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../context/DataContext';

type Status = 'scheduled' | 'active' | 'completed';

const STATUSES: Status[] = ['scheduled', 'active', 'completed'];

const activeStyle: Record<Status, string> = {
  scheduled: 'bg-amber-100 text-amber-700 border-amber-200',
  active:    'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ghostHover: Record<Status, string> = {
  scheduled: 'hover:bg-amber-50 hover:text-amber-700',
  active:    'hover:bg-green-50 hover:text-green-700',
  completed: 'hover:bg-slate-50 hover:text-slate-600',
};

interface Props {
  jobId: number;
  current: Status;
}

export default function StatusSwitcher({ jobId, current }: Props) {
  const { t } = useTranslation();
  const { patchJobStatus } = useData();
  const [pending, setPending] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayed = pending ?? current;

  async function handleConfirm() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await patchJobStatus(jobId, pending);
      setPending(null);
    } catch {
      setError(t('statusSwitcher.error'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPending(null);
    setError(null);
  }

  function handleSegmentClick(s: Status) {
    if (s === current || saving) return;
    setPending(s);
    setError(null);
  }

  return (
    <div>
      <div className="inline-flex rounded border border-slate-200 overflow-hidden text-[11px] font-medium">
        {STATUSES.map(s => {
          const isDisplayed = s === displayed;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleSegmentClick(s)}
              disabled={saving}
              className={[
                'px-2 py-0.5 border-r border-slate-200 last:border-r-0 transition-colors',
                isDisplayed
                  ? activeStyle[s]
                  : `bg-white text-slate-400 ${ghostHover[s]}`,
                saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {t(`status.${s}`)}
            </button>
          );
        })}
      </div>

      {pending && (
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">
            {t('statusSwitcher.confirmPrompt', { status: t(`status.${pending}`) })}
          </span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-60 transition-colors"
          >
            {saving ? t('statusSwitcher.saving') : t('statusSwitcher.confirm')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-2 py-0.5 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            {t('statusSwitcher.cancel')}
          </button>
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}

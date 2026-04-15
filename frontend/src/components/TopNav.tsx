import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
  { code: 'es', label: 'ES' },
];

export default function TopNav() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const sections = [
    { label: t('nav.dashboard'),    path: '/',                    prefix: '' },
    { label: t('nav.operations'),   path: '/ops/job-groups',      prefix: '/ops' },
    { label: t('nav.masterData'),   path: '/master/vehicles',     prefix: '/master' },
    { label: t('nav.profitCenter'), path: '/profit/profitability',prefix: '/profit' },
    { label: t('nav.reports'),      path: '/reports/pl',          prefix: '/reports' },
  ];

  function isActive(prefix: string) {
    if (prefix === '') return pathname === '/';
    return pathname.startsWith(prefix);
  }

  return (
    <header className="bg-slate-800 text-white flex items-center px-6 h-14 shrink-0 gap-8 shadow-md z-10">
      <span className="font-bold text-lg tracking-tight select-none">
        Eva<span className="text-blue-400">Bus</span>
      </span>
      <nav className="flex gap-1 flex-1">
        {sections.map(s => (
          <Link
            key={s.path}
            to={s.path}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              isActive(s.prefix)
                ? 'bg-blue-500 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      {/* Language switcher */}
      <div className="flex gap-1">
        {LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              i18n.resolvedLanguage === lang.code
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => { logout(); navigate('/login', { replace: true }); }}
        className="ml-2 px-3 py-1.5 rounded text-xs font-semibold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
      >
        {t('login.logout')}
      </button>
    </header>
  );
}

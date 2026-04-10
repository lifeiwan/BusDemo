import { Link, useLocation } from 'react-router-dom';

const sections = [
  { label: 'Dashboard',     path: '/',       prefix: '' },
  { label: 'Profit Center', path: '/profit/job-groups', prefix: '/profit' },
  { label: 'Master Data',   path: '/master/vehicles',   prefix: '/master' },
];

export default function TopNav() {
  const { pathname } = useLocation();

  function isActive(prefix: string) {
    if (prefix === '') return pathname === '/';
    return pathname.startsWith(prefix);
  }

  return (
    <header className="bg-slate-800 text-white flex items-center px-6 h-14 shrink-0 gap-8 shadow-md z-10">
      <span className="font-bold text-lg tracking-tight select-none">
        Eva<span className="text-blue-400">Bus</span>
      </span>
      <nav className="flex gap-1">
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
    </header>
  );
}

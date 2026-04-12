import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const profitItems = [
    { label: t('sidebar.jobGroups'),    path: '/profit/job-groups'    },
    { label: t('sidebar.jobs'),         path: '/profit/jobs'          },
    { label: t('sidebar.profitability'),path: '/profit/profitability' },
  ];

  const masterItems = [
    { label: t('sidebar.vehicles'),    path: '/master/vehicles'    },
    { label: t('sidebar.customers'),   path: '/master/customers'   },
    { label: t('sidebar.drivers'),     path: '/master/drivers'     },
    { label: t('sidebar.gaExpenses'),  path: '/master/ga-expenses' },
  ];

  const vehicleSubItems = [
    t('sidebar.fuel'),
    t('sidebar.maintenance'),
    t('sidebar.inspections'),
  ];

  const inProfit = pathname.startsWith('/profit');
  const inMaster = pathname.startsWith('/master');

  if (!inProfit && !inMaster) return null;

  const items = inProfit ? profitItems : masterItems;
  const inVehicles = pathname.startsWith('/master/vehicles');

  return (
    <aside className="w-52 bg-slate-800 text-slate-300 flex-shrink-0 overflow-y-auto py-4">
      {items.map(item => {
        const active = pathname === item.path ||
          (item.path !== '/master/vehicles' && pathname.startsWith(item.path + '/')) ||
          (item.path === '/master/vehicles' && pathname.startsWith('/master/vehicles'));
        return (
          <div key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-blue-500 text-white' : 'hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
            {item.path === '/master/vehicles' && inVehicles && (
              <div className="ml-4 border-l border-slate-600 py-1">
                {vehicleSubItems.map(sub => (
                  <span key={sub} className="block px-4 py-1.5 text-xs text-slate-500">
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

import { Link, useLocation } from 'react-router-dom';

const profitItems = [
  { label: 'Job Groups',    path: '/profit/job-groups'    },
  { label: 'Jobs',          path: '/profit/jobs'          },
  { label: 'Profitability', path: '/profit/profitability' },
];

const masterItems = [
  { label: 'Vehicles',  path: '/master/vehicles'  },
  { label: 'Customers', path: '/master/customers' },
  { label: 'Drivers',   path: '/master/drivers'   },
];

const vehicleSubItems = [
  { label: 'Maintenance' },
  { label: 'Fuel' },
  { label: 'Inspections' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  const inProfit = pathname.startsWith('/profit');
  const inMaster = pathname.startsWith('/master');

  if (!inProfit && !inMaster) return null;

  const items = inProfit ? profitItems : masterItems;
  const inVehicles = pathname.startsWith('/master/vehicles');

  return (
    <aside className="w-52 bg-slate-800 text-slate-300 flex-shrink-0 overflow-y-auto py-4">
      {items.map(item => {
        const active = pathname === item.path || (item.path !== '/master/vehicles' && pathname.startsWith(item.path + '/')) ||
          (item.path === '/master/vehicles' && pathname.startsWith('/master/vehicles'));
        return (
          <div key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
            {item.label === 'Vehicles' && inVehicles && (
              <div className="ml-4 border-l border-slate-600 py-1">
                {vehicleSubItems.map(sub => (
                  <span key={sub.label} className="block px-4 py-1.5 text-xs text-slate-500">
                    {sub.label}
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

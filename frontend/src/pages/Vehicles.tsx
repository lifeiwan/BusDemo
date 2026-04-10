import { Link } from 'react-router-dom';
import { vehicles, maintenanceEntries } from '../data';
import Badge from '../components/Badge';

export default function Vehicles() {
  const lastSvc = (id: number) => {
    const entries = maintenanceEntries
      .filter(e => e.vehicleId === id)
      .sort((a, b) => b.date.localeCompare(a.date));
    return entries[0]?.date ?? '—';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vehicles</h1>
        <p className="text-sm text-slate-500 mt-1">{vehicles.length} vehicles in fleet</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Vehicle', 'VIN', 'Color', 'Mileage', 'Status', 'Last Service'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/master/vehicles/${v.id}`} className="font-medium text-blue-600 hover:underline">
                    {v.year} {v.make} {v.model}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.vin}</td>
                <td className="px-4 py-3 text-slate-600">{v.color}</td>
                <td className="px-4 py-3 text-slate-600">{v.mileage.toLocaleString()} mi</td>
                <td className="px-4 py-3"><Badge value={v.status} /></td>
                <td className="px-4 py-3 text-slate-500">{lastSvc(v.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

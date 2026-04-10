import { useMemo } from 'react';
import { drivers, driverVehicleAssignments, vehicles, driverCosts } from '../data';
import { currentMonthRange } from '../lib/profit';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Drivers() {
  const range = useMemo(currentMonthRange, []);

  const currentVehicle = (driverId: number) => {
    const assignment = driverVehicleAssignments.find(
      a => a.driverId === driverId && !a.endDate
    );
    if (!assignment) return '—';
    const v = vehicles.find(x => x.id === assignment.vehicleId);
    return v ? `${v.year} ${v.make} ${v.model}` : '—';
  };

  const driverCostMTD = (driverId: number) =>
    driverCosts
      .filter(c => c.driverId === driverId && c.date >= range.startDate && c.date <= range.endDate)
      .reduce((s, c) => s + c.amount, 0);

  const isExpiringSoon = (expiry: string) => {
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
    return days < 90;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Drivers</h1>
        <p className="text-sm text-slate-500 mt-1">{drivers.length} drivers</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Driver', 'Phone', 'License', 'Expiry', 'Current Vehicle', 'Cost (MTD)', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.license}</td>
                <td className={`px-4 py-3 text-sm ${isExpiringSoon(d.licenseExpiry) ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                  {d.licenseExpiry}
                  {isExpiringSoon(d.licenseExpiry) && (
                    <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">soon</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{currentVehicle(d.id)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{fmt$(driverCostMTD(d.id))}</td>
                <td className="px-4 py-3"><Badge value={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { vehicles, maintenanceEntries, fuelEntries, inspections } from '../data';
import { currentMonthRange } from '../lib/profit';
import EntityDetail from '../components/EntityDetail';
import Badge from '../components/Badge';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function VehicleDetail() {
  const { id } = useParams();
  const vehicle = vehicles.find(v => v.id === Number(id));
  const [tab, setTab] = useState('maintenance');

  const range = useMemo(currentMonthRange, []);

  if (!vehicle) return <Navigate to="/master/vehicles" replace />;

  const maint = maintenanceEntries
    .filter(e => e.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const fuel = fuelEntries
    .filter(e => e.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const insp = inspections
    .filter(e => e.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const maintCostMTD = maint
    .filter(e => e.date >= range.startDate && e.date <= range.endDate)
    .reduce((s, e) => s + e.cost, 0);
  const fuelCostMTD = fuel
    .filter(e => e.date >= range.startDate && e.date <= range.endDate)
    .reduce((s, e) => s + e.total, 0);

  return (
    <EntityDetail
      title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      subtitle={`VIN: ${vehicle.vin} · ${vehicle.mileage.toLocaleString()} mi · ${vehicle.color}`}
      tabs={[
        { label: 'Maintenance', key: 'maintenance' },
        { label: 'Fuel', key: 'fuel' },
        { label: 'Inspections', key: 'inspections' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Maintenance (MTD)</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(maintCostMTD)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fuel (MTD)</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(fuelCostMTD)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
          <div className="mt-1"><Badge value={vehicle.status} /></div>
        </div>
      </div>

      {tab === 'maintenance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Type', 'Mileage', 'Cost', 'Tech', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maint.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No maintenance records</td></tr>
              )}
              {maint.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3 font-medium">{e.type}</td>
                  <td className="px-4 py-3 text-slate-600">{e.mileage.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold">{fmt$(e.cost)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.tech}</td>
                  <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'fuel' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Gallons', 'CPG', 'Total', 'Odometer', 'Full Tank'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fuel.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No fuel records</td></tr>
              )}
              {fuel.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3">{e.gallons}</td>
                  <td className="px-4 py-3">${e.cpg.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold">{fmt$(e.total)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.odometer.toLocaleString()}</td>
                  <td className="px-4 py-3">{e.full ? <Badge value="pass" /> : <Badge value="fail" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'inspections' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Driver', 'Result', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insp.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No inspection records</td></tr>
              )}
              {insp.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{e.date}</td>
                  <td className="px-4 py-3">{e.driverName}</td>
                  <td className="px-4 py-3"><Badge value={e.pass ? 'pass' : 'fail'} /></td>
                  <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EntityDetail>
  );
}

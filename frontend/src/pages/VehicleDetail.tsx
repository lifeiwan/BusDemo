import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { currentMonthRange } from '../lib/profit';
import EntityDetail from '../components/EntityDetail';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import type { MaintenanceEntry, FuelEntry, Inspection, VehicleFixedCost } from '../types';

function fmt$(n: number) {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type MaintForm = Omit<MaintenanceEntry, 'id' | 'vehicleId'>;
type FuelForm = Omit<FuelEntry, 'id' | 'vehicleId'>;
type InspForm = Omit<Inspection, 'id' | 'vehicleId'>;
type FixedCostForm = Omit<VehicleFixedCost, 'id' | 'vehicleId'>;

const FIXED_COST_LABELS: Record<VehicleFixedCost['type'], string> = {
  loan: 'Loan',
  eld: 'ELD',
  management_fee: 'Management Fee',
};

const blankFixedCost = (): FixedCostForm => ({
  type: 'loan',
  cost: 0,
  startDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const blankMaint = (today: string): MaintForm => ({ date: today, type: '', mileage: 0, cost: 0, tech: '', notes: '' });
const blankFuel = (today: string): FuelForm => ({ date: today, gallons: 0, cpg: 0, total: 0, odometer: 0, full: true });
const blankInsp = (today: string): InspForm => ({ date: today, driverName: '', results: {}, passed: true, notes: '' });

export default function VehicleDetail() {
  const { id } = useParams();
  const data = useData();
  const { vehicles, maintenanceEntries, fuelEntries, inspections, vehicleFixedCosts,
    addMaintenance, updateMaintenance, deleteMaintenance,
    addFuel, updateFuel, deleteFuel,
    addInspection, updateInspection, deleteInspection,
    addVehicleFixedCost, updateVehicleFixedCost, deleteVehicleFixedCost } = data;

  const vehicle = vehicles.find(v => v.id === Number(id));
  const [tab, setTab] = useState('fuel');
  const range = useMemo(currentMonthRange, []);
  const today = new Date().toISOString().slice(0, 10);

  // Maintenance modal state
  const [maintModal, setMaintModal] = useState<{ open: boolean; editing: MaintenanceEntry | null }>({ open: false, editing: null });
  const [maintForm, setMaintForm] = useState<MaintForm>(blankMaint(today));

  // Fuel modal state
  const [fuelModal, setFuelModal] = useState<{ open: boolean; editing: FuelEntry | null }>({ open: false, editing: null });
  const [fuelForm, setFuelForm] = useState<FuelForm>(blankFuel(today));

  // Inspection modal state
  const [inspModal, setInspModal] = useState<{ open: boolean; editing: Inspection | null }>({ open: false, editing: null });
  const [inspForm, setInspForm] = useState<InspForm>(blankInsp(today));

  // Fixed Costs modal state
  const [fixedModal, setFixedModal] = useState<{ open: boolean; editing: VehicleFixedCost | null }>({ open: false, editing: null });
  const [fixedForm, setFixedForm] = useState<FixedCostForm>(blankFixedCost());

  if (!vehicle) return <Navigate to="/master/vehicles" replace />;

  const fixedCosts = vehicleFixedCosts
    .filter(c => c.vehicleId === vehicle.id)
    .sort((a, b) => a.type.localeCompare(b.type));
  const fixedCostMonthly = fixedCosts.reduce((s, c) => s + c.cost, 0);

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

  // Maintenance CRUD
  function openAddMaint() { setMaintForm(blankMaint(today)); setMaintModal({ open: true, editing: null }); }
  function openEditMaint(e: MaintenanceEntry) {
    setMaintForm({ date: e.date, type: e.type, mileage: e.mileage, cost: e.cost, tech: e.tech, notes: e.notes });
    setMaintModal({ open: true, editing: e });
  }
  function saveMaint() {
    const payload = { ...maintForm, vehicleId: vehicle.id, mileage: Number(maintForm.mileage), cost: Number(maintForm.cost) };
    if (maintModal.editing) updateMaintenance({ ...maintModal.editing, ...payload });
    else addMaintenance(payload);
    setMaintModal({ open: false, editing: null });
  }
  function delMaint(e: MaintenanceEntry) {
    if (window.confirm(`Delete maintenance record from ${e.date}?`)) deleteMaintenance(e.id);
  }

  // Fuel CRUD
  function openAddFuel() { setFuelForm(blankFuel(today)); setFuelModal({ open: true, editing: null }); }
  function openEditFuel(e: FuelEntry) {
    setFuelForm({ date: e.date, gallons: e.gallons, cpg: e.cpg, total: e.total, odometer: e.odometer, full: e.full });
    setFuelModal({ open: true, editing: e });
  }
  function saveFuel() {
    const gallons = Number(fuelForm.gallons);
    const cpg = Number(fuelForm.cpg);
    const payload = { ...fuelForm, vehicleId: vehicle.id, gallons, cpg, total: Number(fuelForm.total) || parseFloat((gallons * cpg).toFixed(2)), odometer: Number(fuelForm.odometer) };
    if (fuelModal.editing) updateFuel({ ...fuelModal.editing, ...payload });
    else addFuel(payload);
    setFuelModal({ open: false, editing: null });
  }
  function delFuel(e: FuelEntry) {
    if (window.confirm(`Delete fuel record from ${e.date}?`)) deleteFuel(e.id);
  }

  // Inspection CRUD
  function openAddInsp() { setInspForm(blankInsp(today)); setInspModal({ open: true, editing: null }); }
  function openEditInsp(e: Inspection) {
    setInspForm({ date: e.date, driverName: e.driverName, results: e.results, passed: e.passed, notes: e.notes });
    setInspModal({ open: true, editing: e });
  }
  function saveInsp() {
    const payload = { ...inspForm, vehicleId: vehicle.id };
    if (inspModal.editing) updateInspection({ ...inspModal.editing, ...payload });
    else addInspection(payload);
    setInspModal({ open: false, editing: null });
  }
  function delInsp(e: Inspection) {
    if (window.confirm(`Delete inspection record from ${e.date}?`)) deleteInspection(e.id);
  }

  // Fixed Cost CRUD
  function openAddFixed() { setFixedForm(blankFixedCost()); setFixedModal({ open: true, editing: null }); }
  function openEditFixed(c: VehicleFixedCost) {
    setFixedForm({ type: c.type, cost: c.cost, startDate: c.startDate, notes: c.notes });
    setFixedModal({ open: true, editing: c });
  }
  function saveFixed() {
    const payload = { ...fixedForm, vehicleId: vehicle.id, cost: Number(fixedForm.cost) };
    if (fixedModal.editing) updateVehicleFixedCost({ ...fixedModal.editing, ...payload });
    else addVehicleFixedCost(payload);
    setFixedModal({ open: false, editing: null });
  }
  function delFixed(c: VehicleFixedCost) {
    if (window.confirm(`Delete ${FIXED_COST_LABELS[c.type]} entry?`)) deleteVehicleFixedCost(c.id);
  }

  const setM = (field: keyof MaintForm) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setMaintForm(f => ({ ...f, [field]: ev.target.value }));
  const setF = (field: keyof FuelForm) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setFuelForm(f => ({ ...f, [field]: field === 'full' ? (ev.target as HTMLInputElement).checked : ev.target.value }));
  const setI = (field: keyof InspForm) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setInspForm(f => ({ ...f, [field]: field === 'passed' ? ev.target.value === 'true' : ev.target.value }));
  const setFx = (field: keyof FixedCostForm) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFixedForm(f => ({ ...f, [field]: ev.target.value }));

  return (
    <EntityDetail
      title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      subtitle={`${vehicle.licensePlate} · VIN: ${vehicle.vin} · ${vehicle.mileage.toLocaleString()} mi · ${vehicle.color}`}
      tabs={[
        { label: 'Fuel', key: 'fuel' },
        { label: 'Maintenance', key: 'maintenance' },
        { label: 'Inspections', key: 'inspections' },
        { label: 'Fixed Costs', key: 'fixed' },
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
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fixed Costs (monthly)</p>
          <p className="text-2xl font-bold text-slate-800">{fmt$(fixedCostMonthly)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
          <div className="mt-1"><Badge value={vehicle.status} /></div>
        </div>
      </div>

      {tab === 'maintenance' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={openAddMaint} className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              + Add Entry
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Date', 'Type', 'Mileage', 'Cost', 'Tech', 'Notes', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maint.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No maintenance records</td></tr>
                )}
                {maint.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{e.date}</td>
                    <td className="px-4 py-3 font-medium">{e.type}</td>
                    <td className="px-4 py-3 text-slate-600">{e.mileage.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{fmt$(e.cost)}</td>
                    <td className="px-4 py-3 text-slate-600">{e.tech}</td>
                    <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditMaint(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                        <button onClick={() => delMaint(e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'fuel' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={openAddFuel} className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              + Add Entry
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Date', 'Gallons', 'CPG', 'Total', 'Odometer', 'Full Tank', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fuel.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No fuel records</td></tr>
                )}
                {fuel.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{e.date}</td>
                    <td className="px-4 py-3">{e.gallons}</td>
                    <td className="px-4 py-3">${e.cpg.toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold">{fmt$(e.total)}</td>
                    <td className="px-4 py-3 text-slate-600">{e.odometer.toLocaleString()}</td>
                    <td className="px-4 py-3">{e.full ? <Badge value="pass" /> : <Badge value="fail" />}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditFuel(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                        <button onClick={() => delFuel(e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'inspections' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={openAddInsp} className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              + Add Entry
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Date', 'Driver', 'Result', 'Notes', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insp.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No inspection records</td></tr>
                )}
                {insp.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{e.date}</td>
                    <td className="px-4 py-3">{e.driverName}</td>
                    <td className="px-4 py-3"><Badge value={e.passed ? 'pass' : 'fail'} /></td>
                    <td className="px-4 py-3 text-slate-500">{e.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditInsp(e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                        <button onClick={() => delInsp(e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'fixed' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={openAddFixed} className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
              + Add Entry
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Type', 'Monthly Cost', 'Start Date', 'Notes', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fixedCosts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No fixed costs</td></tr>
                )}
                {fixedCosts.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{FIXED_COST_LABELS[c.type]}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{fmt$(c.cost)}/mo</td>
                    <td className="px-4 py-3 text-slate-600">{c.startDate}</td>
                    <td className="px-4 py-3 text-slate-500">{c.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditFixed(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">✎</button>
                        <button onClick={() => delFixed(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {fixedCosts.length > 0 && (
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Total</td>
                    <td className="px-4 py-2 font-bold text-red-600">{fmt$(fixedCostMonthly)}/mo</td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Maintenance Modal */}
      {maintModal.open && (
        <Modal title={maintModal.editing ? 'Edit Maintenance' : 'Add Maintenance'} onClose={() => setMaintModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={maintForm.date} onChange={setM('date')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <input value={maintForm.type} onChange={setM('type')} placeholder="Oil Change"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mileage</label>
                <input type="number" value={maintForm.mileage} onChange={setM('mileage')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost ($)</label>
                <input type="number" value={maintForm.cost} onChange={setM('cost')} min={0} step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Technician</label>
                <input value={maintForm.tech} onChange={setM('tech')} placeholder="A. Smith"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={maintForm.notes} onChange={setM('notes')} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveMaint} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {maintModal.editing ? 'Save Changes' : 'Add Entry'}
              </button>
              <button onClick={() => setMaintModal({ open: false, editing: null })} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fuel Modal */}
      {fuelModal.open && (
        <Modal title={fuelModal.editing ? 'Edit Fuel Entry' : 'Add Fuel Entry'} onClose={() => setFuelModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={fuelForm.date} onChange={setF('date')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gallons</label>
                <input type="number" value={fuelForm.gallons} onChange={setF('gallons')} min={0} step="0.001"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Per Gallon ($)</label>
                <input type="number" value={fuelForm.cpg} onChange={setF('cpg')} min={0} step="0.001"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total ($)</label>
                <input type="number" value={fuelForm.total} onChange={setF('total')} min={0} step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Odometer</label>
                <input type="number" value={fuelForm.odometer} onChange={setF('odometer')} min={0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="full-tank" checked={fuelForm.full}
                onChange={e => setFuelForm(f => ({ ...f, full: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-500" />
              <label htmlFor="full-tank" className="text-sm font-medium text-slate-700">Full tank</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveFuel} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {fuelModal.editing ? 'Save Changes' : 'Add Entry'}
              </button>
              <button onClick={() => setFuelModal({ open: false, editing: null })} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Inspection Modal */}
      {inspModal.open && (
        <Modal title={inspModal.editing ? 'Edit Inspection' : 'Add Inspection'} onClose={() => setInspModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={inspForm.date} onChange={setI('date')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
                <input value={inspForm.driverName} onChange={setI('driverName')} placeholder="Jane D."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Result</label>
              <select value={String(inspForm.passed)} onChange={setI('passed')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="true">Pass</option>
                <option value="false">Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={inspForm.notes} onChange={setI('notes')} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveInsp} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {inspModal.editing ? 'Save Changes' : 'Add Entry'}
              </button>
              <button onClick={() => setInspModal({ open: false, editing: null })} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Fixed Cost Modal */}
      {fixedModal.open && (
        <Modal title={fixedModal.editing ? 'Edit Fixed Cost' : 'Add Fixed Cost'} onClose={() => setFixedModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={fixedForm.type} onChange={setFx('type')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="loan">Loan</option>
                  <option value="eld">ELD</option>
                  <option value="management_fee">Management Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Cost ($)</label>
                <input type="number" value={fixedForm.cost} onChange={setFx('cost')} min={0} step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={fixedForm.startDate} onChange={setFx('startDate')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input value={fixedForm.notes} onChange={setFx('notes')} placeholder="Optional"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveFixed} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {fixedModal.editing ? 'Save Changes' : 'Add Entry'}
              </button>
              <button onClick={() => setFixedModal({ open: false, editing: null })} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </EntityDetail>
  );
}

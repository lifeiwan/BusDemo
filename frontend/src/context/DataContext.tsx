import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  Vehicle, Driver, Customer, JobGroup, Job, JobLineItem,
  MaintenanceEntry, FuelEntry, Inspection, GaEntry, VehicleFixedCost,
  InsurancePolicy, ParkingEntry, DriverCost, DriverVehicleAssignment,
} from '../types';
import { apiFetch } from '../lib/api';
import type { DataSnapshot } from '../lib/profit';

interface DataContextValue extends DataSnapshot {
  loading: boolean;
  error: string | null;
  // Vehicles
  addVehicle: (v: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (v: Vehicle) => void;
  deleteVehicle: (id: number) => void;
  // Drivers
  addDriver: (d: Omit<Driver, 'id'>) => void;
  updateDriver: (d: Driver) => void;
  deleteDriver: (id: number) => void;
  // Customers
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: number) => void;
  // Job Groups
  addJobGroup: (jg: Omit<JobGroup, 'id'>) => void;
  updateJobGroup: (jg: JobGroup) => void;
  deleteJobGroup: (id: number) => void;
  // Jobs
  addJob: (j: Omit<Job, 'id'>) => void;
  updateJob: (j: Job) => void;
  deleteJob: (id: number) => void;
  // Job Line Items
  addJobLineItem: (li: Omit<JobLineItem, 'id'>) => void;
  updateJobLineItem: (li: JobLineItem) => void;
  deleteJobLineItem: (id: number) => void;
  deleteJobLineItemsByJobId: (jobId: number) => void;
  // Maintenance
  addMaintenance: (e: Omit<MaintenanceEntry, 'id'>) => void;
  updateMaintenance: (e: MaintenanceEntry) => void;
  deleteMaintenance: (id: number) => void;
  // Fuel
  addFuel: (e: Omit<FuelEntry, 'id'>) => void;
  updateFuel: (e: FuelEntry) => void;
  deleteFuel: (id: number) => void;
  // Inspections
  addInspection: (e: Omit<Inspection, 'id'>) => void;
  updateInspection: (e: Inspection) => void;
  deleteInspection: (id: number) => void;
  // G&A Entries
  addGaEntry: (e: Omit<GaEntry, 'id'>) => void;
  updateGaEntry: (e: GaEntry) => void;
  deleteGaEntry: (id: number) => void;
  // Vehicle Fixed Costs
  addVehicleFixedCost: (e: Omit<VehicleFixedCost, 'id'>) => void;
  updateVehicleFixedCost: (e: VehicleFixedCost) => void;
  deleteVehicleFixedCost: (id: number) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>, onSuccess: (result: T) => void): Promise<void> {
    try {
      const result = await fn();
      onSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setMutationError(msg);
    }
  }

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobLineItems, setJobLineItems] = useState<JobLineItem[]>([]);
  const [maintenanceEntries, setMaintenance] = useState<MaintenanceEntry[]>([]);
  const [fuelEntries, setFuel] = useState<FuelEntry[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [insurancePolicies, setInsurance] = useState<InsurancePolicy[]>([]);
  const [parkingEntries, setParking] = useState<ParkingEntry[]>([]);
  const [driverCosts, setDriverCosts] = useState<DriverCost[]>([]);
  const [driverVehicleAssignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [gaEntries, setGaEntries] = useState<GaEntry[]>([]);
  const [vehicleFixedCosts, setVehicleFixedCosts] = useState<VehicleFixedCost[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Vehicle[]>('/api/v1/vehicles/'),
      apiFetch<Driver[]>('/api/v1/drivers/'),
      apiFetch<Customer[]>('/api/v1/customers/'),
      apiFetch<JobGroup[]>('/api/v1/job-groups/'),
      apiFetch<Job[]>('/api/v1/jobs/'),
      apiFetch<JobLineItem[]>('/api/v1/job-line-items/'),
      apiFetch<MaintenanceEntry[]>('/api/v1/maintenance/'),
      apiFetch<FuelEntry[]>('/api/v1/fuel/'),
      apiFetch<Inspection[]>('/api/v1/inspections/'),
      apiFetch<InsurancePolicy[]>('/api/v1/insurance/'),
      apiFetch<ParkingEntry[]>('/api/v1/parking/'),
      apiFetch<DriverCost[]>('/api/v1/driver-costs/'),
      apiFetch<DriverVehicleAssignment[]>('/api/v1/driver-vehicle-assignments/'),
      apiFetch<GaEntry[]>('/api/v1/ga-entries/'),
      apiFetch<VehicleFixedCost[]>('/api/v1/vehicle-fixed-costs/'),
    ]).then(([v, dr, cu, jg, j, li, ma, fu, ins, insP, pa, dc, dva, ga, vfc]) => {
      setVehicles(v);
      setDrivers(dr);
      setCustomers(cu);
      setJobGroups(jg);
      setJobs(j);
      setJobLineItems(li);
      setMaintenance(ma);
      setFuel(fu);
      setInspections(ins);
      setInsurance(insP);
      setParking(pa);
      setDriverCosts(dc);
      setAssignments(dva);
      setGaEntries(ga);
      setVehicleFixedCosts(vfc);
      setLoading(false);
    }).catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  const value: DataContextValue = {
    loading,
    error,
    vehicles, drivers, customers, jobGroups, jobs,
    jobLineItems, maintenanceEntries, fuelEntries, inspections,
    insurancePolicies, parkingEntries, driverCosts, gaEntries, vehicleFixedCosts,
    // @ts-ignore — driverVehicleAssignments is not in DataSnapshot but used by Drivers page
    driverVehicleAssignments,

    // Vehicles
    addVehicle: async (v) => run(
      () => apiFetch<Vehicle>('/api/v1/vehicles/', { method: 'POST', body: JSON.stringify(v) }),
      (c) => setVehicles(prev => [...prev, c])
    ),
    updateVehicle: async (v) => run(
      () => apiFetch<Vehicle>(`/api/v1/vehicles/${v.id}`, { method: 'PUT', body: JSON.stringify(v) }),
      (u) => setVehicles(prev => prev.map(x => x.id === v.id ? u : x))
    ),
    deleteVehicle: async (id) => run(
      () => apiFetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' }),
      () => setVehicles(prev => prev.filter(x => x.id !== id))
    ),

    // Drivers
    addDriver: async (d) => run(
      () => apiFetch<Driver>('/api/v1/drivers/', { method: 'POST', body: JSON.stringify(d) }),
      (c) => setDrivers(prev => [...prev, c])
    ),
    updateDriver: async (d) => run(
      () => apiFetch<Driver>(`/api/v1/drivers/${d.id}`, { method: 'PUT', body: JSON.stringify(d) }),
      (u) => setDrivers(prev => prev.map(x => x.id === d.id ? u : x))
    ),
    deleteDriver: async (id) => run(
      () => apiFetch(`/api/v1/drivers/${id}`, { method: 'DELETE' }),
      () => setDrivers(prev => prev.filter(x => x.id !== id))
    ),

    // Customers
    addCustomer: async (c) => run(
      () => apiFetch<Customer>('/api/v1/customers/', { method: 'POST', body: JSON.stringify(c) }),
      (created) => setCustomers(prev => [...prev, created])
    ),
    updateCustomer: async (c) => run(
      () => apiFetch<Customer>(`/api/v1/customers/${c.id}`, { method: 'PUT', body: JSON.stringify(c) }),
      (u) => setCustomers(prev => prev.map(x => x.id === c.id ? u : x))
    ),
    deleteCustomer: async (id) => run(
      () => apiFetch(`/api/v1/customers/${id}`, { method: 'DELETE' }),
      () => setCustomers(prev => prev.filter(x => x.id !== id))
    ),

    // Job Groups
    addJobGroup: async (jg) => run(
      () => apiFetch<JobGroup>('/api/v1/job-groups/', { method: 'POST', body: JSON.stringify(jg) }),
      (c) => setJobGroups(prev => [...prev, c])
    ),
    updateJobGroup: async (jg) => run(
      () => apiFetch<JobGroup>(`/api/v1/job-groups/${jg.id}`, { method: 'PUT', body: JSON.stringify(jg) }),
      (u) => setJobGroups(prev => prev.map(x => x.id === jg.id ? u : x))
    ),
    deleteJobGroup: async (id) => run(
      () => apiFetch(`/api/v1/job-groups/${id}`, { method: 'DELETE' }),
      () => setJobGroups(prev => prev.filter(x => x.id !== id))
    ),

    // Jobs
    addJob: async (j) => run(
      () => apiFetch<Job>('/api/v1/jobs/', { method: 'POST', body: JSON.stringify(j) }),
      (c) => setJobs(prev => [...prev, c])
    ),
    updateJob: async (j) => run(
      () => apiFetch<Job>(`/api/v1/jobs/${j.id}`, { method: 'PUT', body: JSON.stringify(j) }),
      (u) => setJobs(prev => prev.map(x => x.id === j.id ? u : x))
    ),
    deleteJob: async (id) => run(
      () => apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' }),
      () => setJobs(prev => prev.filter(x => x.id !== id))
    ),

    // Job Line Items
    addJobLineItem: async (li) => run(
      () => apiFetch<JobLineItem>('/api/v1/job-line-items/', { method: 'POST', body: JSON.stringify(li) }),
      (c) => setJobLineItems(prev => [...prev, c])
    ),
    updateJobLineItem: async (li) => run(
      () => apiFetch<JobLineItem>(`/api/v1/job-line-items/${li.id}`, { method: 'PUT', body: JSON.stringify(li) }),
      (u) => setJobLineItems(prev => prev.map(x => x.id === li.id ? u : x))
    ),
    deleteJobLineItem: async (id) => run(
      () => apiFetch(`/api/v1/job-line-items/${id}`, { method: 'DELETE' }),
      () => setJobLineItems(prev => prev.filter(x => x.id !== id))
    ),
    deleteJobLineItemsByJobId: async (jobId) => {
      const toDelete = jobLineItems.filter(li => li.jobId === jobId);
      await run(
        () => Promise.all(toDelete.map(li => apiFetch(`/api/v1/job-line-items/${li.id}`, { method: 'DELETE' }))),
        () => setJobLineItems(prev => prev.filter(x => x.jobId !== jobId))
      );
    },

    // Maintenance
    addMaintenance: async (e) => run(
      () => apiFetch<MaintenanceEntry>('/api/v1/maintenance/', { method: 'POST', body: JSON.stringify(e) }),
      (c) => setMaintenance(prev => [...prev, c])
    ),
    updateMaintenance: async (e) => run(
      () => apiFetch<MaintenanceEntry>(`/api/v1/maintenance/${e.id}`, { method: 'PUT', body: JSON.stringify(e) }),
      (u) => setMaintenance(prev => prev.map(x => x.id === e.id ? u : x))
    ),
    deleteMaintenance: async (id) => run(
      () => apiFetch(`/api/v1/maintenance/${id}`, { method: 'DELETE' }),
      () => setMaintenance(prev => prev.filter(x => x.id !== id))
    ),

    // Fuel
    addFuel: async (e) => run(
      () => apiFetch<FuelEntry>('/api/v1/fuel/', { method: 'POST', body: JSON.stringify(e) }),
      (c) => setFuel(prev => [...prev, c])
    ),
    updateFuel: async (e) => run(
      () => apiFetch<FuelEntry>(`/api/v1/fuel/${e.id}`, { method: 'PUT', body: JSON.stringify(e) }),
      (u) => setFuel(prev => prev.map(x => x.id === e.id ? u : x))
    ),
    deleteFuel: async (id) => run(
      () => apiFetch(`/api/v1/fuel/${id}`, { method: 'DELETE' }),
      () => setFuel(prev => prev.filter(x => x.id !== id))
    ),

    // Inspections
    addInspection: async (e) => run(
      () => apiFetch<Inspection>('/api/v1/inspections/', { method: 'POST', body: JSON.stringify(e) }),
      (c) => setInspections(prev => [...prev, c])
    ),
    updateInspection: async (e) => run(
      () => apiFetch<Inspection>(`/api/v1/inspections/${e.id}`, { method: 'PUT', body: JSON.stringify(e) }),
      (u) => setInspections(prev => prev.map(x => x.id === e.id ? u : x))
    ),
    deleteInspection: async (id) => run(
      () => apiFetch(`/api/v1/inspections/${id}`, { method: 'DELETE' }),
      () => setInspections(prev => prev.filter(x => x.id !== id))
    ),

    // G&A Entries
    addGaEntry: async (e) => run(
      () => apiFetch<GaEntry>('/api/v1/ga-entries/', { method: 'POST', body: JSON.stringify(e) }),
      (c) => setGaEntries(prev => [...prev, c])
    ),
    updateGaEntry: async (e) => run(
      () => apiFetch<GaEntry>(`/api/v1/ga-entries/${e.id}`, { method: 'PUT', body: JSON.stringify(e) }),
      (u) => setGaEntries(prev => prev.map(x => x.id === e.id ? u : x))
    ),
    deleteGaEntry: async (id) => run(
      () => apiFetch(`/api/v1/ga-entries/${id}`, { method: 'DELETE' }),
      () => setGaEntries(prev => prev.filter(x => x.id !== id))
    ),

    // Vehicle Fixed Costs
    addVehicleFixedCost: async (e) => run(
      () => apiFetch<VehicleFixedCost>('/api/v1/vehicle-fixed-costs/', { method: 'POST', body: JSON.stringify(e) }),
      (c) => setVehicleFixedCosts(prev => [...prev, c])
    ),
    updateVehicleFixedCost: async (e) => run(
      () => apiFetch<VehicleFixedCost>(`/api/v1/vehicle-fixed-costs/${e.id}`, { method: 'PUT', body: JSON.stringify(e) }),
      (u) => setVehicleFixedCosts(prev => prev.map(x => x.id === e.id ? u : x))
    ),
    deleteVehicleFixedCost: async (id) => run(
      () => apiFetch(`/api/v1/vehicle-fixed-costs/${id}`, { method: 'DELETE' }),
      () => setVehicleFixedCosts(prev => prev.filter(x => x.id !== id))
    ),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      {mutationError && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-sm">
          <span className="text-sm flex-1">{mutationError}</span>
          <button
            onClick={() => setMutationError(null)}
            className="text-red-200 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

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
    addVehicle: async (v) => {
      const created = await apiFetch<Vehicle>('/api/v1/vehicles/', { method: 'POST', body: JSON.stringify(v) });
      setVehicles(prev => [...prev, created]);
    },
    updateVehicle: async (v) => {
      const updated = await apiFetch<Vehicle>(`/api/v1/vehicles/${v.id}`, { method: 'PUT', body: JSON.stringify(v) });
      setVehicles(prev => prev.map(x => x.id === v.id ? updated : x));
    },
    deleteVehicle: async (id) => {
      await apiFetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(prev => prev.filter(x => x.id !== id));
    },

    // Drivers
    addDriver: async (d) => {
      const created = await apiFetch<Driver>('/api/v1/drivers/', { method: 'POST', body: JSON.stringify(d) });
      setDrivers(prev => [...prev, created]);
    },
    updateDriver: async (d) => {
      const updated = await apiFetch<Driver>(`/api/v1/drivers/${d.id}`, { method: 'PUT', body: JSON.stringify(d) });
      setDrivers(prev => prev.map(x => x.id === d.id ? updated : x));
    },
    deleteDriver: async (id) => {
      await apiFetch(`/api/v1/drivers/${id}`, { method: 'DELETE' });
      setDrivers(prev => prev.filter(x => x.id !== id));
    },

    // Customers
    addCustomer: async (c) => {
      const created = await apiFetch<Customer>('/api/v1/customers/', { method: 'POST', body: JSON.stringify(c) });
      setCustomers(prev => [...prev, created]);
    },
    updateCustomer: async (c) => {
      const updated = await apiFetch<Customer>(`/api/v1/customers/${c.id}`, { method: 'PUT', body: JSON.stringify(c) });
      setCustomers(prev => prev.map(x => x.id === c.id ? updated : x));
    },
    deleteCustomer: async (id) => {
      await apiFetch(`/api/v1/customers/${id}`, { method: 'DELETE' });
      setCustomers(prev => prev.filter(x => x.id !== id));
    },

    // Job Groups
    addJobGroup: async (jg) => {
      const created = await apiFetch<JobGroup>('/api/v1/job-groups/', { method: 'POST', body: JSON.stringify(jg) });
      setJobGroups(prev => [...prev, created]);
    },
    updateJobGroup: async (jg) => {
      const updated = await apiFetch<JobGroup>(`/api/v1/job-groups/${jg.id}`, { method: 'PUT', body: JSON.stringify(jg) });
      setJobGroups(prev => prev.map(x => x.id === jg.id ? updated : x));
    },
    deleteJobGroup: async (id) => {
      await apiFetch(`/api/v1/job-groups/${id}`, { method: 'DELETE' });
      setJobGroups(prev => prev.filter(x => x.id !== id));
    },

    // Jobs
    addJob: async (j) => {
      const created = await apiFetch<Job>('/api/v1/jobs/', { method: 'POST', body: JSON.stringify(j) });
      setJobs(prev => [...prev, created]);
    },
    updateJob: async (j) => {
      const updated = await apiFetch<Job>(`/api/v1/jobs/${j.id}`, { method: 'PUT', body: JSON.stringify(j) });
      setJobs(prev => prev.map(x => x.id === j.id ? updated : x));
    },
    deleteJob: async (id) => {
      await apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(x => x.id !== id));
    },

    // Job Line Items
    addJobLineItem: async (li) => {
      const created = await apiFetch<JobLineItem>('/api/v1/job-line-items/', { method: 'POST', body: JSON.stringify(li) });
      setJobLineItems(prev => [...prev, created]);
    },
    updateJobLineItem: async (li) => {
      const updated = await apiFetch<JobLineItem>(`/api/v1/job-line-items/${li.id}`, { method: 'PUT', body: JSON.stringify(li) });
      setJobLineItems(prev => prev.map(x => x.id === li.id ? updated : x));
    },
    deleteJobLineItem: async (id) => {
      await apiFetch(`/api/v1/job-line-items/${id}`, { method: 'DELETE' });
      setJobLineItems(prev => prev.filter(x => x.id !== id));
    },
    deleteJobLineItemsByJobId: async (jobId) => {
      const toDelete = jobLineItems.filter(li => li.jobId === jobId);
      await Promise.all(toDelete.map(li => apiFetch(`/api/v1/job-line-items/${li.id}`, { method: 'DELETE' })));
      setJobLineItems(prev => prev.filter(x => x.jobId !== jobId));
    },

    // Maintenance
    addMaintenance: async (e) => {
      const created = await apiFetch<MaintenanceEntry>('/api/v1/maintenance/', { method: 'POST', body: JSON.stringify(e) });
      setMaintenance(prev => [...prev, created]);
    },
    updateMaintenance: async (e) => {
      const updated = await apiFetch<MaintenanceEntry>(`/api/v1/maintenance/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setMaintenance(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteMaintenance: async (id) => {
      await apiFetch(`/api/v1/maintenance/${id}`, { method: 'DELETE' });
      setMaintenance(prev => prev.filter(x => x.id !== id));
    },

    // Fuel
    addFuel: async (e) => {
      const created = await apiFetch<FuelEntry>('/api/v1/fuel/', { method: 'POST', body: JSON.stringify(e) });
      setFuel(prev => [...prev, created]);
    },
    updateFuel: async (e) => {
      const updated = await apiFetch<FuelEntry>(`/api/v1/fuel/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setFuel(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteFuel: async (id) => {
      await apiFetch(`/api/v1/fuel/${id}`, { method: 'DELETE' });
      setFuel(prev => prev.filter(x => x.id !== id));
    },

    // Inspections
    addInspection: async (e) => {
      const created = await apiFetch<Inspection>('/api/v1/inspections/', { method: 'POST', body: JSON.stringify(e) });
      setInspections(prev => [...prev, created]);
    },
    updateInspection: async (e) => {
      const updated = await apiFetch<Inspection>(`/api/v1/inspections/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setInspections(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteInspection: async (id) => {
      await apiFetch(`/api/v1/inspections/${id}`, { method: 'DELETE' });
      setInspections(prev => prev.filter(x => x.id !== id));
    },

    // G&A Entries
    addGaEntry: async (e) => {
      const created = await apiFetch<GaEntry>('/api/v1/ga-entries/', { method: 'POST', body: JSON.stringify(e) });
      setGaEntries(prev => [...prev, created]);
    },
    updateGaEntry: async (e) => {
      const updated = await apiFetch<GaEntry>(`/api/v1/ga-entries/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setGaEntries(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteGaEntry: async (id) => {
      await apiFetch(`/api/v1/ga-entries/${id}`, { method: 'DELETE' });
      setGaEntries(prev => prev.filter(x => x.id !== id));
    },

    // Vehicle Fixed Costs
    addVehicleFixedCost: async (e) => {
      const created = await apiFetch<VehicleFixedCost>('/api/v1/vehicle-fixed-costs/', { method: 'POST', body: JSON.stringify(e) });
      setVehicleFixedCosts(prev => [...prev, created]);
    },
    updateVehicleFixedCost: async (e) => {
      const updated = await apiFetch<VehicleFixedCost>(`/api/v1/vehicle-fixed-costs/${e.id}`, { method: 'PUT', body: JSON.stringify(e) });
      setVehicleFixedCosts(prev => prev.map(x => x.id === e.id ? updated : x));
    },
    deleteVehicleFixedCost: async (id) => {
      await apiFetch(`/api/v1/vehicle-fixed-costs/${id}`, { method: 'DELETE' });
      setVehicleFixedCosts(prev => prev.filter(x => x.id !== id));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

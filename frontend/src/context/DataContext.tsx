import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Vehicle, Driver, Customer, JobGroup, Job, JobLineItem,
  MaintenanceEntry, FuelEntry, Inspection,
} from '../types';
import {
  vehicles as initVehicles,
  drivers as initDrivers,
  customers as initCustomers,
  jobGroups as initJobGroups,
  jobs as initJobs,
  jobLineItems as initJobLineItems,
  maintenanceEntries as initMaintenance,
  fuelEntries as initFuel,
  inspections as initInspections,
  insurancePolicies as initInsurance,
  parkingEntries as initParking,
  driverCosts as initDriverCosts,
  driverVehicleAssignments as initAssignments,
} from '../data';
import type { DataSnapshot } from '../lib/profit';

function nextId(arr: { id: number }[]): number {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

interface DataContextValue extends DataSnapshot {
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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState(initVehicles);
  const [drivers, setDrivers] = useState(initDrivers);
  const [customers, setCustomers] = useState(initCustomers);
  const [jobGroups, setJobGroups] = useState(initJobGroups);
  const [jobs, setJobs] = useState(initJobs);
  const [jobLineItems, setJobLineItems] = useState(initJobLineItems);
  const [maintenanceEntries, setMaintenance] = useState(initMaintenance);
  const [fuelEntries, setFuel] = useState(initFuel);
  const [inspections, setInspections] = useState(initInspections);

  // These are not editable in the UI — kept as-is
  const insurancePolicies = initInsurance;
  const parkingEntries = initParking;
  const driverCosts = initDriverCosts;
  const driverVehicleAssignments = initAssignments;

  const value: DataContextValue = {
    // snapshot fields
    vehicles, drivers, customers, jobGroups, jobs,
    jobLineItems, maintenanceEntries, fuelEntries, inspections,
    insurancePolicies, parkingEntries, driverCosts,
    // DataContext extras (used by Drivers page)
    // @ts-ignore — extend snapshot with non-profit fields
    driverVehicleAssignments,

    // Vehicles
    addVehicle: v => setVehicles(prev => [...prev, { ...v, id: nextId(prev) }]),
    updateVehicle: v => setVehicles(prev => prev.map(x => x.id === v.id ? v : x)),
    deleteVehicle: id => setVehicles(prev => prev.filter(x => x.id !== id)),

    // Drivers
    addDriver: d => setDrivers(prev => [...prev, { ...d, id: nextId(prev) }]),
    updateDriver: d => setDrivers(prev => prev.map(x => x.id === d.id ? d : x)),
    deleteDriver: id => setDrivers(prev => prev.filter(x => x.id !== id)),

    // Customers
    addCustomer: c => setCustomers(prev => [...prev, { ...c, id: nextId(prev) }]),
    updateCustomer: c => setCustomers(prev => prev.map(x => x.id === c.id ? c : x)),
    deleteCustomer: id => setCustomers(prev => prev.filter(x => x.id !== id)),

    // Job Groups
    addJobGroup: jg => setJobGroups(prev => [...prev, { ...jg, id: nextId(prev) }]),
    updateJobGroup: jg => setJobGroups(prev => prev.map(x => x.id === jg.id ? jg : x)),
    deleteJobGroup: id => setJobGroups(prev => prev.filter(x => x.id !== id)),

    // Jobs
    addJob: j => setJobs(prev => [...prev, { ...j, id: nextId(prev) }]),
    updateJob: j => setJobs(prev => prev.map(x => x.id === j.id ? j : x)),
    deleteJob: id => setJobs(prev => prev.filter(x => x.id !== id)),

    // Job Line Items
    addJobLineItem: li => setJobLineItems(prev => [...prev, { ...li, id: nextId(prev) }]),
    updateJobLineItem: li => setJobLineItems(prev => prev.map(x => x.id === li.id ? li : x)),
    deleteJobLineItem: id => setJobLineItems(prev => prev.filter(x => x.id !== id)),
    deleteJobLineItemsByJobId: jobId => setJobLineItems(prev => prev.filter(x => x.jobId !== jobId)),

    // Maintenance
    addMaintenance: e => setMaintenance(prev => [...prev, { ...e, id: nextId(prev) }]),
    updateMaintenance: e => setMaintenance(prev => prev.map(x => x.id === e.id ? e : x)),
    deleteMaintenance: id => setMaintenance(prev => prev.filter(x => x.id !== id)),

    // Fuel
    addFuel: e => setFuel(prev => [...prev, { ...e, id: nextId(prev) }]),
    updateFuel: e => setFuel(prev => prev.map(x => x.id === e.id ? e : x)),
    deleteFuel: id => setFuel(prev => prev.filter(x => x.id !== id)),

    // Inspections
    addInspection: e => setInspections(prev => [...prev, { ...e, id: nextId(prev) }]),
    updateInspection: e => setInspections(prev => prev.map(x => x.id === e.id ? e : x)),
    deleteInspection: id => setInspections(prev => prev.filter(x => x.id !== id)),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

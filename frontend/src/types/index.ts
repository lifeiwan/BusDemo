export interface Vehicle {
  id: number;
  year: number;
  make: string;
  model: string;
  vin: string;
  licensePlate: string;
  status: 'active' | 'maintenance' | 'out_of_service';
  mileage: number;
  color: string;
}

export interface Driver {
  id: number;
  name: string;
  license: string;
  licenseExpiry: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface DriverVehicleAssignment {
  id: number;
  driverId: number;
  vehicleId: number;
  startDate: string;
  endDate: string | null;
}

export interface Customer {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}

export interface JobGroup {
  id: number;
  name: string;
  type: 'route' | 'one_time';
  description: string;
}

export interface Job {
  id: number;
  name: string;
  jobGroupId: number;
  vehicleId: number;
  driverId: number | null;
  customerId: number;
  revenue: number;
  driverPayroll: number;
  paymentsReceived: number;
  recurrence: string;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'completed' | 'scheduled';
}

export interface JobLineItem {
  id: number;
  jobId: number;
  date: string;
  category: string;
  direction: 'cost' | 'income';
  amount: number;
  notes: string;
}

export interface MaintenanceEntry {
  id: number;
  vehicleId: number;
  date: string;
  type: string;
  mileage: number;
  cost: number;
  tech: string;
  notes: string;
}

export interface FuelEntry {
  id: number;
  vehicleId: number;
  date: string;
  gallons: number;
  cpg: number;
  total: number;
  odometer: number;
  full: boolean;
}

export interface Inspection {
  id: number;
  vehicleId: number;
  date: string;
  driverName: string;
  results: Record<string, 'pass' | 'fail'>;
  pass: boolean;
  notes: string;
}

export interface InsurancePolicy {
  id: number;
  vehicleId: number;
  provider: string;
  type: 'monthly' | 'yearly';
  cost: number;
  startDate: string;
  notes: string;
}

export interface ParkingEntry {
  id: number;
  vehicleId: number;
  type: 'monthly' | 'one_time';
  cost: number;
  startDate: string | null;
  date: string | null;
  location: string;
  jobId: number | null;
  notes: string;
}

export interface DriverCost {
  id: number;
  driverId: number;
  jobId: number | null;
  date: string;
  type: 'salary' | 'bonus' | 'reimbursement' | 'other';
  amount: number;
  notes: string;
}

export interface GaEntry {
  id: number;
  category: string;
  date: string;
  amount: number;
  notes: string;
}

export interface ProfitRow {
  id: number | string;
  label: string;
  revenue: number;
  costs: number;
  netProfit: number;
  margin: number;
  accountsReceivable?: number;
}

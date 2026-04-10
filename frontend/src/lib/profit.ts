import type {
  ProfitRow,
  Vehicle,
  Driver,
  Customer,
  JobGroup,
  Job,
  JobLineItem,
  MaintenanceEntry,
  FuelEntry,
  Inspection,
  InsurancePolicy,
  ParkingEntry,
  DriverCost,
} from '../types';

export interface DataSnapshot {
  vehicles: Vehicle[];
  drivers: Driver[];
  customers: Customer[];
  jobGroups: JobGroup[];
  jobs: Job[];
  jobLineItems: JobLineItem[];
  maintenanceEntries: MaintenanceEntry[];
  fuelEntries: FuelEntry[];
  inspections: Inspection[];
  insurancePolicies: InsurancePolicy[];
  parkingEntries: ParkingEntry[];
  driverCosts: DriverCost[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    startDate: new Date(y, m, 1).toISOString().slice(0, 10),
    endDate: new Date(y, m + 1, 0).toISOString().slice(0, 10),
  };
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.startDate && date <= range.endDate;
}

// ── Cost helpers ──────────────────────────────────────────

function insuranceCostForVehicle(vehicleId: number, data: DataSnapshot): number {
  return data.insurancePolicies
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => sum + (p.type === 'monthly' ? p.cost : p.cost / 12), 0);
}

function maintenanceCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  return data.maintenanceEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.cost, 0);
}

function fuelCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  return data.fuelEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.total, 0);
}

function parkingCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  return data.parkingEntries
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      if (p.type === 'monthly' && p.startDate) return sum + p.cost;
      if (p.type === 'one_time' && p.date && inRange(p.date, range)) return sum + p.cost;
      return sum;
    }, 0);
}

function driverCostForDriver(driverId: number, range: DateRange, data: DataSnapshot): number {
  return data.driverCosts
    .filter(c => c.driverId === driverId && inRange(c.date, range))
    .reduce((s, c) => s + c.amount, 0);
}

function totalVehicleCosts(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  return (
    maintenanceCostForVehicle(vehicleId, range, data) +
    fuelCostForVehicle(vehicleId, range, data) +
    insuranceCostForVehicle(vehicleId, data) +
    parkingCostForVehicle(vehicleId, range, data)
  );
}

export function jobNetProfit(jobId: number, range: DateRange, data: DataSnapshot): number {
  const job = data.jobs.find(j => j.id === jobId);
  if (!job) return 0;

  const lineIncome = data.jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'income')
    .reduce((s, li) => s + li.amount, 0);
  const lineCost = data.jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'cost')
    .reduce((s, li) => s + li.amount, 0);

  const vehicleCost = totalVehicleCosts(job.vehicleId, range, data);
  const driverCost = job.driverId ? driverCostForDriver(job.driverId, range, data) : 0;

  return (job.revenue + lineIncome) - (lineCost + vehicleCost + driverCost);
}

// ── Job filtering ─────────────────────────────────────────

function activeJobs(range: DateRange, data: DataSnapshot) {
  return data.jobs.filter(j => {
    const started = j.startDate <= range.endDate;
    const notEnded = !j.endDate || j.endDate >= range.startDate;
    return started && notEnded;
  });
}

// ── Pivot functions ───────────────────────────────────────

export function profitByJobGroup(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.jobGroups
    .map(jg => {
      const jgJobs = activeJobs(range, data).filter(j => j.jobGroupId === jg.id);
      const revenue = jgJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = jgJobs.reduce((s, j) => s + (j.revenue - jobNetProfit(j.id, range, data)), 0);
      const netProfit = revenue - costs;
      return { id: jg.id, label: jg.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByVehicle(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.vehicles
    .map(v => {
      const vJobs = activeJobs(range, data).filter(j => j.vehicleId === v.id);
      const revenue = vJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = totalVehicleCosts(v.id, range, data);
      const netProfit = revenue - costs;
      return { id: v.id, label: `${v.year} ${v.make} ${v.model}`, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByCustomer(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.customers
    .map(c => {
      const cJobs = activeJobs(range, data).filter(j => j.customerId === c.id);
      const revenue = cJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = cJobs.reduce((s, j) => s + (j.revenue - jobNetProfit(j.id, range, data)), 0);
      const netProfit = revenue - costs;
      return { id: c.id, label: c.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByDriver(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.drivers
    .map(d => {
      const dJobs = activeJobs(range, data).filter(j => j.driverId === d.id);
      const revenue = dJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = driverCostForDriver(d.id, range, data);
      const netProfit = revenue - costs;
      return { id: d.id, label: d.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

/** One row per calendar month within range, sorted most-recent first. */
export function profitByMonthRange(range: DateRange, data: DataSnapshot): ProfitRow[] {
  const result: ProfitRow[] = [];
  // Walk from end month down to start month
  const startFloor = new Date(range.startDate.slice(0, 7) + '-01');
  let cursor = new Date(range.endDate.slice(0, 7) + '-01');
  while (cursor >= startFloor) {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const monthRange: DateRange = {
      startDate: new Date(y, m, 1).toISOString().slice(0, 10),
      endDate: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
    const label = cursor.toLocaleString('default', { month: 'short', year: 'numeric' });
    const periodJobs = activeJobs(monthRange, data);
    const revenue = periodJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = periodJobs.reduce((s, j) => s + (j.revenue - jobNetProfit(j.id, monthRange, data)), 0);
    const netProfit = revenue - costs;
    result.push({ id: label, label, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 });
    cursor = new Date(y, m - 1, 1);
  }
  return result; // newest first
}

export function profitByPeriod(months: number, data: DataSnapshot): ProfitRow[] {
  const result: ProfitRow[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const range: DateRange = {
      startDate: new Date(y, m, 1).toISOString().slice(0, 10),
      endDate: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    const periodJobs = activeJobs(range, data);
    const revenue = periodJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = periodJobs.reduce((s, j) => s + (j.revenue - jobNetProfit(j.id, range, data)), 0);
    const netProfit = revenue - costs;
    result.push({ id: label, label, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 });
  }
  return result;
}

// ── Dashboard KPIs ────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  topCustomer: string;
  mostProfitableVehicle: string;
  fleetUtilizationRate: number;
  sparklineRevenue: number[];
  sparklineProfit: number[];
}

export function getDashboardKPIs(range: DateRange, data: DataSnapshot): DashboardKPIs {
  const byCustomer = profitByCustomer(range, data);
  const byVehicle = profitByVehicle(range, data);
  const periodData = profitByPeriod(6, data);

  const totalRevenue = byVehicle.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = byVehicle.reduce((s, r) => s + r.netProfit, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const topCustomer = byCustomer[0]?.label ?? '—';
  const mostProfitableVehicle = byVehicle[0]?.label ?? '—';
  const activeVehicleIds = new Set(activeJobs(range, data).map(j => j.vehicleId));
  const fleetUtilizationRate = data.vehicles.length > 0
    ? (activeVehicleIds.size / data.vehicles.length) * 100 : 0;

  return {
    totalRevenue, totalProfit, profitMargin, topCustomer, mostProfitableVehicle,
    fleetUtilizationRate,
    sparklineRevenue: periodData.map(p => p.revenue),
    sparklineProfit: periodData.map(p => p.netProfit),
  };
}

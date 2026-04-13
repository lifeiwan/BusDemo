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
  GaEntry,
  VehicleFixedCost,
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
  gaEntries: GaEntry[];
  vehicleFixedCosts: VehicleFixedCost[];
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

/** Number of calendar months fully or partially covered by a range. */
function monthsInRange(range: DateRange): number {
  const s = new Date(range.startDate.slice(0, 7) + '-01');
  const e = new Date(range.endDate.slice(0, 7) + '-01');
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}

// ── Cost helpers ──────────────────────────────────────────

function insuranceCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  const months = monthsInRange(range);
  return data.insurancePolicies
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => sum + (p.type === 'monthly' ? p.cost : p.cost / 12) * months, 0);
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

function fixedCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  const months = monthsInRange(range);
  return data.vehicleFixedCosts
    .filter(c => c.vehicleId === vehicleId)
    .reduce((sum, c) => sum + c.cost * months, 0);
}

function parkingCostForVehicle(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  const months = monthsInRange(range);
  return data.parkingEntries
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      if (p.type === 'monthly' && p.startDate) return sum + p.cost * months;
      if (p.type === 'one_time' && p.date && inRange(p.date, range)) return sum + p.cost;
      return sum;
    }, 0);
}


function gaCostForRange(range: DateRange, data: DataSnapshot): number {
  return data.gaEntries
    .filter(e => inRange(e.date, range))
    .reduce((s, e) => s + e.amount, 0);
}

function totalVehicleCosts(vehicleId: number, range: DateRange, data: DataSnapshot): number {
  return (
    maintenanceCostForVehicle(vehicleId, range, data) +
    fuelCostForVehicle(vehicleId, range, data) +
    insuranceCostForVehicle(vehicleId, range, data) +
    parkingCostForVehicle(vehicleId, range, data) +
    fixedCostForVehicle(vehicleId, range, data)
  );
}

/**
 * Revenue, costs, and net profit for a set of jobs.
 * - Revenue includes base job revenue + income line items.
 * - Costs include expense line items + vehicle costs (once per unique vehicle)
 *   + driver costs (once per unique driver), avoiding double-counting.
 */
function groupProfit(jobs: Job[], range: DateRange, data: DataSnapshot) {
  const revenue = jobs.reduce((s, j) => {
    const lineIncome = data.jobLineItems
      .filter(li => li.jobId === j.id && li.direction === 'income')
      .reduce((a, li) => a + li.amount, 0);
    return s + j.revenue + lineIncome;
  }, 0);

  const lineCosts = jobs.reduce((s, j) =>
    s + data.jobLineItems
      .filter(li => li.jobId === j.id && li.direction === 'cost')
      .reduce((a, li) => a + li.amount, 0), 0);

  const uniqueVehicleIds = [...new Set(jobs.map(j => j.vehicleId))];
  const vehicleCosts = uniqueVehicleIds.reduce((s, vId) => s + totalVehicleCosts(vId, range, data), 0);

  const driverCosts = jobs.reduce((s, j) => s + j.driverPayroll, 0);

  const costs = lineCosts + vehicleCosts + driverCosts;
  return { revenue, costs, netProfit: revenue - costs };
}

export function jobNetProfit(jobId: number, range: DateRange, data: DataSnapshot): number {
  const job = data.jobs.find(j => j.id === jobId);
  if (!job) return 0;
  return groupProfit([job], range, data).netProfit;
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
      const { revenue, costs, netProfit } = groupProfit(jgJobs, range, data);
      return { id: jg.id, label: jg.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByVehicle(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.vehicles
    .map(v => {
      const vJobs = activeJobs(range, data).filter(j => j.vehicleId === v.id);
      const revenue = vJobs.reduce((s, j) => {
        const lineIncome = data.jobLineItems
          .filter(li => li.jobId === j.id && li.direction === 'income')
          .reduce((a, li) => a + li.amount, 0);
        return s + j.revenue + lineIncome;
      }, 0);
      const lineCosts = vJobs.reduce((s, j) =>
        s + data.jobLineItems
          .filter(li => li.jobId === j.id && li.direction === 'cost')
          .reduce((a, li) => a + li.amount, 0), 0);
      const costs = totalVehicleCosts(v.id, range, data) + lineCosts;
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
      const { revenue, costs, netProfit } = groupProfit(cJobs, range, data);
      const accountsReceivable = cJobs.reduce((s, j) => s + (j.revenue - j.paymentsReceived), 0);
      return { id: c.id, label: c.name, revenue, costs, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0, accountsReceivable };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByDriver(range: DateRange, data: DataSnapshot): ProfitRow[] {
  return data.drivers
    .map(d => {
      const dJobs = activeJobs(range, data).filter(j => j.driverId === d.id);
      const revenue = dJobs.reduce((s, j) => {
        const lineIncome = data.jobLineItems
          .filter(li => li.jobId === j.id && li.direction === 'income')
          .reduce((a, li) => a + li.amount, 0);
        return s + j.revenue + lineIncome;
      }, 0);
      const costs = dJobs.reduce((s, j) => s + j.driverPayroll, 0);
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
    const { revenue, costs: jobCosts, netProfit: jobNetProfitVal } = groupProfit(periodJobs, monthRange, data);
    const ga = gaCostForRange(monthRange, data);
    const costs = jobCosts + ga;
    const netProfit = jobNetProfitVal - ga;
    result.push({ id: label, label, revenue, costs, cogs: jobCosts, ga, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : 0 });
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
    const { revenue, costs: jobCosts, netProfit: jobNetProfitVal } = groupProfit(periodJobs, range, data);
    const ga = gaCostForRange(range, data);
    const costs = jobCosts + ga;
    const netProfit = jobNetProfitVal - ga;
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
  const gaTotal = gaCostForRange(range, data);
  const totalProfit = byVehicle.reduce((s, r) => s + r.netProfit, 0) - gaTotal;
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

import type { ProfitRow } from '../types';
import {
  jobs,
  jobLineItems,
  maintenanceEntries,
  fuelEntries,
  insurancePolicies,
  parkingEntries,
  driverCosts,
  vehicles,
  drivers,
  customers,
  jobGroups,
} from '../data';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.startDate && date <= range.endDate;
}

// ── Cost helpers ──────────────────────────────────────────

function insuranceCostForVehicle(vehicleId: number): number {
  return insurancePolicies
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      const monthly = p.type === 'monthly' ? p.cost : p.cost / 12;
      return sum + monthly;
    }, 0);
}

function maintenanceCostForVehicle(vehicleId: number, range: DateRange): number {
  return maintenanceEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.cost, 0);
}

function fuelCostForVehicle(vehicleId: number, range: DateRange): number {
  return fuelEntries
    .filter(e => e.vehicleId === vehicleId && inRange(e.date, range))
    .reduce((s, e) => s + e.total, 0);
}

function parkingCostForVehicle(vehicleId: number, range: DateRange): number {
  return parkingEntries
    .filter(p => p.vehicleId === vehicleId)
    .reduce((sum, p) => {
      if (p.type === 'monthly' && p.startDate) return sum + p.cost;
      if (p.type === 'one_time' && p.date && inRange(p.date, range)) return sum + p.cost;
      return sum;
    }, 0);
}

function driverCostForDriver(driverId: number, range: DateRange): number {
  return driverCosts
    .filter(c => c.driverId === driverId && inRange(c.date, range))
    .reduce((s, c) => s + c.amount, 0);
}

function totalVehicleCosts(vehicleId: number, range: DateRange): number {
  return (
    maintenanceCostForVehicle(vehicleId, range) +
    fuelCostForVehicle(vehicleId, range) +
    insuranceCostForVehicle(vehicleId) +
    parkingCostForVehicle(vehicleId, range)
  );
}

export function jobNetProfit(jobId: number, range: DateRange): number {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return 0;

  const lineIncome = jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'income')
    .reduce((s, li) => s + li.amount, 0);
  const lineCost = jobLineItems
    .filter(li => li.jobId === jobId && li.direction === 'cost')
    .reduce((s, li) => s + li.amount, 0);

  const vehicleCost = totalVehicleCosts(job.vehicleId, range);
  const driverCost = job.driverId ? driverCostForDriver(job.driverId, range) : 0;

  const totalRevenue = job.revenue + lineIncome;
  const totalCosts = lineCost + vehicleCost + driverCost;
  return totalRevenue - totalCosts;
}

// ── Job filtering ─────────────────────────────────────────

function activeJobs(range: DateRange) {
  return jobs.filter(j => {
    const started = j.startDate <= range.endDate;
    const notEnded = !j.endDate || j.endDate >= range.startDate;
    return started && notEnded;
  });
}

// ── Pivot functions ───────────────────────────────────────

export function profitByJobGroup(range: DateRange): ProfitRow[] {
  return jobGroups
    .map(jg => {
      const jgJobs = activeJobs(range).filter(j => j.jobGroupId === jg.id);
      const revenue = jgJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = jgJobs.reduce((s, j) => {
        const net = jobNetProfit(j.id, range);
        return s + (j.revenue - net);
      }, 0);
      const netProfit = revenue - costs;
      return {
        id: jg.id,
        label: jg.name,
        revenue,
        costs,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByVehicle(range: DateRange): ProfitRow[] {
  return vehicles
    .map(v => {
      const vJobs = activeJobs(range).filter(j => j.vehicleId === v.id);
      const revenue = vJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = totalVehicleCosts(v.id, range);
      const netProfit = revenue - costs;
      return {
        id: v.id,
        label: `${v.year} ${v.make} ${v.model}`,
        revenue,
        costs,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByCustomer(range: DateRange): ProfitRow[] {
  return customers
    .map(c => {
      const cJobs = activeJobs(range).filter(j => j.customerId === c.id);
      const revenue = cJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = cJobs.reduce((s, j) => {
        const net = jobNetProfit(j.id, range);
        return s + (j.revenue - net);
      }, 0);
      const netProfit = revenue - costs;
      return {
        id: c.id,
        label: c.name,
        revenue,
        costs,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByDriver(range: DateRange): ProfitRow[] {
  return drivers
    .map(d => {
      const dJobs = activeJobs(range).filter(j => j.driverId === d.id);
      const revenue = dJobs.reduce((s, j) => s + j.revenue, 0);
      const costs = driverCostForDriver(d.id, range);
      const netProfit = revenue - costs;
      return {
        id: d.id,
        label: d.name,
        revenue,
        costs,
        netProfit,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      };
    })
    .filter(r => r.revenue > 0 || r.costs > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
}

export function profitByPeriod(months = 6): ProfitRow[] {
  const result: ProfitRow[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const range: DateRange = {
      startDate: new Date(y, m, 1).toISOString().slice(0, 10),
      endDate: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
    const periodJobs = activeJobs(range);
    const revenue = periodJobs.reduce((s, j) => s + j.revenue, 0);
    const costs = periodJobs.reduce((s, j) => {
      const net = jobNetProfit(j.id, range);
      return s + (j.revenue - net);
    }, 0);
    const netProfit = revenue - costs;
    result.push({
      id: label,
      label,
      revenue,
      costs,
      netProfit,
      margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
    });
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

export function getDashboardKPIs(range: DateRange): DashboardKPIs {
  const byCustomer = profitByCustomer(range);
  const byVehicle = profitByVehicle(range);
  const periodData = profitByPeriod(6);

  const totalRevenue = byVehicle.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = byVehicle.reduce((s, r) => s + r.netProfit, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const topCustomer = byCustomer[0]?.label ?? '—';
  const mostProfitableVehicle = byVehicle[0]?.label ?? '—';

  const activeVehicleIds = new Set(activeJobs(range).map(j => j.vehicleId));
  const fleetUtilizationRate =
    vehicles.length > 0 ? (activeVehicleIds.size / vehicles.length) * 100 : 0;

  return {
    totalRevenue,
    totalProfit,
    profitMargin,
    topCustomer,
    mostProfitableVehicle,
    fleetUtilizationRate,
    sparklineRevenue: periodData.map(p => p.revenue),
    sparklineProfit: periodData.map(p => p.netProfit),
  };
}

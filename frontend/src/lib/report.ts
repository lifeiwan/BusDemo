import type { DataSnapshot } from './profit';

export interface PLMonthData {
  revenue: number;
  driverPayroll: number;
  fuel: number;
  maintenance: number;
  insurance: number;
  loan: number;
  eld: number;
  managementFee: number;
  parking: number;
  ezPass: number;
  otherCogs: number;
  ga: Record<string, number>;
}

export interface PLReport {
  year: number;
  months: PLMonthData[]; // index 0 = Jan, 11 = Dec
}

function inMonth(date: string, year: number, m: number): boolean {
  const mm = String(m + 1).padStart(2, '0');
  return date.startsWith(`${year}-${mm}`);
}

function lastDay(year: number, m: number): string {
  return new Date(year, m + 1, 0).toISOString().slice(0, 10);
}

function activeJobsInMonth(year: number, m: number, data: DataSnapshot) {
  const start = `${year}-${String(m + 1).padStart(2, '0')}-01`;
  const end = lastDay(year, m);
  return data.jobs.filter(j => j.startDate <= end && (!j.endDate || j.endDate >= start));
}

function computeMonth(year: number, m: number, data: DataSnapshot): PLMonthData {
  const jobs = activeJobsInMonth(year, m, data);

  // Revenue = job base revenue + income line items dated this month
  const revenue = jobs.reduce((s, j) => {
    const lineIncome = data.jobLineItems
      .filter(li => li.jobId === j.id && li.direction === 'income' && inMonth(li.date, year, m))
      .reduce((a, li) => a + li.amount, 0);
    return s + j.revenue + lineIncome;
  }, 0);

  // Driver payroll from active jobs
  const driverPayroll = jobs.reduce((s, j) => s + j.driverPayroll, 0);

  // Fuel entries in this month (all vehicles)
  const fuel = data.fuelEntries
    .filter(e => inMonth(e.date, year, m))
    .reduce((s, e) => s + e.total, 0);

  // Maintenance entries in this month (all vehicles)
  const maintenance = data.maintenanceEntries
    .filter(e => inMonth(e.date, year, m))
    .reduce((s, e) => s + e.cost, 0);

  // Insurance — all vehicles, 1 month
  const insurance = data.insurancePolicies
    .reduce((s, p) => s + (p.type === 'monthly' ? p.cost : p.cost / 12), 0);

  // Vehicle fixed costs — all vehicles
  const loan = data.vehicleFixedCosts
    .filter(c => c.type === 'loan')
    .reduce((s, c) => s + c.cost, 0);
  const eld = data.vehicleFixedCosts
    .filter(c => c.type === 'eld')
    .reduce((s, c) => s + c.cost, 0);
  const managementFee = data.vehicleFixedCosts
    .filter(c => c.type === 'management_fee')
    .reduce((s, c) => s + c.cost, 0);

  // Parking — monthly entries always counted, one-time entries by date
  const parking = data.parkingEntries.reduce((s, p) => {
    if (p.type === 'monthly') return s + p.cost;
    if (p.type === 'one_time' && p.date && inMonth(p.date, year, m)) return s + p.cost;
    return s;
  }, 0);

  // EZ-Pass job line items (cost, dated this month)
  const ezPass = data.jobLineItems
    .filter(li => li.direction === 'cost' && li.category === 'EZ-Pass' && inMonth(li.date, year, m))
    .reduce((s, li) => s + li.amount, 0);

  // Other COGS job line items (cost, not EZ-Pass, dated this month)
  const otherCogs = data.jobLineItems
    .filter(li => li.direction === 'cost' && li.category !== 'EZ-Pass' && inMonth(li.date, year, m))
    .reduce((s, li) => s + li.amount, 0);

  // G&A by category
  const ga: Record<string, number> = {};
  for (const e of data.gaEntries) {
    if (inMonth(e.date, year, m)) {
      ga[e.category] = (ga[e.category] ?? 0) + e.amount;
    }
  }

  return { revenue, driverPayroll, fuel, maintenance, insurance, loan, eld, managementFee, parking, ezPass, otherCogs, ga };
}

// ── Per-job-group monthly report ─────────────────────────

export interface JobGroupMonthRow {
  jobGroupId: number;
  label: string;
  revenue: number;
  payroll: number;
  fuel: number;
  repair: number;
  others: number;
  ezPass: number;
  insurance: number;
  managementFee: number;
  loan: number;
  parking: number;
  eld: number;
  net: number;
}

export function buildJobGroupMonthReport(year: number, month: number, data: DataSnapshot): JobGroupMonthRow[] {
  return data.jobGroups.map(jg => {
    const groupJobs = activeJobsInMonth(year, month, data).filter(j => j.jobGroupId === jg.id);

    const revenue = groupJobs.reduce((s, j) => {
      const lineIncome = data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'income' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0);
      return s + j.revenue + lineIncome;
    }, 0);

    const payroll = groupJobs.reduce((s, j) => s + j.driverPayroll, 0);

    // For fuel, repair, insurance, loan, eld, managementFee, parking — allocate based on vehicles used by jobs in this group
    const vehicleIds = new Set(groupJobs.map(j => j.vehicleId).filter((id): id is number => id != null));

    const fuel = data.fuelEntries
      .filter(e => vehicleIds.has(e.vehicleId) && inMonth(e.date, year, month))
      .reduce((s, e) => s + e.total, 0);

    const repair = data.maintenanceEntries
      .filter(e => vehicleIds.has(e.vehicleId) && inMonth(e.date, year, month))
      .reduce((s, e) => s + e.cost, 0);

    const others = groupJobs.reduce((s, j) =>
      s + data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'cost' && li.category !== 'EZ-Pass' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0), 0);

    const ezPass = groupJobs.reduce((s, j) =>
      s + data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'cost' && li.category === 'EZ-Pass' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0), 0);

    const insurance = data.insurancePolicies
      .filter(p => vehicleIds.has(p.vehicleId))
      .reduce((s, p) => s + (p.type === 'monthly' ? p.cost : p.cost / 12), 0);

    const managementFee = data.vehicleFixedCosts
      .filter(c => vehicleIds.has(c.vehicleId) && c.type === 'management_fee')
      .reduce((s, c) => s + c.cost, 0);

    const loan = data.vehicleFixedCosts
      .filter(c => vehicleIds.has(c.vehicleId) && c.type === 'loan')
      .reduce((s, c) => s + c.cost, 0);

    const parking = data.parkingEntries
      .filter(p => vehicleIds.has(p.vehicleId))
      .reduce((s, p) => {
        if (p.type === 'monthly') return s + p.cost;
        if (p.type === 'one_time' && p.date && inMonth(p.date, year, month)) return s + p.cost;
        return s;
      }, 0);

    const eld = data.vehicleFixedCosts
      .filter(c => vehicleIds.has(c.vehicleId) && c.type === 'eld')
      .reduce((s, c) => s + c.cost, 0);

    const net = revenue - payroll - fuel - repair - others - ezPass - insurance - managementFee - loan - parking - eld;

    return { jobGroupId: jg.id, label: jg.name, revenue, payroll, fuel, repair, others, ezPass, insurance, managementFee, loan, parking, eld, net };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function buildJobGroupYTDReport(year: number, monthCount: number, data: DataSnapshot): JobGroupMonthRow[] {
  const acc = new Map<number, JobGroupMonthRow>();
  for (let m = 0; m < monthCount; m++) {
    for (const row of buildJobGroupMonthReport(year, m, data)) {
      const existing = acc.get(row.jobGroupId);
      if (!existing) {
        acc.set(row.jobGroupId, { ...row });
      } else {
        existing.revenue += row.revenue;
        existing.payroll += row.payroll;
        existing.fuel += row.fuel;
        existing.repair += row.repair;
        existing.others += row.others;
        existing.ezPass += row.ezPass;
        existing.insurance += row.insurance;
        existing.managementFee += row.managementFee;
        existing.loan += row.loan;
        existing.parking += row.parking;
        existing.eld += row.eld;
        existing.net += row.net;
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.revenue - a.revenue);
}

// ── Per-vehicle monthly report ────────────────────────────

export interface VehicleMonthRow {
  vehicleId: number;
  label: string;
  revenue: number;
  payroll: number;
  fuel: number;
  repair: number;
  others: number;
  ezPass: number;
  insurance: number;
  managementFee: number;
  loan: number;
  parking: number;
  eld: number;
  net: number;
}

export function buildVehicleMonthReport(year: number, month: number, data: DataSnapshot): VehicleMonthRow[] {
  return data.vehicles.map(vehicle => {
    const vJobs = activeJobsInMonth(year, month, data).filter(j => j.vehicleId === vehicle.id);

    const revenue = vJobs.reduce((s, j) => {
      const lineIncome = data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'income' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0);
      return s + j.revenue + lineIncome;
    }, 0);

    const payroll = vJobs.reduce((s, j) => s + j.driverPayroll, 0);

    const fuel = data.fuelEntries
      .filter(e => e.vehicleId === vehicle.id && inMonth(e.date, year, month))
      .reduce((s, e) => s + e.total, 0);

    const repair = data.maintenanceEntries
      .filter(e => e.vehicleId === vehicle.id && inMonth(e.date, year, month))
      .reduce((s, e) => s + e.cost, 0);

    // Others = cost line items not EZ-Pass, for this vehicle's jobs, dated this month
    const others = vJobs.reduce((s, j) =>
      s + data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'cost' && li.category !== 'EZ-Pass' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0), 0);

    const ezPass = vJobs.reduce((s, j) =>
      s + data.jobLineItems
        .filter(li => li.jobId === j.id && li.direction === 'cost' && li.category === 'EZ-Pass' && inMonth(li.date, year, month))
        .reduce((a, li) => a + li.amount, 0), 0);

    const insurance = data.insurancePolicies
      .filter(p => p.vehicleId === vehicle.id)
      .reduce((s, p) => s + (p.type === 'monthly' ? p.cost : p.cost / 12), 0);

    const managementFee = data.vehicleFixedCosts
      .filter(c => c.vehicleId === vehicle.id && c.type === 'management_fee')
      .reduce((s, c) => s + c.cost, 0);

    const loan = data.vehicleFixedCosts
      .filter(c => c.vehicleId === vehicle.id && c.type === 'loan')
      .reduce((s, c) => s + c.cost, 0);

    const parking = data.parkingEntries
      .filter(p => p.vehicleId === vehicle.id)
      .reduce((s, p) => {
        if (p.type === 'monthly') return s + p.cost;
        if (p.type === 'one_time' && p.date && inMonth(p.date, year, month)) return s + p.cost;
        return s;
      }, 0);

    const eld = data.vehicleFixedCosts
      .filter(c => c.vehicleId === vehicle.id && c.type === 'eld')
      .reduce((s, c) => s + c.cost, 0);

    const net = revenue - payroll - fuel - repair - others - ezPass - insurance - managementFee - loan - parking - eld;
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;

    return { vehicleId: vehicle.id, label, revenue, payroll, fuel, repair, others, ezPass, insurance, managementFee, loan, parking, eld, net };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function buildVehicleYTDReport(year: number, monthCount: number, data: DataSnapshot): VehicleMonthRow[] {
  const acc = new Map<number, VehicleMonthRow>();
  for (let m = 0; m < monthCount; m++) {
    for (const row of buildVehicleMonthReport(year, m, data)) {
      const existing = acc.get(row.vehicleId);
      if (!existing) {
        acc.set(row.vehicleId, { ...row });
      } else {
        existing.revenue += row.revenue;
        existing.payroll += row.payroll;
        existing.fuel += row.fuel;
        existing.repair += row.repair;
        existing.others += row.others;
        existing.ezPass += row.ezPass;
        existing.insurance += row.insurance;
        existing.managementFee += row.managementFee;
        existing.loan += row.loan;
        existing.parking += row.parking;
        existing.eld += row.eld;
        existing.net += row.net;
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.revenue - a.revenue);
}

export function buildPLReport(year: number, data: DataSnapshot): PLReport {
  const months = Array.from({ length: 12 }, (_, m) => computeMonth(year, m, data));
  return { year, months };
}

export function sumMonths(months: PLMonthData[]): PLMonthData {
  const total: PLMonthData = {
    revenue: 0, driverPayroll: 0, fuel: 0, maintenance: 0,
    insurance: 0, loan: 0, eld: 0, managementFee: 0,
    parking: 0, ezPass: 0, otherCogs: 0, ga: {},
  };
  for (const m of months) {
    total.revenue += m.revenue;
    total.driverPayroll += m.driverPayroll;
    total.fuel += m.fuel;
    total.maintenance += m.maintenance;
    total.insurance += m.insurance;
    total.loan += m.loan;
    total.eld += m.eld;
    total.managementFee += m.managementFee;
    total.parking += m.parking;
    total.ezPass += m.ezPass;
    total.otherCogs += m.otherCogs;
    for (const [cat, amt] of Object.entries(m.ga)) {
      total.ga[cat] = (total.ga[cat] ?? 0) + amt;
    }
  }
  return total;
}

export function cogsTotal(m: PLMonthData): number {
  return m.driverPayroll + m.fuel + m.maintenance + m.insurance +
    m.loan + m.eld + m.managementFee + m.parking + m.ezPass + m.otherCogs;
}

export function gaTotal(m: PLMonthData): number {
  return Object.values(m.ga).reduce((s, v) => s + v, 0);
}

export function netProfit(m: PLMonthData): number {
  return m.revenue - cogsTotal(m) - gaTotal(m);
}

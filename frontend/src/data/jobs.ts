import type { Job } from '../types';

export const jobs: Job[] = [
  { id: 1,  name: 'Airport Shuttle Route A',   jobGroupId: 1, vehicleId: 1,  driverId: 1,    customerId: 8, revenue: 350,  driverPayroll: 120, paymentsReceived: 0,   recurrence: 'daily',    startDate: '2026-01-01', endDate: null,         status: 'active'    },
  { id: 2,  name: 'Downtown Delivery Circuit', jobGroupId: 2, vehicleId: 2,  driverId: 4,    customerId: 4, revenue: 280,  driverPayroll: 90,  paymentsReceived: 0,   recurrence: 'daily',    startDate: '2026-01-01', endDate: null,         status: 'active'    },
  { id: 3,  name: 'Warehouse Run — North',     jobGroupId: 2, vehicleId: 5,  driverId: 3,    customerId: 4, revenue: 420,  driverPayroll: 140, paymentsReceived: 0,   recurrence: 'weekly',   startDate: '2026-01-05', endDate: null,         status: 'active'    },
  { id: 4,  name: 'School District Transport', jobGroupId: 1, vehicleId: 7,  driverId: 6,    customerId: 2, revenue: 190,  driverPayroll: 65,  paymentsReceived: 0,   recurrence: 'weekly',   startDate: '2026-01-06', endDate: null,         status: 'active'    },
  { id: 5,  name: 'County Fair Shuttle',       jobGroupId: 1, vehicleId: 9,  driverId: 1,    customerId: 6, revenue: 310,  driverPayroll: 100, paymentsReceived: 0,   recurrence: 'weekly',   startDate: '2026-02-01', endDate: null,         status: 'active'    },
  { id: 6,  name: 'Corporate Move — TechCorp', jobGroupId: 3, vehicleId: 8,  driverId: null, customerId: 1, revenue: 1200, driverPayroll: 0,   paymentsReceived: 1200,recurrence: 'one_time', startDate: '2026-03-15', endDate: '2026-03-15', status: 'completed' },
  { id: 7,  name: 'Event Staff Transport',     jobGroupId: 3, vehicleId: 4,  driverId: 5,    customerId: 3, revenue: 650,  driverPayroll: 200, paymentsReceived: 0,   recurrence: 'one_time', startDate: '2026-03-22', endDate: '2026-03-22', status: 'completed' },
  { id: 8,  name: 'Emergency Parts Delivery',  jobGroupId: 4, vehicleId: 9,  driverId: 1,    customerId: 5, revenue: 380,  driverPayroll: 120, paymentsReceived: 0,   recurrence: 'one_time', startDate: '2026-03-28', endDate: '2026-03-28', status: 'completed' },
  { id: 9,  name: 'Construction Site Haul',    jobGroupId: 4, vehicleId: 10, driverId: null, customerId: 7, revenue: 890,  driverPayroll: 0,   paymentsReceived: 445, recurrence: 'one_time', startDate: '2026-03-10', endDate: '2026-03-10', status: 'completed' },
  { id: 10, name: 'Medical Supply Run',        jobGroupId: 4, vehicleId: 1,  driverId: 1,    customerId: 5, revenue: 450,  driverPayroll: 150, paymentsReceived: 0,   recurrence: 'one_time', startDate: '2026-02-20', endDate: '2026-02-20', status: 'completed' },
];

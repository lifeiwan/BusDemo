import type { JobGroup } from '../types';

export const jobGroups: JobGroup[] = [
  { id: 1, name: 'NYC to Boston',     type: 'route',    description: 'Recurring daily/weekly shuttle contracts', customerId: null, vehicleId: null, defaultRevenue: 350,  defaultDriverPayroll: 120, recurrence: 'daily'    },
  { id: 2, name: 'Flushing to JFK',   type: 'route',    description: 'Recurring delivery and transport routes',  customerId: null, vehicleId: null, defaultRevenue: 280,  defaultDriverPayroll: 90,  recurrence: 'weekly'   },
  { id: 3, name: 'Long Island Tour',  type: 'one_time', description: 'Ad-hoc corporate moves and events',        customerId: null, vehicleId: null, defaultRevenue: 1000, defaultDriverPayroll: 0,   recurrence: 'one_time' },
  { id: 4, name: 'Easter Parade',     type: 'one_time', description: 'Unscheduled urgent jobs',                  customerId: null, vehicleId: null, defaultRevenue: 500,  defaultDriverPayroll: 0,   recurrence: 'one_time' },
];

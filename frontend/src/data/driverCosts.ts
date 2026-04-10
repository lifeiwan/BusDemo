import type { DriverCost } from '../types';

export const driverCosts: DriverCost[] = [
  { id: 1, driverId: 1, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3500, notes: 'March salary'                       },
  { id: 2, driverId: 2, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3200, notes: 'March salary'                       },
  { id: 3, driverId: 3, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3400, notes: 'March salary'                       },
  { id: 4, driverId: 4, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3100, notes: 'March salary'                       },
  { id: 5, driverId: 5, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3300, notes: 'March salary'                       },
  { id: 6, driverId: 6, jobId: null, date: '2026-03-31', type: 'salary',        amount: 3250, notes: 'March salary'                       },
  { id: 7, driverId: 1, jobId: null, date: '2026-03-15', type: 'bonus',         amount: 500,  notes: 'Airport route performance bonus'    },
  { id: 8, driverId: 3, jobId: null, date: '2026-03-20', type: 'reimbursement', amount: 125,  notes: 'Toll fees'                          },
  { id: 9, driverId: 4, jobId: null, date: '2026-03-10', type: 'reimbursement', amount: 85,   notes: 'Parking fees'                       },
];

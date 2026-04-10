import type { InsurancePolicy } from '../types';

export const insurancePolicies: InsurancePolicy[] = [
  { id: 1,  vehicleId: 1,  provider: 'Geico',       type: 'monthly', cost: 180,  startDate: '2026-01-01', notes: 'Comprehensive'          },
  { id: 2,  vehicleId: 2,  provider: 'Progressive', type: 'yearly',  cost: 1920, startDate: '2026-01-01', notes: 'Full coverage'           },
  { id: 3,  vehicleId: 3,  provider: 'State Farm',  type: 'monthly', cost: 195,  startDate: '2026-01-01', notes: 'Comprehensive'          },
  { id: 4,  vehicleId: 4,  provider: 'Geico',       type: 'yearly',  cost: 1560, startDate: '2026-01-01', notes: 'Liability + collision'   },
  { id: 5,  vehicleId: 5,  provider: 'Progressive', type: 'monthly', cost: 220,  startDate: '2026-01-01', notes: 'Commercial fleet'        },
  { id: 6,  vehicleId: 6,  provider: 'Allstate',    type: 'yearly',  cost: 2400, startDate: '2026-01-01', notes: 'Full coverage'           },
  { id: 7,  vehicleId: 7,  provider: 'State Farm',  type: 'monthly', cost: 165,  startDate: '2026-01-01', notes: 'Comprehensive'          },
  { id: 8,  vehicleId: 8,  provider: 'Progressive', type: 'monthly', cost: 245,  startDate: '2026-01-01', notes: 'Commercial van'         },
  { id: 9,  vehicleId: 9,  provider: 'Geico',       type: 'yearly',  cost: 1800, startDate: '2026-01-01', notes: 'Full coverage'           },
  { id: 10, vehicleId: 10, provider: 'Progressive', type: 'monthly', cost: 210,  startDate: '2026-01-01', notes: 'Commercial van'         },
];

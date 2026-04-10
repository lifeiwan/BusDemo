import type { FuelEntry } from '../types';

export const fuelEntries: FuelEntry[] = [
  // Vehicle 1 — Ford F-150
  { id: 1,  vehicleId: 1, date: '2026-03-28', gallons: 18.4, cpg: 3.79, total: 69.74,  odometer: 34100, full: true  },
  { id: 2,  vehicleId: 1, date: '2026-03-10', gallons: 17.2, cpg: 3.72, total: 63.98,  odometer: 33800, full: true  },
  { id: 3,  vehicleId: 1, date: '2026-02-20', gallons: 18.0, cpg: 3.68, total: 66.24,  odometer: 33500, full: true  },
  { id: 4,  vehicleId: 1, date: '2026-01-30', gallons: 17.5, cpg: 3.55, total: 62.13,  odometer: 33200, full: true  },

  // Vehicle 2 — Chevrolet Silverado
  { id: 5,  vehicleId: 2, date: '2026-03-25', gallons: 22.1, cpg: 3.75, total: 82.88,  odometer: 51750, full: true  },
  { id: 6,  vehicleId: 2, date: '2026-03-08', gallons: 20.6, cpg: 3.68, total: 75.81,  odometer: 51500, full: false },
  { id: 7,  vehicleId: 2, date: '2026-02-15', gallons: 21.3, cpg: 3.62, total: 77.11,  odometer: 51200, full: true  },
  { id: 8,  vehicleId: 2, date: '2026-01-25', gallons: 22.8, cpg: 3.58, total: 81.62,  odometer: 50900, full: true  },

  // Vehicle 3 — RAM 1500
  { id: 9,  vehicleId: 3, date: '2026-03-05', gallons: 19.2, cpg: 3.77, total: 72.38,  odometer: 22300, full: true  },
  { id: 10, vehicleId: 3, date: '2026-02-10', gallons: 18.5, cpg: 3.70, total: 68.45,  odometer: 22000, full: true  },

  // Vehicle 4 — Toyota Tacoma
  { id: 11, vehicleId: 4, date: '2026-03-20', gallons: 16.8, cpg: 3.82, total: 64.18,  odometer: 67200, full: true  },
  { id: 12, vehicleId: 4, date: '2026-03-05', gallons: 15.1, cpg: 3.72, total: 56.17,  odometer: 67000, full: true  },
  { id: 13, vehicleId: 4, date: '2026-02-12', gallons: 16.2, cpg: 3.66, total: 59.29,  odometer: 66700, full: true  },
  { id: 14, vehicleId: 4, date: '2026-01-18', gallons: 15.9, cpg: 3.58, total: 56.92,  odometer: 66400, full: false },

  // Vehicle 5 — Ford Transit 250
  { id: 15, vehicleId: 5, date: '2026-03-18', gallons: 25.3, cpg: 3.79, total: 95.89,  odometer: 14400, full: true  },
  { id: 16, vehicleId: 5, date: '2026-02-28', gallons: 24.8, cpg: 3.72, total: 92.26,  odometer: 14100, full: true  },
  { id: 17, vehicleId: 5, date: '2026-01-30', gallons: 26.1, cpg: 3.65, total: 95.27,  odometer: 13800, full: true  },

  // Vehicle 7 — Nissan Frontier
  { id: 18, vehicleId: 7, date: '2026-03-22', gallons: 14.9, cpg: 3.85, total: 57.37,  odometer: 29700, full: true  },
  { id: 19, vehicleId: 7, date: '2026-03-05', gallons: 13.8, cpg: 3.78, total: 52.16,  odometer: 29450, full: true  },
  { id: 20, vehicleId: 7, date: '2026-02-10', gallons: 14.4, cpg: 3.70, total: 53.28,  odometer: 29200, full: false },

  // Vehicle 8 — Mercedes Sprinter
  { id: 21, vehicleId: 8, date: '2026-03-15', gallons: 28.6, cpg: 4.15, total: 118.69, odometer: 41100, full: true  },
  { id: 22, vehicleId: 8, date: '2026-02-25', gallons: 27.9, cpg: 4.10, total: 114.39, odometer: 40800, full: true  },

  // Vehicle 9 — Toyota Tundra
  { id: 23, vehicleId: 9, date: '2026-03-30', gallons: 21.5, cpg: 3.78, total: 81.27,  odometer: 55500, full: true  },
  { id: 24, vehicleId: 9, date: '2026-03-12', gallons: 20.8, cpg: 3.72, total: 77.38,  odometer: 55200, full: true  },
  { id: 25, vehicleId: 9, date: '2026-02-20', gallons: 22.0, cpg: 3.65, total: 80.30,  odometer: 54900, full: true  },

  // Vehicle 10 — Chevrolet Express
  { id: 26, vehicleId: 10, date: '2026-03-27', gallons: 24.8, cpg: 3.80, total: 94.24, odometer: 8800,  full: true  },
  { id: 27, vehicleId: 10, date: '2026-03-08', gallons: 23.5, cpg: 3.74, total: 87.89, odometer: 8500,  full: true  },
  { id: 28, vehicleId: 10, date: '2026-02-15', gallons: 24.2, cpg: 3.68, total: 89.06, odometer: 8200,  full: true  },
];

import type { MaintenanceEntry } from '../types';

export const maintenanceEntries: MaintenanceEntry[] = [
  { id: 1,  vehicleId: 1,  date: '2026-01-15', type: 'Oil Change',       mileage: 33000, cost: 89.99,   tech: 'Mike R.',  notes: 'Full synthetic 5W-30'              },
  { id: 2,  vehicleId: 2,  date: '2026-02-03', type: 'Tire Rotation',    mileage: 50500, cost: 45.00,   tech: 'Sarah L.', notes: ''                                  },
  { id: 3,  vehicleId: 3,  date: '2026-03-10', type: 'Brake Service',    mileage: 22000, cost: 420.00,  tech: 'Mike R.',  notes: 'Replaced front pads & rotors'      },
  { id: 4,  vehicleId: 4,  date: '2025-12-20', type: 'Oil Change',       mileage: 66000, cost: 79.99,   tech: 'Tony B.',  notes: ''                                  },
  { id: 5,  vehicleId: 5,  date: '2026-02-28', type: 'Air Filter',       mileage: 13000, cost: 35.00,   tech: 'Sarah L.', notes: ''                                  },
  { id: 6,  vehicleId: 8,  date: '2026-03-22', type: 'Transmission Svc', mileage: 40000, cost: 1250.00, tech: 'Tony B.',  notes: 'Fluid flush and filter replacement' },
  { id: 7,  vehicleId: 6,  date: '2026-01-05', type: 'Engine Repair',    mileage: 97500, cost: 3200.00, tech: 'Mike R.',  notes: 'Head gasket replacement'           },
  { id: 8,  vehicleId: 9,  date: '2026-03-01', type: 'Tire Rotation',    mileage: 54000, cost: 45.00,   tech: 'Sarah L.', notes: ''                                  },
  { id: 9,  vehicleId: 7,  date: '2026-02-14', type: 'Oil Change',       mileage: 28500, cost: 79.99,   tech: 'Tony B.',  notes: ''                                  },
  { id: 10, vehicleId: 10, date: '2026-03-15', type: '30K Service',      mileage: 8000,  cost: 320.00,  tech: 'Mike R.',  notes: 'Full scheduled service'            },
];

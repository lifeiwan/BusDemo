import type { MaintenanceEntry } from '../types';

export const maintenanceEntries: MaintenanceEntry[] = [
  // Vehicle 1 — 2021 Ford F-150
  { id: 1,  vehicleId: 1, date: '2026-01-15', type: 'Oil Change',         mileage: 33000, cost: 89.99,   tech: 'Mike R.',  notes: 'Full synthetic 5W-30' },
  { id: 2,  vehicleId: 1, date: '2025-10-02', type: 'Tire Rotation',      mileage: 30000, cost: 45.00,   tech: 'Sarah L.', notes: '' },
  { id: 3,  vehicleId: 1, date: '2025-07-20', type: 'Air Filter',         mileage: 27500, cost: 32.00,   tech: 'Tony B.',  notes: '' },
  { id: 4,  vehicleId: 1, date: '2026-03-05', type: 'Brake Service',      mileage: 33800, cost: 310.00,  tech: 'Mike R.',  notes: 'Rear pads replaced' },

  // Vehicle 2 — 2020 Chevrolet Silverado
  { id: 5,  vehicleId: 2, date: '2026-02-03', type: 'Tire Rotation',      mileage: 50500, cost: 45.00,   tech: 'Sarah L.', notes: '' },
  { id: 6,  vehicleId: 2, date: '2025-11-14', type: 'Oil Change',         mileage: 48000, cost: 79.99,   tech: 'Tony B.',  notes: '' },
  { id: 7,  vehicleId: 2, date: '2025-08-30', type: 'Battery Replacement',mileage: 45200, cost: 189.00,  tech: 'Mike R.',  notes: 'OEM replacement' },
  { id: 8,  vehicleId: 2, date: '2026-03-28', type: 'Oil Change',         mileage: 51700, cost: 79.99,   tech: 'Sarah L.', notes: '' },

  // Vehicle 3 — 2022 RAM 1500 (in maintenance)
  { id: 9,  vehicleId: 3, date: '2026-03-10', type: 'Brake Service',      mileage: 22000, cost: 420.00,  tech: 'Mike R.',  notes: 'Replaced front pads & rotors' },
  { id: 10, vehicleId: 3, date: '2025-12-05', type: 'Oil Change',         mileage: 19500, cost: 89.99,   tech: 'Tony B.',  notes: 'Full synthetic' },
  { id: 11, vehicleId: 3, date: '2026-02-18', type: 'Suspension Check',   mileage: 21000, cost: 150.00,  tech: 'Mike R.',  notes: 'Found worn front struts — flagged for repair' },
  { id: 12, vehicleId: 3, date: '2025-09-15', type: 'Tire Rotation',      mileage: 17000, cost: 45.00,   tech: 'Sarah L.', notes: '' },

  // Vehicle 4 — 2019 Toyota Tacoma
  { id: 13, vehicleId: 4, date: '2025-12-20', type: 'Oil Change',         mileage: 66000, cost: 79.99,   tech: 'Tony B.',  notes: '' },
  { id: 14, vehicleId: 4, date: '2025-09-08', type: '60K Service',        mileage: 60000, cost: 680.00,  tech: 'Mike R.',  notes: 'Full 60k scheduled service' },
  { id: 15, vehicleId: 4, date: '2026-02-10', type: 'Tire Rotation',      mileage: 65500, cost: 45.00,   tech: 'Sarah L.', notes: '' },

  // Vehicle 5 — 2023 Ford Transit 250
  { id: 16, vehicleId: 5, date: '2026-02-28', type: 'Air Filter',         mileage: 13000, cost: 35.00,   tech: 'Sarah L.', notes: '' },
  { id: 17, vehicleId: 5, date: '2025-11-20', type: 'Oil Change',         mileage: 10500, cost: 89.99,   tech: 'Tony B.',  notes: 'Full synthetic' },
  { id: 18, vehicleId: 5, date: '2026-03-18', type: 'Tire Rotation',      mileage: 14200, cost: 45.00,   tech: 'Mike R.',  notes: '' },

  // Vehicle 6 — 2018 GMC Sierra 2500HD (out of service)
  { id: 19, vehicleId: 6, date: '2026-01-05', type: 'Engine Repair',      mileage: 97500, cost: 3200.00, tech: 'Mike R.',  notes: 'Head gasket replacement' },
  { id: 20, vehicleId: 6, date: '2025-10-30', type: 'Oil Change',         mileage: 96000, cost: 89.99,   tech: 'Tony B.',  notes: '' },
  { id: 21, vehicleId: 6, date: '2025-08-12', type: '90K Service',        mileage: 90000, cost: 850.00,  tech: 'Mike R.',  notes: 'Full 90k scheduled service' },

  // Vehicle 7 — 2021 Nissan Frontier
  { id: 22, vehicleId: 7, date: '2026-02-14', type: 'Oil Change',         mileage: 28500, cost: 79.99,   tech: 'Tony B.',  notes: '' },
  { id: 23, vehicleId: 7, date: '2025-11-01', type: 'Tire Rotation',      mileage: 26000, cost: 45.00,   tech: 'Sarah L.', notes: '' },
  { id: 24, vehicleId: 7, date: '2026-03-20', type: 'Brake Service',      mileage: 29500, cost: 280.00,  tech: 'Mike R.',  notes: 'Front brakes' },

  // Vehicle 8 — 2022 Mercedes Sprinter 2500 (in maintenance)
  { id: 25, vehicleId: 8, date: '2026-03-22', type: 'Transmission Svc',   mileage: 40000, cost: 1250.00, tech: 'Tony B.',  notes: 'Fluid flush and filter replacement' },
  { id: 26, vehicleId: 8, date: '2025-12-10', type: 'Oil Change',         mileage: 37500, cost: 109.99,  tech: 'Mike R.',  notes: 'Synthetic diesel blend' },
  { id: 27, vehicleId: 8, date: '2026-01-25', type: 'Air Filter',         mileage: 39000, cost: 55.00,   tech: 'Sarah L.', notes: 'Cabin + engine filters' },

  // Vehicle 9 — 2020 Toyota Tundra
  { id: 28, vehicleId: 9, date: '2026-03-01', type: 'Tire Rotation',      mileage: 54000, cost: 45.00,   tech: 'Sarah L.', notes: '' },
  { id: 29, vehicleId: 9, date: '2025-12-18', type: 'Oil Change',         mileage: 52500, cost: 89.99,   tech: 'Tony B.',  notes: '' },
  { id: 30, vehicleId: 9, date: '2025-10-05', type: '50K Service',        mileage: 50000, cost: 520.00,  tech: 'Mike R.',  notes: '50k milestone service' },

  // Vehicle 10 — 2023 Chevrolet Express 2500
  { id: 31, vehicleId: 10, date: '2026-03-15', type: '30K Service',       mileage: 8000,  cost: 320.00,  tech: 'Mike R.',  notes: 'Full scheduled service' },
  { id: 32, vehicleId: 10, date: '2025-12-01', type: 'Oil Change',        mileage: 5500,  cost: 89.99,   tech: 'Sarah L.', notes: '' },
  { id: 33, vehicleId: 10, date: '2026-02-20', type: 'Tire Rotation',     mileage: 7200,  cost: 45.00,   tech: 'Tony B.',  notes: '' },
];

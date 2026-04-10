import type { ParkingEntry } from '../types';

export const parkingEntries: ParkingEntry[] = [
  { id: 1, vehicleId: 1,  type: 'monthly',  cost: 250, startDate: '2026-01-01', date: null,         location: 'Downtown Garage A',    jobId: null, notes: '' },
  { id: 2, vehicleId: 2,  type: 'monthly',  cost: 250, startDate: '2026-01-01', date: null,         location: 'Downtown Garage A',    jobId: null, notes: '' },
  { id: 3, vehicleId: 5,  type: 'monthly',  cost: 180, startDate: '2026-01-01', date: null,         location: 'Warehouse Lot B',      jobId: null, notes: '' },
  { id: 4, vehicleId: 9,  type: 'monthly',  cost: 180, startDate: '2026-02-01', date: null,         location: 'Warehouse Lot B',      jobId: null, notes: '' },
  { id: 5, vehicleId: 8,  type: 'one_time', cost: 45,  startDate: null,         date: '2026-03-15', location: 'Convention Center Lot', jobId: 6,    notes: 'All-day parking for corporate move' },
  { id: 6, vehicleId: 4,  type: 'one_time', cost: 60,  startDate: null,         date: '2026-03-22', location: 'Event Venue Lot',       jobId: 7,    notes: 'Evening event parking' },
  { id: 7, vehicleId: 9,  type: 'one_time', cost: 20,  startDate: null,         date: '2026-03-28', location: 'Industrial Park',       jobId: 8,    notes: '' },
  { id: 8, vehicleId: 10, type: 'one_time', cost: 35,  startDate: null,         date: '2026-03-10', location: 'Construction Site',     jobId: 9,    notes: 'Site parking fee' },
];

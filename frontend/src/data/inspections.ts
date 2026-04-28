import type { Inspection } from '../types';

export const inspections: Inspection[] = [
  // Vehicle 1 — Ford F-150
  {
    id: 1, vehicleId: 1, date: '2026-03-31', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },
  {
    id: 2, vehicleId: 1, date: '2026-02-28', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },
  {
    id: 3, vehicleId: 1, date: '2026-01-31', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'fail', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: false, notes: 'Left front turn signal bulb out — replaced same day',
  },

  // Vehicle 2 — Chevrolet Silverado
  {
    id: 4, vehicleId: 2, date: '2026-03-28', driverName: 'Dana W.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },
  {
    id: 5, vehicleId: 2, date: '2026-02-27', driverName: 'Dana W.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 3 — RAM 1500 (in maintenance)
  {
    id: 6, vehicleId: 3, date: '2026-03-30', driverName: 'Karen M.',
    results: { 'Tires & Pressure': 'fail', 'Exterior Lights': 'pass', 'Brakes': 'fail', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: false, notes: 'Front left tire low, brake noise on stop',
  },
  {
    id: 7, vehicleId: 3, date: '2026-02-28', driverName: 'Karen M.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 4 — Toyota Tacoma
  {
    id: 8, vehicleId: 4, date: '2026-03-25', driverName: 'Tony B.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 5 — Ford Transit 250
  {
    id: 9, vehicleId: 5, date: '2026-03-29', driverName: 'Luis R.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'fail', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: false, notes: 'Driver side wiper streaking',
  },
  {
    id: 10, vehicleId: 5, date: '2026-02-28', driverName: 'Luis R.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 7 — Nissan Frontier
  {
    id: 11, vehicleId: 7, date: '2026-03-30', driverName: 'Sarah L.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 8 — Mercedes Sprinter
  {
    id: 12, vehicleId: 8, date: '2026-03-20', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'fail', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: false, notes: 'Low coolant — topped up before departure',
  },

  // Vehicle 9 — Toyota Tundra
  {
    id: 13, vehicleId: 9, date: '2026-03-27', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'fail', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: false, notes: 'Rear left tail light out',
  },
  {
    id: 14, vehicleId: 9, date: '2026-02-27', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },

  // Vehicle 10 — Chevrolet Express
  {
    id: 15, vehicleId: 10, date: '2026-03-28', driverName: 'Dana W.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    passed: true, notes: '',
  },
];

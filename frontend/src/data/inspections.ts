import type { Inspection } from '../types';

export const inspections: Inspection[] = [
  {
    id: 1, vehicleId: 1, date: '2026-03-31', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    pass: true, notes: '',
  },
  {
    id: 2, vehicleId: 3, date: '2026-03-30', driverName: 'Karen M.',
    results: { 'Tires & Pressure': 'fail', 'Exterior Lights': 'pass', 'Brakes': 'fail', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    pass: false, notes: 'Front left tire low, brake noise on stop',
  },
  {
    id: 3, vehicleId: 5, date: '2026-03-29', driverName: 'Luis R.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'fail', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    pass: false, notes: 'Driver side wiper streaking',
  },
  {
    id: 4, vehicleId: 2, date: '2026-03-28', driverName: 'Dana W.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'pass', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    pass: true, notes: '',
  },
  {
    id: 5, vehicleId: 9, date: '2026-03-27', driverName: 'James T.',
    results: { 'Tires & Pressure': 'pass', 'Exterior Lights': 'fail', 'Brakes': 'pass', 'Fluid Levels': 'pass', 'Windshield & Wipers': 'pass', 'Mirrors': 'pass', 'Horn': 'pass', 'Seatbelts': 'pass' },
    pass: false, notes: 'Rear left tail light out',
  },
];

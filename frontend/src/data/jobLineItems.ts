import type { JobLineItem } from '../types';

export const jobLineItems: JobLineItem[] = [
  { id: 1, jobId: 6, date: '2026-03-15', category: 'toll',        direction: 'cost',   amount: 12.50, notes: 'Bridge toll'       },
  { id: 2, jobId: 7, date: '2026-03-22', category: 'misc_income', direction: 'income', amount: 50.00, notes: 'Gratuity from client' },
  { id: 3, jobId: 8, date: '2026-03-28', category: 'toll',        direction: 'cost',   amount: 8.00,  notes: 'Highway toll'      },
  { id: 4, jobId: 9, date: '2026-03-10', category: 'misc_cost',   direction: 'cost',   amount: 75.00, notes: 'Equipment rental'  },
];

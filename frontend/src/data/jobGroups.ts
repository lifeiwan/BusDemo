import type { JobGroup } from '../types';

export const jobGroups: JobGroup[] = [
  { id: 1, name: 'Shuttle Routes',     type: 'route',    description: 'Recurring daily/weekly shuttle contracts' },
  { id: 2, name: 'Delivery Contracts', type: 'route',    description: 'Recurring delivery and transport routes'  },
  { id: 3, name: 'Corporate One-Time', type: 'one_time', description: 'Ad-hoc corporate moves and events'        },
  { id: 4, name: 'Emergency & Special',type: 'one_time', description: 'Unscheduled urgent jobs'                  },
];

import type { JobGroup } from '../types';

export const jobGroups: JobGroup[] = [
  { id: 1, name: 'NYC to Boston',     type: 'route',    description: 'Recurring daily/weekly shuttle contracts' },
  { id: 2, name: 'Flushing to JFK', type: 'route',    description: 'Recurring delivery and transport routes'  },
  { id: 3, name: 'Long Island Tour', type: 'one_time', description: 'Ad-hoc corporate moves and events'        },
  { id: 4, name: 'Easter Parade',type: 'one_time', description: 'Unscheduled urgent jobs'                  },
];

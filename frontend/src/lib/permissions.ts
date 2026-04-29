export type AppRole = 'admin' | 'investor' | 'manager' | 'staff';
export type Section = 'dashboard' | 'ops' | 'master' | 'profit' | 'reports' | 'admin';

const VIEW_MAP: Record<AppRole, Section[]> = {
  admin:    ['dashboard', 'ops', 'master', 'profit', 'reports', 'admin'],
  investor: ['dashboard', 'ops', 'master', 'profit', 'reports'],
  manager:  ['dashboard', 'ops', 'master', 'profit', 'reports'],
  staff:    ['dashboard', 'ops', 'master'],
};

const EDIT_MAP: Record<AppRole, Section[]> = {
  admin:    ['dashboard', 'ops', 'master', 'profit', 'reports', 'admin'],
  investor: [],
  manager:  ['dashboard', 'ops', 'master', 'profit', 'reports'],
  staff:    ['ops', 'master'],
};

export function canViewSection(role: AppRole | null, section: Section): boolean {
  if (!role) return false;
  return VIEW_MAP[role].includes(section);
}

export function canEdit(role: AppRole | null, section: Section): boolean {
  if (!role) return false;
  return EDIT_MAP[role].includes(section);
}

export const APP_ROLES = ['admin', 'investor', 'manager', 'staff'] as const;

export function isAppRole(v: unknown): v is AppRole {
  return APP_ROLES.includes(v as AppRole);
}

import type { CompanyRole } from './types';

export const COMPANY_MEMBER_ROLES: Array<{ value: CompanyRole; label: string }> = [
  { value: 'dentist', label: 'Dentist' },
  { value: 'nurse', label: 'Nurse' },  
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
];


export const COMPANY_ROLE_BADGE_CLASSES: Record<string, string> = {
  manager:
    'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300',

  // Legacy database value for Manager
  reception:
    'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300',

  admin:
    'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-300',

  nurse:
    'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-400/30 dark:bg-pink-500/15 dark:text-pink-300',

  dentist:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export const getCompanyRoleBadgeClass = (role: string) =>
  COMPANY_ROLE_BADGE_CLASSES[role] ??
  'border-slate-300 bg-slate-50 text-slate-700';
import type { CompanyRole } from './types';

export const COMPANY_MEMBER_ROLES: Array<{ value: CompanyRole; label: string }> = [
  { value: 'dentist', label: 'Dentist' },
  { value: 'nurse', label: 'Nurse' },  
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
];

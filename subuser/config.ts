import type { CompanyRole } from './types';

// Temporary choices. Change this list when company roles are finalized.
export const COMPANY_MEMBER_ROLES: Array<{ value: CompanyRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'reception', label: 'Reception' },
];

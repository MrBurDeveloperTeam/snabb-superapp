import type { CompanyRole } from './types';

export const COMPANY_MEMBER_ROLES: Array<{ value: CompanyRole; label: string }> = [
  // The 'admin' role is labeled as 'Manager' for clarity in the UI. 
  // if anything needs to be changed for manager role, the value should still be 'admin' to match the backend.
  { value: 'admin', label: 'Manager' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'reception', label: 'Reception' },
];

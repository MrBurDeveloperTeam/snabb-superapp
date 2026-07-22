export interface AuthFormInputs {
  account_type: 'individual' | 'company';

  login: string;
  fullName: string;

  companyName?: string;
  companyEmail?: string;

  position: string;
  phone: string;
  jobPosition: string;
  customJobPosition?: string;
  country: string;

  dob?: string;

  password: string;
  confirmPassword: string;
  rememberMe?: boolean;

  agreedToTerms: boolean;

  // Populated from the ?invite= query param on the signup page, if present.
  // Passed straight through to Odoo so the new account can be linked back
  // to whoever's invite link was used and tagged Student.
  inviteCode?: string;
}

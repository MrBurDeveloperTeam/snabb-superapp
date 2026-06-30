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
}

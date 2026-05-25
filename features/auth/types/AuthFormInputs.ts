export interface AuthFormInputs {
  accountType: 'individual' | 'company';

  login: string;
  fullName: string;

  companyName?: string;
  companyEmail?: string;

  phone: string;
  jobPosition: string;
  customJobPosition?: string;
  country: string;

  dob?: string;

  password: string;
  confirmPassword: string;

  agreedToTerms: boolean;
}
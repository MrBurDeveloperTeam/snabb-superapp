export interface SignupFormInputs {
  fullName: string;
  login: string;
  jobPosition: string;
  customJobPosition?: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}
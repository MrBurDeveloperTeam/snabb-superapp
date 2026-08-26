export interface AuthFormInputs {
  account_type: 'individual' | 'company' | 'company_member';

  login: string;
  fullName: string;

  // Optional nickname shown instead of fullName once logged in (also
  // editable later on the Profile Settings page).
  preferredName?: string;

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

  // Comma-separated tags received from the invitation URL.
  // Passed to the signup API together with inviteCode.
  tags?: string;

  // Referral code, referring doctor's email, or account ID. Populated from
  // the ?referral= query param on the signup page (referral link), or typed
  // in manually by the new user. Passed to Odoo as referral_code so the
  // referring doctor's account can be linked and awarded Snabbb Credit.
  // Distinct from inviteCode above, which is unrelated (Student tagging).
  referralCode?: string;
}

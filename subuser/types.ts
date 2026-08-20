export type CompanyRole = 'admin' | 'dentist' | 'nurse' | 'reception';

export type MemberRow = {
  id: string;
  member_user_id: string;
  role: string;
  status: string;
  joined_at: string;
  name: string;
  email: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export type InvitationDetails = {
  email: string;
  role: string;
  companyName: string;
  expiresAt: string;
};

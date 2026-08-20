import { supabase } from '@/services/supabaseClient';
import type { CompanyRole, InvitationDetails, InvitationRow, MemberRow } from '../types';

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('company-invitations', { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'The request could not be completed.');
  return data as T;
};

export const getCompanyPeople = () =>
  invoke<{ ok: true; members: MemberRow[]; invitations: InvitationRow[] }>({ action: 'list' });

export const sendCompanyInvitation = (email: string, role: CompanyRole) =>
  invoke<{ ok: true; inviteUrl: string; companyName: string }>({ action: 'create', email, role });

export const getCompanyInvitation = (token: string) =>
  invoke<{ ok: true; invitation: InvitationDetails }>({ action: 'get', token });

export const acceptCompanyInvitation = (token: string) =>
  invoke<{ ok: true }>({ action: 'accept', token });

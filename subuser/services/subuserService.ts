import { supabase } from '@/services/supabaseClient';
import type { CompanyRole, InvitationDetails, InvitationRow, MemberRow } from '../types';
import api from '@/services/api';

// const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
//   const { data, error } = await supabase.functions.invoke('company-invitations', { body });
//   if (error) throw error;
//   if (!data?.ok) throw new Error(data?.message || 'The request could not be completed.');
//   return data as T;
// };

// export const getCompanyPeople = () =>
//   invoke<{ ok: true; members: MemberRow[]; invitations: InvitationRow[] }>({ action: 'list' });

export const sendCompanyInvitations = async <T>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
  const res = await api.post('/company-invitations', { action, ...params });
  const data = await res.data;
  if (!data?.ok) throw new Error(data?.message || 'The request could not be completed.');
  return data as T;
};


// export const getCompanyInvitation = (token: string) =>
//   invoke<{ ok: true; invitation: InvitationDetails }>({ action: 'get', token });

// export const acceptCompanyInvitation = (token: string) =>
//   invoke<{ ok: true }>({ action: 'accept', token });

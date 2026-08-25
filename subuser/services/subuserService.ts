// import { supabase } from '@/services/supabaseClient';
// import type { CompanyRole, InvitationDetails, InvitationRow, MemberRow } from '../types';
// import api from '@/services/api';

// // const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
// //   const { data, error } = await supabase.functions.invoke('company-invitations', { body });
// //   if (error) throw error;
// //   if (!data?.ok) throw new Error(data?.message || 'The request could not be completed.');
// //   return data as T;
// // };

// // export const getCompanyPeople = () =>
// //   invoke<{ ok: true; members: MemberRow[]; invitations: InvitationRow[] }>({ action: 'list' });

// export const sendCompanyInvitations = async <T>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
//   const res = await api.post('/company-invitations', { action, ...params });
//   const data = await res.data;
//   if (!data?.ok) throw new Error(data?.message || 'The request could not be completed.');
//   return data as T;
// };


// export const getCompanyInvitation = (token: string) =>
//   invoke<{ ok: true; invitation: InvitationDetails }>({ action: 'get', token });

// export const acceptCompanyInvitation = (token: string) =>
//   invoke<{ ok: true }>({ action: 'accept', token });


import type {
  InvitationDetails,
  InvitationRow,
  MemberRow,
} from '../types';
import api from '@/services/api';

export const sendCompanyInvitations = async <T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> => {
  try {
    const response = await api.post(
      '/company-invitations',
      {
        action,
        ...params,
      }
    );

    const data = response.data;

    if (!data?.ok) {
      throw new Error(
        data?.message ||
          'The invitation request could not be completed.'
      );
    }

    return data as T;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'The invitation request could not be completed.';

    throw new Error(message);
  }
};

export const getCompanyInvitation = (token: string) =>
  sendCompanyInvitations<{
    ok: true;
    invitation: InvitationDetails;
  }>('get', { token });

export const acceptCompanyInvitation = (token: string) =>
  sendCompanyInvitations<{
    ok: true;
  }>('accept', { token });

export const getCompanyPeople = () =>
  sendCompanyInvitations<{
    ok: true;
    members: MemberRow[];
    invitations: InvitationRow[];
  }>('list');

export const updateCompanyMemberRole = (
  memberUserId: string,
  role: string
  ) =>
  sendCompanyInvitations<{
    ok: true;
    member: MemberRow;
  }>('update-role', {
    memberUserId,
    role,
});
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { COMPANY_MEMBER_ROLES } from '../config';
import { getCompanyPeople, sendCompanyInvitation } from '../services/subuserService';
import type { CompanyRole, InvitationRow, MemberRow } from '../types';

type Props = { isCompanyAccount: boolean; isCheckingAccountType: boolean };

export default function UserManagementPage({ isCompanyAccount, isCheckingAccountType }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>('admin');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadPeople = async () => {
    setLoading(true);
    try {
      const result = await getCompanyPeople();
      setMembers(result.members || []);
      setInvitations(result.invitations || []);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to load company members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCompanyAccount) loadPeople();
    else setLoading(false);
  }, [isCompanyAccount]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? members.filter((item) => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(query)) : members;
  }, [members, search]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const recipientEmail = email.trim();
      const result = await sendCompanyInvitation(recipientEmail, role);
      const subject = `Invitation to join ${result.companyName} on Snabbb`;
      const body = [
        `You have been invited to join ${result.companyName} on Snabbb as ${role}.`,
        '',
        'Accept the invitation and create your company member account:',
        result.inviteUrl,
        '',
        'This invitation expires in 7 days.',
      ].join('\n');

      window.location.href = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setEmail('');
      toast.success('Invitation created. Complete sending it from your email app.');
      await loadPeople();
    } catch (error: any) {
      toast.error(error?.message || 'Unable to send invitation.');
    } finally {
      setSending(false);
    }
  };

  if (isCheckingAccountType || loading) return <div className="min-h-[60vh] grid place-items-center text-sm font-semibold text-slate-500">Loading user management...</div>;
  if (!isCompanyAccount) return <div className="min-h-[60vh] grid place-items-center px-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black text-slate-900">Company access required</h1><p className="mt-3 text-sm text-slate-500">User Management is available only to company accounts.</p></div></div>;

  return (
    <div className="min-h-full bg-slate-100/80 py-10">
      <div className="mx-auto w-full max-w-7xl px-6">
        <h1 className="text-3xl font-black text-slate-900">User Management</h1>
        <p className="mt-2 text-slate-500">Manage your team members and control their access to mini apps</p>

        <div className="mt-8 inline-flex rounded-2xl bg-white p-1.5 shadow-sm">
          <button className="rounded-xl bg-tiffany-600 px-7 py-3 font-bold text-white"><i className="fa-solid fa-users mr-2" />Team Members</button>
          <button disabled className="px-7 py-3 font-semibold text-slate-500"><i className="fa-solid fa-shield-halved mr-2" />Access Control</button>
        </div>

        <form onSubmit={handleInvite} className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-black text-slate-900"><i className="fa-solid fa-user-plus mr-3 text-tiffany-600" />Invite a Team Member</h2>
          <p className="ml-8 mt-1 text-sm text-slate-400">An email invitation will be sent to join your company workspace.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-[1fr_210px_190px]">
            <div className="relative"><i className="fa-regular fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 outline-none focus:border-tiffany-500" /></div>
            <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold outline-none">{COMPANY_MEMBER_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <button disabled={sending} className="rounded-2xl bg-tiffany-600 px-6 py-4 font-bold text-white disabled:opacity-50"><i className="fa-regular fa-paper-plane mr-2" />{sending ? 'Sending...' : 'Send Invite'}</button>
          </div>
        </form>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black">Members</h2><p className="text-sm text-slate-400">{members.length + invitations.length} total · {invitations.length} pending</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></div>
          <div className="border-y bg-slate-50 px-7 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Active</div>
          {filteredMembers.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">No active members yet.</p>}
          {filteredMembers.map((member) => <div key={member.id} className="flex items-center justify-between border-b px-7 py-5"><div><p className="font-bold text-slate-900">{member.name || 'Company member'}</p><p className="text-sm text-slate-400">{member.email}</p></div><span className="rounded-full bg-violet-50 px-4 py-1 text-sm font-semibold capitalize text-violet-700">{member.role}</span></div>)}
          <div className="border-y bg-slate-50 px-7 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Pending invites</div>
          {invitations.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">No pending invitations.</p>}
          {invitations.map((invite) => <div key={invite.id} className="flex items-center justify-between border-b px-7 py-5"><div><p className="font-bold text-slate-900">{invite.email} <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600">Pending</span></p><p className="text-sm text-slate-400">Expires {new Date(invite.expires_at).toLocaleDateString()}</p></div><span className="rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold capitalize text-emerald-700">{invite.role}</span></div>)}
        </section>
      </div>
    </div>
  );
}

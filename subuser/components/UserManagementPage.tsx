import React, { useEffect, useMemo, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { toast } from 'sonner';
import { COMPANY_MEMBER_ROLES } from '../config';
import type { CompanyRole, InvitationRow, MemberRow } from '../types';
import { getCompanyPeople, sendCompanyInvitations, updateCompanyMemberRole, removeCompanyMember } from '../services/subuserService';
import ExistingUserInviteModal from './ExistingUserInviteModal';

type Props = { isCompanyAccount: boolean; isCheckingAccountType: boolean };

export default function UserManagementPage({ isCompanyAccount, isCheckingAccountType }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>('admin');
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [existingUserModalOpen, setExistingUserModalOpen] = useState(false);

  const closeMemberMenu = () => {
    setMemberMenuAnchor(null);
    setSelectedMember(null);
  };

  const openMemberMenu = (event: React.MouseEvent<HTMLButtonElement>, member: MemberRow) => {
    setMemberMenuAnchor(event.currentTarget);
    setSelectedMember(member);
  };

  const getRoleLabel = (memberRole: string) =>
    COMPANY_MEMBER_ROLES.find((item) => item.value === memberRole)?.label || memberRole;

  const handleRoleChange = async (nextRole: CompanyRole) => {
    if (!selectedMember) return;

    const memberName =
      selectedMember.name ||
      selectedMember.email ||
      'Member';

    try {
      await updateCompanyMemberRole(
        selectedMember.member_user_id,
        nextRole
      );

      closeMemberMenu();
      await loadPeople();

      toast.success(
        `${memberName}'s role was changed to ${getRoleLabel(nextRole)}.`
      );
    } catch (error: any) {
      toast.error(
        error?.message || 'Unable to change member role.'
      );
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    const member = selectedMember;
    const memberName =
      member.name ||
      member.email ||
      'this member';

    const confirmed = window.confirm(
      `Remove ${memberName} from the company?\n\nThey will lose access to the company's appointments and dental charts.`
    );

    if (!confirmed) return;

    try {
      await removeCompanyMember(member.member_user_id);

      closeMemberMenu();
      await loadPeople();

      toast.success(`${memberName} was removed from the company.`);
    } catch (error: any) {
      toast.error(
        error?.message || 'Unable to remove company member.'
      );
    }
  };

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
      
      const result = await sendCompanyInvitations<{ ok: true; inviteUrl: string; companyName: string }>('create', { email, role });
      const subject = `Invitation to join ${result.companyName} on Snabbb`;
      const inviteUrl = result.inviteUrl.trim();
      const body = [
        `You have been invited to join ${result.companyName} on Snabbb as ${role}.`,
        '',
        'Accept the invitation and create your company member account using this link:',
        '',
        inviteUrl,
        '',
        'This invitation expires in 7 days.',
      ].join('\r\n');

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
    <div className="user-management-page min-h-full bg-slate-100/80 py-10 dark:bg-[#0b1120]">
      <div className="mx-auto w-full max-w-7xl px-6">
        <h1 className="text-3xl font-black text-slate-900">User Management</h1>
        <p className="mt-2 text-slate-500">Manage your team members and control their access to mini apps</p>

        <div className="mt-8 inline-flex rounded-2xl bg-white p-1.5 shadow-sm">
          <button type="button" className="rounded-xl bg-tiffany-600 px-7 py-3 font-bold text-white"><i className="fa-solid fa-users mr-2" />Team Members</button>
          <button type="button" disabled className="px-7 py-3 font-semibold text-slate-500"><i className="fa-solid fa-shield-halved mr-2" />Access Control</button>
        </div>

        <form noValidate onSubmit={handleInvite} className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-black text-slate-900"><i className="fa-solid fa-user-plus mr-3 text-tiffany-600" />Invite a Team Member</h2>
          <p className="ml-8 mt-1 text-sm text-slate-400">An email invitation will be sent to join your company workspace.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-[1fr_210px_190px]">
            <div className="relative"><i className="fa-regular fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 outline-none focus:border-tiffany-500" /></div>
            <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold outline-none">{COMPANY_MEMBER_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <button disabled={sending} className="rounded-2xl bg-tiffany-600 px-6 py-4 font-bold text-white disabled:opacity-50"><i className="fa-regular fa-paper-plane mr-2" />{sending ? 'Sending...' : 'Send Invite'}</button>
          </div>
          <div className="my-6 flex items-center gap-4 text-sm text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>or</span><span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={() => setExistingUserModalOpen(true)} className="w-full rounded-2xl border border-dashed border-tiffany-500 px-5 py-4 font-bold text-tiffany-700 transition hover:bg-tiffany-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500"><i className="fa-solid fa-user-plus mr-2" />Invite an existing Snabbb user</button>
        </form>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black">Members</h2><p className="text-sm text-slate-400">{members.length + invitations.length} total · {invitations.length} pending</p></div><div className="relative"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." aria-label="Search members" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 outline-none focus:border-tiffany-500 sm:w-72" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear member search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500">×</button>}</div></div>
          <div className="border-y border-slate-200 bg-slate-50 px-7 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Active</div>
          {filteredMembers.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">{search.trim() ? 'No members match your search.' : 'No active members yet.'}</p>}
          {filteredMembers.map((member) => (
            <div key={member.id} className="group flex items-center justify-between border-b border-slate-200 px-7 py-5 transition-colors hover:bg-[#f3f9fb] focus-within:bg-[#f3f9fb] dark:hover:bg-[#1e2a3c] dark:focus-within:bg-[#1e2a3c]">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{member.name || 'Company member'}</p>
                <p className="truncate text-sm text-slate-400">{member.email}</p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-violet-50 px-4 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{getRoleLabel(member.role)}</span>
                <button
                  type="button"
                  onClick={(event) => openMemberMenu(event, member)}
                  aria-label={`Actions for ${member.name || member.email || 'company member'}`}
                  aria-haspopup="menu"
                  aria-expanded={selectedMember?.id === member.id && Boolean(memberMenuAnchor)}
                  className={`grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 ${selectedMember?.id === member.id && memberMenuAnchor ? 'bg-slate-200 opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
                >
                  <MoreHorizIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))}
          <Menu
            anchorEl={memberMenuAnchor}
            open={Boolean(memberMenuAnchor)}
            onClose={closeMemberMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                className: 'member-actions-menu',
                sx: {
                  mt: 0.75,
                  minWidth: 230,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
                },
              },
              list: { 'aria-label': `Actions for ${selectedMember?.name || 'member'}`, sx: { py: 0.75 } },
            }}
          >
            <li className="px-4 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Change role</li>
            {COMPANY_MEMBER_ROLES.map((item) => (
              <MenuItem
                key={item.value}
                selected={selectedMember?.role === item.value}
                onClick={() => handleRoleChange(item.value)}
                sx={{ mx: 0.75, minHeight: 40, borderRadius: '10px', fontSize: 14, fontWeight: 650 }}
              >
                {item.label}
                {selectedMember?.role === item.value && <span className="ml-auto text-xs font-bold text-tiffany-600">Current</span>}
              </MenuItem>
            ))}
            <div className="my-1 border-t border-slate-200" />
            <MenuItem onClick={handleRemoveMember} sx={{ mx: 0.75, minHeight: 42, borderRadius: '10px', color: '#dc2626', fontSize: 14, fontWeight: 700 }}>
              <DeleteOutlineIcon sx={{ mr: 1.25, fontSize: 19 }} />
              Remove member
            </MenuItem>
          </Menu>
          <div className="border-y border-slate-200 bg-slate-50 px-7 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Pending invites</div>
          {invitations.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">No pending invitations.</p>}
          {invitations.map((invite) => <div key={invite.id} className="flex items-center justify-between border-b border-slate-200 px-7 py-5"><div><p className="font-bold text-slate-900">{invite.email} <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">Pending</span></p><p className="text-sm text-slate-400">Expires {new Date(invite.expires_at).toLocaleDateString()}</p></div><span className="rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold capitalize text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{getRoleLabel(invite.role)}</span></div>)}
        </section>
        <ExistingUserInviteModal
          open={existingUserModalOpen}
          onClose={() => setExistingUserModalOpen(false)}
          onAdded={async (profile) => {
            toast.success(`${profile.full_name || profile.name || profile.email} was added to your company.`);
            await loadPeople();
          }}
        />
      </div>
    </div>
  );
}

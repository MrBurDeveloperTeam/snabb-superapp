import React, { useEffect, useMemo, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { toast } from 'sonner';
import { COMPANY_MEMBER_ROLES, getCompanyRoleBadgeClass, } from '../config';
import type { CompanyRole, InvitationRow, MemberRow } from '../types';
import { getCompanyPeople, sendCompanyInvitations, updateCompanyMemberRole, removeCompanyMember } from '../services/subuserService';
import ExistingUserInviteModal from './ExistingUserInviteModal';
import AccessControlPanel from './AccessControlPanel';

type Props = { isCompanyAccount: boolean; isCheckingAccountType: boolean };

export default function UserManagementPage({ isCompanyAccount, isCheckingAccountType }: Props) {
  const [activeTab, setActiveTab] = useState<'members' | 'access'>('members');
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
    <div className="user-management-page min-h-full bg-slate-100/80 py-5 sm:py-10 dark:bg-[#0b1120]">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
        <h1 className="text-xl font-black text-slate-900 sm:text-3xl">User Management</h1>
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 sm:mt-2 sm:text-base">Manage your team members and control their access to mini apps</p>

        <div className="mt-5 flex w-full rounded-xl bg-white p-1 shadow-sm sm:mt-8 sm:w-auto sm:inline-flex sm:rounded-2xl sm:p-1.5 dark:bg-slate-900" role="tablist" aria-label="User management sections">
          <button type="button" role="tab" aria-selected={activeTab === 'members'} onClick={() => setActiveTab('members')} className={`min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:rounded-xl sm:px-7 sm:py-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 ${activeTab === 'members' ? 'bg-tiffany-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><i className="fa-solid fa-users mr-1.5 sm:mr-2" />Team Members</button>
          <button type="button" role="tab" aria-selected={activeTab === 'access'} onClick={() => setActiveTab('access')} className={`min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:rounded-xl sm:px-7 sm:py-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 ${activeTab === 'access' ? 'bg-tiffany-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><i className="fa-solid fa-shield-halved mr-1.5 sm:mr-2" />Access Control <span className="hidden text-xs opacity-75 sm:ml-2 sm:inline">(Preview)</span></button>
        </div>

        {activeTab === 'access' ? <AccessControlPanel /> : <>
        <form noValidate onSubmit={handleInvite} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:mt-8 sm:rounded-3xl sm:p-7">
          <h2 className="text-sm font-black text-slate-900 sm:text-lg"><i className="fa-solid fa-user-plus mr-2 text-tiffany-600 sm:mr-3" />Invite a Team Member</h2>
          <p className="ml-5 mt-1 text-xs leading-4 text-slate-400 sm:ml-8 sm:text-sm">An email invitation will be sent to join your company workspace.</p>
          <div className="mt-5 grid gap-3 sm:mt-7 sm:gap-4 md:grid-cols-[1fr_210px_190px]">
            <div className="relative"><i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 sm:left-5 sm:text-base" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-xs outline-none focus:border-tiffany-500 sm:rounded-2xl sm:py-4 sm:pl-12 sm:pr-4 sm:text-base" /></div>
            <select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold outline-none sm:w-full sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base">{COMPANY_MEMBER_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <button disabled={sending} className="rounded-xl bg-tiffany-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50 sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"><i className="fa-regular fa-paper-plane mr-2" />{sending ? 'Sending...' : 'Send Invite'}</button>
          </div>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400 sm:my-6 sm:gap-4 sm:text-sm"><span className="h-px flex-1 bg-slate-200" /><span>or</span><span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={() => setExistingUserModalOpen(true)} className="w-full rounded-xl border border-dashed border-tiffany-500 px-3 py-3 text-xs font-bold text-tiffany-700 transition hover:bg-tiffany-50 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500"><i className="fa-solid fa-user-plus mr-2" />Invite an existing Snabbb user</button>
        </form>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-8 sm:rounded-3xl">
          <div className="flex items-center justify-between gap-3 p-5 sm:p-7"><div className="shrink-0"><h2 className="text-sm font-black sm:text-lg">Members</h2><p className="text-[11px] leading-4 text-slate-400 sm:text-sm">{members.length + invitations.length} total · {invitations.length} pending</p></div><div className="relative min-w-0"><i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 sm:hidden" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." aria-label="Search members" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-7 text-[11px] outline-none focus:border-tiffany-500 sm:w-72 sm:rounded-xl sm:px-4 sm:py-3 sm:pr-10 sm:text-base" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear member search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1 py-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 sm:right-3 sm:px-1.5 sm:py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500">×</button>}</div></div>
          <div className="border-y border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:px-7 sm:py-4 sm:text-xs">Active</div>
          {filteredMembers.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">{search.trim() ? 'No members match your search.' : 'No active members yet.'}</p>}
          {filteredMembers.map((member) => (
            <div key={member.id} className="group flex items-center justify-between border-b border-slate-200 px-5 py-3 transition-colors hover:bg-[#f3f9fb] focus-within:bg-[#f3f9fb] sm:px-7 sm:py-5 dark:hover:bg-[#1e2a3c] dark:focus-within:bg-[#1e2a3c]">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 sm:text-base">{member.name || 'Company member'}</p>
                <p className="truncate text-[10px] text-slate-400 sm:text-sm">{member.email}</p>
              </div>
                <div className="ml-2 flex shrink-0 items-center gap-1.5 sm:ml-4 sm:gap-3">
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:px-4 sm:py-1 sm:text-sm ${getCompanyRoleBadgeClass(member.role)}`}
              >
                {getRoleLabel(member.role)}
              </span>
                <button
                  type="button"
                  onClick={(event) => openMemberMenu(event, member)}
                  aria-label={`Actions for ${member.name || member.email || 'company member'}`}
                  aria-haspopup="menu"
                  aria-expanded={selectedMember?.id === member.id && Boolean(memberMenuAnchor)}
                  className={`grid h-8 w-8 place-items-center rounded-full text-slate-400 opacity-100 transition hover:bg-slate-200 hover:text-slate-800 sm:h-10 sm:w-10 sm:text-slate-500 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 ${selectedMember?.id === member.id && memberMenuAnchor ? 'bg-slate-200' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'}`}
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
          <div className="border-y border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:px-7 sm:py-4 sm:text-xs">Pending invites</div>
          {invitations.length === 0 && <p className="px-7 py-6 text-sm text-slate-400">No pending invitations.</p>}
          {invitations.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 sm:px-7 sm:py-5"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900 sm:text-base">{invite.email} <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-600 sm:ml-2 sm:px-2 sm:py-1 sm:text-xs dark:bg-amber-500/15 dark:text-amber-300">Pending</span></p><p className="text-[10px] text-slate-400 sm:text-sm">Expires {new Date(invite.expires_at).toLocaleDateString()}</p></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:px-4 sm:py-1 sm:text-sm ${getCompanyRoleBadgeClass(invite.role)}`}>{getRoleLabel(invite.role)}</span></div>)}
        </section>
        <ExistingUserInviteModal
          open={existingUserModalOpen}
          onClose={() => setExistingUserModalOpen(false)}
          onAdded={async (profile) => {
            toast.success(`${profile.full_name || profile.name || profile.email} was added to your company.`);
            await loadPeople();
          }}
        />
        </>}
      </div>
    </div>
  );
}

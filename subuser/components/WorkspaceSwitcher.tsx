import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, UserRound } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

type CompanyWorkspace = { ownerUserId: string; name: string; role: string };
type Props = { userId: string };

const STORAGE_KEY = 'snabbb.activeWorkspaceOwnerUserId';

export default function WorkspaceSwitcher({ userId }: Props) {
  const [companies, setCompanies] = useState<CompanyWorkspace[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: memberships, error: membershipError } = await supabase
        .from('company_members')
        .select('company_owner_user_id,role')
        .eq('member_user_id', userId)
        .eq('status', 'active');

      if (membershipError) {
        console.warn('[Workspace] Unable to load memberships:', membershipError);
        return;
      }

      const ownerIds = Array.from(
        new Set((memberships || []).map((item) => item.company_owner_user_id).filter(Boolean))
      );

      if (ownerIds.length === 0) {
        if (!cancelled) {
          setCompanies([]);
          setSelectedOwnerId(null);
          localStorage.removeItem(STORAGE_KEY);
        }
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id,company_name,name,full_name')
        .in('user_id', ownerIds);

      if (profileError) {
        console.warn('[Workspace] Unable to load company profiles:', profileError);
        return;
      }

      const profilesById = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
      const nextCompanies = (memberships || []).map((membership) => {
        const profile = profilesById.get(membership.company_owner_user_id);
        return {
          ownerUserId: membership.company_owner_user_id,
          name: profile?.company_name || profile?.full_name || profile?.name || 'Company workspace',
          role: membership.role,
        };
      });

      if (!cancelled) {
        setCompanies(nextCompanies);
        if (selectedOwnerId && !nextCompanies.some((item) => item.ownerUserId === selectedOwnerId)) {
          setSelectedOwnerId(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    load();
    window.addEventListener('snabbb:memberships-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('snabbb:memberships-changed', load);
    };
  }, [selectedOwnerId, userId]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const activeCompany = useMemo(
    () => companies.find((company) => company.ownerUserId === selectedOwnerId),
    [companies, selectedOwnerId]
  );

  if (companies.length === 0) return null;

  const selectWorkspace = (ownerUserId: string | null) => {
    if (ownerUserId) localStorage.setItem(STORAGE_KEY, ownerUserId);
    else localStorage.removeItem(STORAGE_KEY);
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-tiffany-400 sm:max-w-[260px]" aria-haspopup="menu" aria-expanded={open}>
        {activeCompany ? <Building2 className="h-4 w-4 shrink-0 text-tiffany-600" /> : <UserRound className="h-4 w-4 shrink-0 text-slate-500" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">Workspace</span>
          <span className="block truncate text-xs font-black text-slate-800 sm:text-sm">{activeCompany?.name || 'Personal'}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
          <button type="button" onClick={() => selectWorkspace(null)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${!activeCompany ? 'bg-tiffany-50 text-tiffany-800' : 'hover:bg-slate-50'}`}>
            <UserRound className="h-5 w-5" />
            <div><p className="text-sm font-black">Personal</p><p className="text-xs text-slate-400">Private workspace</p></div>
          </button>
          {companies.map((company) => (
            <button key={company.ownerUserId} type="button" onClick={() => selectWorkspace(company.ownerUserId)} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${activeCompany?.ownerUserId === company.ownerUserId ? 'bg-tiffany-50 text-tiffany-800' : 'hover:bg-slate-50'}`}>
              <Building2 className="h-5 w-5" />
              <div className="min-w-0"><p className="truncate text-sm font-black">{company.name}</p><p className="text-xs capitalize text-slate-400">{company.role}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

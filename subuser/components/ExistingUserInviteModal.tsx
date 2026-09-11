import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, MenuItem, Select } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { COMPANY_MEMBER_ROLES } from '../config';
import { addExistingCompanyMember, searchIndividualProfiles } from '../services/subuserService';
import type { CompanyRole, IndividualProfileSearchResult } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded: (profile: IndividualProfileSearchResult) => Promise<void> | void;
};

export default function ExistingUserInviteModal({ open, onClose, onAdded }: Props) {
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IndividualProfileSearchResult[]>([]);
  const [selected, setSelected] = useState<IndividualProfileSearchResult | null>(null);
  const [role, setRole] = useState<CompanyRole | ''>('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      requestId.current += 1;
      setStep('search');
      setQuery('');
      setResults([]);
      setSelected(null);
      setRole('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || step !== 'search' || isComposing || trimmed.length < 2) {
      requestId.current += 1;
      setSearching(false);
      setResults([]);
      setError('');
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const response = await searchIndividualProfiles(trimmed);
        if (currentRequest === requestId.current) setResults(response.profiles);
      } catch (searchError: any) {
        if (currentRequest === requestId.current) {
          setResults([]);
          setError(searchError?.message || 'Unable to search Snabbb accounts.');
        }
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isComposing, open, query, step]);

  const clearSearch = () => {
    requestId.current += 1;
    setQuery('');
    setResults([]);
    setError('');
  };

  const confirmInvite = async () => {
    if (!selected || !role) return;
    setSubmitting(true);
    setError('');
    try {
      await addExistingCompanyMember(selected.user_id, role);
      await onAdded(selected);
      onClose();
    } catch (submitError: any) {
      setError(submitError?.message || 'Unable to add this user to your company.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = selected?.full_name || selected?.name || 'Snabbb user';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="existing-user-dialog-title"
      PaperProps={{
        className: 'existing-user-dialog',
        sx: {
          borderRadius: { xs: '18px', sm: '24px' },
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          '& .MuiTypography-root, & .MuiInputBase-root, & .MuiMenuItem-root, & button': {
            fontFamily: 'inherit',
          },
        },
      }}
    >
      <DialogTitle
        id="existing-user-dialog-title"
        className="flex items-center border-b border-slate-200 font-black text-slate-900"
        sx={{ px: { xs: 2, sm: 3.5 }, py: { xs: 1.5, sm: 2.5 }, gap: { xs: 1, sm: 1.5 }, fontSize: { xs: 14, sm: 18 }, fontWeight: 800 }}
      >
        <PersonAddAltOutlinedIcon className="shrink-0 text-tiffany-600" sx={{ fontSize: { xs: 19, sm: 24 } }} />
        <span className="min-w-0 leading-5">Invite an existing Snabbb user</span>
        <IconButton onClick={onClose} disabled={submitting} aria-label="Close invitation dialog" sx={{ ml: 'auto', p: { xs: 0.5, sm: 1 } }}><CloseIcon sx={{ fontSize: { xs: 19, sm: 24 } }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3.5 }, pb: { xs: 2, sm: 3.5 }, pt: { xs: 1.5, sm: 3 } }}>
        {step === 'search' ? (
          <>
            <p className="text-xs leading-4 text-slate-500 sm:text-sm sm:leading-normal">Search by name or email address to find an existing individual account.</p>
            <div className="relative mt-3 sm:mt-4">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4" sx={{ fontSize: { xs: 17, sm: 20 } }} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="e.g. sarah.lim@gmail.com or Sarah"
                aria-label="Search individual Snabbb accounts"
                aria-describedby={error ? 'existing-user-error' : undefined}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-xs text-slate-900 outline-none transition focus:border-tiffany-500 focus:ring-2 focus:ring-tiffany-500/20 sm:rounded-2xl sm:py-4 sm:pl-12 sm:pr-12 sm:text-base"
              />
              {query && <button type="button" onClick={clearSearch} aria-label="Clear account search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tiffany-500">×</button>}
            </div>

            <div className="mt-3 min-h-[90px] sm:mt-4 sm:min-h-[112px]" aria-live="polite" aria-busy={searching}>
              {query.trim().length < 2 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 sm:rounded-2xl sm:p-5 sm:text-sm sm:leading-6">Enter at least 2 characters. Only existing individual accounts can be found and added as company members.</div>}
              {searching && <div className="rounded-xl border border-slate-200 p-4 text-xs font-semibold text-slate-500 sm:rounded-2xl sm:p-5 sm:text-sm">Searching individual accounts…</div>}
              {!searching && query.trim().length >= 2 && !error && results.length === 0 && <div className="rounded-xl border border-slate-200 p-4 text-xs text-slate-500 sm:rounded-2xl sm:p-5 sm:text-sm">No eligible individual account matches this search.</div>}
              {!searching && results.map((profile) => {
                const name = profile.full_name || profile.name || 'Snabbb user';
                const avatar = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                return <div key={profile.user_id} className="mb-3 rounded-xl border border-tiffany-500/40 bg-tiffany-50/40 p-4 sm:rounded-2xl sm:p-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tiffany-600 text-xs font-black text-white sm:h-12 sm:w-12 sm:text-base">{avatar}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 sm:text-base">{name}</p><p className="truncate text-[11px] text-slate-500 sm:text-sm">{profile.email}</p></div></div>
                  <button type="button" onClick={() => { setSelected(profile); setStep('confirm'); setError(''); }} className="mt-3 w-full rounded-lg bg-tiffany-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-tiffany-700 sm:mt-4 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500">Invite to company</button>
                </div>;
              })}
            </div>
          </>
        ) : selected ? (
          <>
            <p className="text-xs leading-4 text-slate-500 sm:text-sm sm:leading-normal">Review the details before adding this user to your company.</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:mt-5 sm:rounded-2xl sm:p-5">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tiffany-600 text-xs font-black text-white sm:h-12 sm:w-12 sm:text-base">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900 sm:text-base">{displayName}</p><p className="truncate text-[11px] text-slate-500 sm:text-sm">{selected.email}</p></div></div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs sm:mt-5 sm:pt-4 sm:text-sm"><span className="text-slate-500">Account type</span><strong className="text-right text-slate-900">Individual → Company member</strong></div>
            </div>
            <label htmlFor="existing-user-role" className="mt-5 block text-xs font-black uppercase tracking-widest text-slate-500">Assign role</label>
            <Select
              id="existing-user-role"
              fullWidth
              displayEmpty
              value={role}
              onChange={(event) => setRole(event.target.value as CompanyRole | '')}
              renderValue={(selectedRole) => selectedRole
                ? COMPANY_MEMBER_ROLES.find((item) => item.value === selectedRole)?.label
                : <span className="font-normal text-slate-400">Select Role</span>}
              sx={{ mt: 1.25, borderRadius: { xs: '10px', sm: '14px' }, fontWeight: 700, fontSize: { xs: 12, sm: 16 }, '& .MuiSelect-select': { py: { xs: 1.25, sm: 2 } } }}
            >
              <MenuItem value="" disabled>Select Role</MenuItem>
              {COMPANY_MEMBER_ROLES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </Select>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
              <button type="button" onClick={() => { setStep('search'); setError(''); }} disabled={submitting} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 disabled:opacity-50">Back</button>
              <button type="button" onClick={confirmInvite} disabled={submitting || !role} className="rounded-lg bg-tiffany-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-tiffany-700 sm:rounded-xl sm:px-5 sm:py-3 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Adding…' : 'Confirm & add'}</button>
            </div>
          </>
        ) : null}
        {error && <p id="existing-user-error" role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

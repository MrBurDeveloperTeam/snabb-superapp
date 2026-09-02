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
  const [role, setRole] = useState<CompanyRole>('reception');
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
      setRole('reception');
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
    if (!selected) return;
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
      PaperProps={{ className: 'existing-user-dialog', sx: { borderRadius: '24px', overflow: 'hidden' } }}
    >
      <DialogTitle id="existing-user-dialog-title" className="flex items-center gap-3 border-b border-slate-200 px-7 py-5 text-lg font-black text-slate-900">
        <PersonAddAltOutlinedIcon className="text-tiffany-600" />
        Invite an existing Snabbb user
        <IconButton onClick={onClose} disabled={submitting} aria-label="Close invitation dialog" sx={{ ml: 'auto' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent className="px-7 pb-7 pt-6">
        {step === 'search' ? (
          <>
            <p className="text-sm text-slate-500">Search by name or email address to find an existing individual account.</p>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fontSize="small" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="e.g. sarah.lim@gmail.com or Sarah"
                aria-label="Search individual Snabbb accounts"
                aria-describedby={error ? 'existing-user-error' : undefined}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-slate-900 outline-none transition focus:border-tiffany-500 focus:ring-2 focus:ring-tiffany-500/20"
              />
              {query && <button type="button" onClick={clearSearch} aria-label="Clear account search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tiffany-500">×</button>}
            </div>

            <div className="mt-4 min-h-[112px]" aria-live="polite" aria-busy={searching}>
              {query.trim().length < 2 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">Enter at least 2 characters. Only existing individual accounts can be found and added as company members.</div>}
              {searching && <div className="rounded-2xl border border-slate-200 p-5 text-sm font-semibold text-slate-500">Searching individual accounts…</div>}
              {!searching && query.trim().length >= 2 && !error && results.length === 0 && <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">No eligible individual account matches this search.</div>}
              {!searching && results.map((profile) => {
                const name = profile.full_name || profile.name || 'Snabbb user';
                const avatar = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                return <div key={profile.user_id} className="mb-3 rounded-2xl border border-tiffany-500/40 bg-tiffany-50/40 p-5">
                  <div className="flex min-w-0 items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-tiffany-600 font-black text-white">{avatar}</span><div className="min-w-0"><p className="truncate font-black text-slate-900">{name}</p><p className="truncate text-sm text-slate-500">{profile.email}</p></div></div>
                  <button type="button" onClick={() => { setSelected(profile); setStep('confirm'); setError(''); }} className="mt-4 w-full rounded-xl bg-tiffany-600 px-5 py-3 font-bold text-white transition hover:bg-tiffany-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500">Invite to company</button>
                </div>;
              })}
            </div>
          </>
        ) : selected ? (
          <>
            <p className="text-sm text-slate-500">Review the details before adding this user to your company.</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex min-w-0 items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-tiffany-600 font-black text-white">{initials}</span><div className="min-w-0"><p className="truncate font-black text-slate-900">{displayName}</p><p className="truncate text-sm text-slate-500">{selected.email}</p></div></div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm"><span className="text-slate-500">Account type</span><strong className="text-right text-slate-900">Individual → Company member</strong></div>
            </div>
            <label htmlFor="existing-user-role" className="mt-5 block text-xs font-black uppercase tracking-widest text-slate-500">Assign role</label>
            <Select id="existing-user-role" fullWidth value={role} onChange={(event) => setRole(event.target.value as CompanyRole)} sx={{ mt: 1.25, borderRadius: '14px', fontWeight: 700 }}>
              {COMPANY_MEMBER_ROLES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </Select>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setStep('search'); setError(''); }} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 disabled:opacity-50">Back</button>
              <button type="button" onClick={confirmInvite} disabled={submitting} className="rounded-xl bg-tiffany-600 px-5 py-3 font-bold text-white hover:bg-tiffany-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiffany-500 disabled:opacity-50">{submitting ? 'Adding…' : 'Confirm & add'}</button>
            </div>
          </>
        ) : null}
        {error && <p id="existing-user-error" role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

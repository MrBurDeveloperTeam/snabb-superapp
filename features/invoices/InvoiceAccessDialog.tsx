import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { loginOdoo } from '@/services/LoginOdoo';
import { confirmPassword, resetPassword } from '@/services/resetPassword';
import type { InvoicePreview } from './invoiceApi';

type Step = 'choose' | 'activate' | 'login' | 'request' | 'sent';
const primary = 'rounded-xl bg-tiffany-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-tiffany-800 disabled:opacity-60';
const secondary = 'rounded-xl px-4 py-2.5 text-sm font-semibold text-tiffany-800 hover:bg-tiffany-50 dark:text-tiffany-300 dark:hover:bg-slate-800';
const field = 'mt-1 block w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 dark:border-slate-600';

export default function InvoiceAccessDialog({ invoice, token, purpose = 'invoice', onClose, onSignedIn, onConsumed }: {
  purpose?: 'invoice' | 'track';
  invoice: InvoicePreview | null;
  token: string | null;
  onClose: () => void;
  onSignedIn: () => Promise<void>;
  onConsumed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>(invoice ? 'choose' : 'login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);

  function changeStep(next: Step) {
    setPassword('');
    setConfirmation('');
    setError('');
    setStep(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !event.currentTarget.reportValidity()) return;
    if (step === 'activate' && password !== confirmation) {
      setError('Your passwords don’t match. Enter the same password in both fields.');
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirmation"]')?.focus();
      return;
    }
    setError('');
    submitting.current = true;
    setBusy(true);
    let saved = false;
    try {
      if (step === 'request') {
        await resetPassword(login.trim(), invoice?.can_activate ? invoice.id : undefined);
        changeStep('sent');
        return;
      }
      let username = login.trim();
      if (step === 'activate' && token && invoice) {
        const result = await confirmPassword(token, password, invoice.id);
        saved = true;
        onConsumed();
        username = result.login || '';
        setLogin(username);
        changeStep('login');
        if (!username) throw new Error('Sign in with your purchase email.');
      }
      const result = await loginOdoo(username, password);
      if (!(result?.data?.result?.uid || result?.result?.uid || result?.sessionInfo?.uid)) {
        throw new Error('Sign-in failed.');
      }
      await onSignedIn();
    } catch (err) {
      if (saved) setError('Your password was saved. Sign in with your new password to download the invoice.');
      else if (step === 'login') setError('We couldn’t sign you in. Check your email or username and password, then try again.');
      else setError(err instanceof Error ? err.message : 'Check your connection and try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const canActivate = invoice?.can_activate === true;
  const title = { choose: purpose === 'track' ? 'Track your parcel' : 'View your invoice', activate: 'Set a new password', login: 'Sign in',
    request: 'Request a new email', sent: 'Check your inbox' }[step];
  return <dialog ref={dialog} aria-labelledby="invoice-access-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <div className="flex items-start justify-between gap-4">
      <h2 ref={heading} tabIndex={-1} id="invoice-access-title" className="text-xl font-bold outline-none">{title}</h2>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
    </div>
    {step === 'choose' ? <>
      <p className="my-4 text-sm">{purpose === 'track' ? 'Sign in to track your parcel.' : canActivate ? 'Activate your account to see the full invoice.' : 'Sign in with your purchase account to download this invoice.'}</p>
      <div className="flex flex-wrap gap-2">
        {canActivate
          ? <button type="button" className={primary} onClick={() => changeStep(token ? 'activate' : 'request')}>Activate</button>
          : <button type="button" className={primary} onClick={() => changeStep('login')}>Sign in</button>}
      </div>
    </> : step === 'sent' ? <>
      <p role="status" className="my-4 text-sm">If your email matches an account, you’ll receive a link to set your password.</p>
      {canActivate
        ? <button type="button" className={secondary} onClick={onClose}>Close</button>
        : <button type="button" className={secondary} onClick={() => changeStep('login')}>Back to sign in</button>}
    </> : <form key={step} noValidate onSubmit={submit} className="mt-4 space-y-4">
      {step === 'request' && <p className="text-sm">Enter your purchase email to receive a fresh password link.</p>}
      {step !== 'activate' && <label className="block text-sm font-semibold">{step === 'request' ? 'Purchase email' : 'Email or username'}
        <input className={field} required autoComplete="username" type={step === 'request' ? 'email' : 'text'} value={login} onChange={e => setLogin(e.target.value)} />
      </label>}
      {step !== 'request' && <label className="block text-sm font-semibold">{step === 'activate' ? 'New password (at least 8 characters)' : 'Password'}
        <input className={field} type="password" required autoComplete={step === 'activate' ? 'new-password' : 'current-password'}
          minLength={step === 'activate' ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} />
      </label>}
      {step === 'activate' && <label className="block text-sm font-semibold">Confirm new password
        <input className={field} name="confirmation" type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </label>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={primary}>{busy ? 'Please wait…' : step === 'activate' ? 'Activate' : step === 'request' ? 'Send email' : 'Sign in'}</button>
        {step === 'login' && <button type="button" className={secondary} disabled={busy} onClick={() => changeStep('request')}>Forgot password?</button>}
        {step === 'activate' && error && <button type="button" className={secondary} disabled={busy} onClick={() => changeStep('request')}>Request a new email</button>}
      </div>
    </form>}
  </dialog>;
}

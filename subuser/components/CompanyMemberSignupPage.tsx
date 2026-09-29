import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authOdoo } from '@/services/authOdoo';
import { DENTAL_POSITIONS } from '@/constants/dentalPositions';
import { getCompanyInvitation } from '../services/subuserService';
import { rememberCompanyInvitation } from '../services/pendingCompanyInvitation';
import type { InvitationDetails } from '../types';
import { SnabbbIcon } from '@/public/icons/SnabbbIcon';
import { EmailVerificationToast } from '@/features/auth/components/EmailVerificationToast';

type Props = {
  onComplete: () => void;
  setToastMsg?: (
    msg: React.ReactNode,
    options: { type: 'success' | 'error'; hideIcon?: boolean }
  ) => void;
};

type ValidatedField = 'firstName' | 'lastName' | 'phone' | 'dob' | 'password' | 'confirmPassword';

const getLatestBirthDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const validateField = (name: ValidatedField, value: string) => {
  if (!value.trim()) {
    if (name === 'firstName') return 'First name is required.';
    if (name === 'lastName') return 'Last name is required.';
    if (name === 'phone') return 'Phone number is required.';
    if (name === 'password') return 'Password is required.';
    if (name === 'confirmPassword') return 'Please confirm your password.';
    return 'Date of birth is required.';
  }
  if ((name === 'firstName' || name === 'lastName') && /\p{N}/u.test(value)) {
    return `${name === 'firstName' ? 'First' : 'Last'} name cannot include numbers.`;
  }
  if (name === 'phone' && /\p{L}/u.test(value)) {
    return 'Phone number cannot include letters.';
  }
  if (name === 'dob' && value > getLatestBirthDate()) {
    return 'Date of birth must be before today.';
  }
  if ((name === 'password' || name === 'confirmPassword') && value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return '';
};

export default function CompanyMemberSignupPage({ onComplete, setToastMsg }: Props) {
  const queryToken =
    new URLSearchParams(window.location.search).get('token') || '';

  const pathToken =
    window.location.pathname.match(/^\/invite\/([^/]+)\/?$/)?.[1] || '';

  const token = decodeURIComponent(queryToken || pathToken).trim();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({firstName: '', lastName: '', phone: '', dob: '', jobPosition: '', country: '', password: '', confirmPassword: '', referralCode: '', agreed: false });
  const [touched, setTouched] = useState<Partial<Record<ValidatedField, boolean>>>({});

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setLoading(false);
      return;
    }

    getCompanyInvitation(token)
      .then((result) => {
        if (!cancelled) {
          setInvitation(result.invitation);
          setForm((current) => ({
            ...current,
            country: result.invitation.country,
          }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setInvitation(null);
          toast.error(
            error?.message ||
              'This invitation is invalid or expired.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value }));
    if (['firstName', 'lastName', 'phone', 'dob', 'password', 'confirmPassword'].includes(key)) {
      setTouched((current) => ({ ...current, [key]: true }));
    }
  };

  const validationErrors: Record<ValidatedField, string> = {
    firstName: validateField('firstName', form.firstName),
    lastName: validateField('lastName', form.lastName),
    phone: validateField('phone', form.phone),
    dob: validateField('dob', form.dob),
    password: validateField('password', form.password),
    confirmPassword: validateField('confirmPassword', form.confirmPassword)
      || (form.confirmPassword !== form.password ? 'Passwords do not match.' : ''),
  };

  const passwordStrength = (() => {
    if (!form.password) return 'empty';
    if (form.password.length < 8) return 'short';
    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
      .filter((pattern) => pattern.test(form.password)).length;
    return variety >= 3 ? 'strong' : 'fair';
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
    setTouched({ firstName: true, lastName: true, phone: true, dob: true, password: true, confirmPassword: true });
    if (Object.values(validationErrors).some(Boolean)) return;
    if (!invitation.country) {
      return toast.error(
        "The company owner's country could not be loaded. Please ask the company owner to check their Odoo profile."
      );
    }
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match.');
    setSubmitting(true);
    let accountWasCreated = false;

    try {
      const response = await authOdoo({
        account_type: 'individual',
        companyName: invitation.companyName,
        login: invitation.email,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone,
        dob: form.dob,
        jobPosition: form.jobPosition,
        position: form.jobPosition,
        country: form.country,
        password: form.password,
        confirmPassword: form.confirmPassword,
        agreedToTerms: form.agreed,
        referralCode: form.referralCode,
      });

      if (!response?.data?.result?.created) {
        throw new Error(
          'The account could not be created.'
        );
      }

      accountWasCreated = true;

      // The Worker accepts an invitation only for an authenticated user.
      // Keep the token until this newly created account has verified its
      // email and successfully signed in.
      rememberCompanyInvitation(token, invitation.expiresAt);

      if (setToastMsg) {
        setToastMsg(
          <EmailVerificationToast email={invitation.email} />,
          { type: 'success', hideIcon: true }
        );
      } else {
        toast.success(
          'Your Snabbb account has been created. Verify your email and sign in to activate the company membership.'
        );
      }

      setTimeout(onComplete, 2000);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (accountWasCreated) {
        toast.error(
          message ||
            'Your account was created, but it could not be connected to the company.'
        );
      } else {
        toast.error(
          message ||
            'Unable to create your account.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-500">Opening invitation...</div>;
  if (!invitation) return <div className="min-h-screen grid place-items-center bg-slate-100 px-6"><div className="rounded-3xl bg-white p-10 text-center shadow-xl"><h1 className="text-2xl font-black">Invitation unavailable</h1><p className="mt-3 text-slate-500">This link is invalid, expired, or has already been used.</p></div></div>;

  if (invitation.accountExists) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-950">Your Snabbb account already exists</h1>
          <p className="mt-3 text-slate-500">
            Sign in as <span className="font-bold text-slate-700">{invitation.email}</span> to join{' '}
            <span className="font-bold text-tiffany-700">{invitation.companyName}</span>.
          </p>
          <button
            type="button"
            onClick={() => {
              rememberCompanyInvitation(token, invitation.expiresAt);
              onComplete();
            }}
            className="mt-8 w-full rounded-2xl bg-tiffany-600 py-4 font-black text-white hover:bg-tiffany-700"
          >
            Sign in to accept invitation
          </button>
        </div>
      </div>
    );
  }

  const fieldClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition-all focus:border-tiffany-500 focus:ring-2 focus:ring-tiffany-500/10';
  const validatedFieldClass = (name: ValidatedField) =>
    `${fieldClass} ${touched[name] && validationErrors[name] ? '!border-red-500 focus:!border-red-500 dark:!border-red-400 dark:focus:!border-red-400' : ''}`;
  const validationMessage = (name: ValidatedField) => touched[name] && validationErrors[name] ? (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400" role="alert">
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-100 text-[9px] font-black dark:bg-red-400/15" aria-hidden="true">!</span>
      {validationErrors[name]}
    </p>
  ) : null;
  const passwordFieldStyle: React.CSSProperties | undefined =
    passwordStrength === 'short' || (passwordStrength === 'empty' && touched.password && validationErrors.password)
      ? { borderColor: '#ef4444', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.10)' }
      : passwordStrength === 'fair'
        ? { borderColor: '#f59e0b', boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.10)' }
        : passwordStrength === 'strong'
          ? { borderColor: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.10)' }
          : undefined;
  const passwordStrengthMessage = passwordStrength === 'short' ? (
    validationMessage('password')
  ) : passwordStrength === 'fair' ? (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-500" role="status">
      <span aria-hidden="true">●</span> Weak password.
    </p>
  ) : passwordStrength === 'strong' ? (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-500" role="status">
      <span aria-hidden="true">●</span> Strong password.
    </p>
  ) : touched.password ? validationMessage('password') : null;
  const labelClass = 'mb-2 block text-xs font-black uppercase tracking-widest text-slate-400';
  return (
    <div className="min-h-screen bg-slate-100 px-5 py-10">
      <form onSubmit={submit} className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-12">
      <div className="font-extrabold text-2xl tracking-tighter text-slate-900">
        <span
          style={{
            transform: 'skewX(353deg)',
            display: 'inline-block',
          }}
        >
          App.
        </span>
        <SnabbbIcon />
      </div>
        <h1 className="mt-9 text-3xl font-black text-slate-950">Welcome to join <span className="text-tiffany-600">{invitation.companyName}</span></h1>
        <p className="mt-2 text-slate-400">Complete your profile to activate your team membership as <span className="font-bold capitalize">{invitation.role}</span>.</p>
        <div className="mt-10"><label className={labelClass}>Referred by (optional)</label><input value={form.referralCode} onChange={update('referralCode')} placeholder="Referral code, email, or referral link" className={fieldClass} /></div>
        <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass}>First name</label>
          <input
            required
            value={form.firstName}
            onChange={update('firstName')}
            placeholder="e.g. Alex"
            className={validatedFieldClass('firstName')}
          />
          {validationMessage('firstName')}
        </div>

        <div>
          <label className={labelClass}>Last name</label>
          <input
            required
            value={form.lastName}
            onChange={update('lastName')}
            placeholder="e.g. Wong"
            className={validatedFieldClass('lastName')}
          />
          {validationMessage('lastName')}
        </div>
          <div><label className={labelClass}>Your email</label><input readOnly value={invitation.email} className={`${fieldClass} bg-slate-50 text-slate-500`} /></div>
          <div><label className={labelClass}>Phone (WhatsApp)</label><input required type="tel" value={form.phone} onChange={update('phone')} placeholder="e.g. +60123456789" className={validatedFieldClass('phone')} />{validationMessage('phone')}</div>
          <div><label className={labelClass}>Date of birth</label><input required type="date" max={getLatestBirthDate()} value={form.dob} onChange={update('dob')} className={validatedFieldClass('dob')} />{validationMessage('dob')}</div>
          <div><label className={labelClass}>Job position</label><select required value={form.jobPosition} onChange={update('jobPosition')} className={fieldClass}><option value="">-- Select Position --</option>{DENTAL_POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></div>
          <div><label className={labelClass}>Country</label><input readOnly required value={form.country} className={`${fieldClass} bg-slate-50 text-slate-500`} /></div>
          <div><label className={labelClass}>Password</label><input required minLength={8} type="password" value={form.password} onChange={update('password')} placeholder="Create a password" className={fieldClass} style={passwordFieldStyle} />{passwordStrengthMessage}</div>
          <div><label className={labelClass}>Confirm password</label><input required minLength={8} type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Re-enter your password" className={validatedFieldClass('confirmPassword')} />{validationMessage('confirmPassword')}</div>
        </div>
        <label className="mt-7 flex items-start gap-3 text-sm text-slate-600"><input required type="checkbox" checked={form.agreed} onChange={update('agreed')} className="mt-1" />I agree to the Terms of Service, Privacy Policy and Disclaimer.</label>
        <button disabled={submitting} className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-black text-white disabled:opacity-50">{submitting ? 'Creating account...' : 'Create Snabbb Account'}</button>
      </form>
    </div>
  );
}

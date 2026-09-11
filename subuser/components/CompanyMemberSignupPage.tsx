import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authOdoo } from '@/services/authOdoo';
import { DENTAL_POSITIONS } from '@/constants/dentalPositions';
import { acceptCompanyInvitation, getCompanyInvitation } from '../services/subuserService';
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

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
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
        account_type: 'company_member',
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

      await acceptCompanyInvitation(token);

      if (setToastMsg) {
        setToastMsg(
          <EmailVerificationToast email={invitation.email} />,
          { type: 'success', hideIcon: true }
        );
      } else {
        toast.success(
          'Your company member account has been created successfully.'
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

  const fieldClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-tiffany-500 focus:ring-2 focus:ring-tiffany-500/10';
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
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>Last name</label>
          <input
            required
            value={form.lastName}
            onChange={update('lastName')}
            placeholder="e.g. Wong"
            className={fieldClass}
          />
        </div>
          <div><label className={labelClass}>Your email</label><input readOnly value={invitation.email} className={`${fieldClass} bg-slate-50 text-slate-500`} /></div>
          <div><label className={labelClass}>Phone (WhatsApp)</label><input required type="tel" value={form.phone} onChange={update('phone')} placeholder="e.g. +60123456789" className={fieldClass} /></div>
          <div><label className={labelClass}>Date of birth</label><input required type="date" value={form.dob} onChange={update('dob')} className={fieldClass} /></div>
          <div><label className={labelClass}>Job position</label><select required value={form.jobPosition} onChange={update('jobPosition')} className={fieldClass}><option value="">-- Select Position --</option>{DENTAL_POSITIONS.map((position) => <option key={position}>{position}</option>)}</select></div>
          <div><label className={labelClass}>Country</label><input readOnly required value={form.country} className={`${fieldClass} bg-slate-50 text-slate-500`} /></div>
          <div><label className={labelClass}>Password</label><input required minLength={8} type="password" value={form.password} onChange={update('password')} placeholder="Create a password" className={fieldClass} /></div>
          <div><label className={labelClass}>Confirm password</label><input required minLength={8} type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Re-enter your password" className={fieldClass} /></div>
        </div>
        <label className="mt-7 flex items-start gap-3 text-sm text-slate-600"><input required type="checkbox" checked={form.agreed} onChange={update('agreed')} className="mt-1" />I agree to the Terms of Service, Privacy Policy and Disclaimer.</label>
        <button disabled={submitting} className="mt-8 w-full rounded-2xl bg-slate-900 py-4 font-black text-white disabled:opacity-50">{submitting ? 'Creating account...' : 'Sign Up as Company Member'}</button>
      </form>
    </div>
  );
}

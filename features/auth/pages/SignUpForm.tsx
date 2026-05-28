
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { View } from '@/types/View';
import { DENTAL_POSITIONS } from '@/constants/dentalPositions';
import { Control, Controller, FieldErrors, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';
import { AuthFormInputs } from '../types/AuthFormInputs';
import { Box } from "@mui/material";
import { inputClasses, labelClasses } from '@/shared/styles/style';
import { formVariants, shakeVariants } from '@/shared/styles/variants';
import { SubmitButton } from '@/shared/ui/SubmitButton';
import { useAuthMutation } from '../hooks/useAuthMutation';
import { MINI_APPS } from '@/constants';
import { AppIcon } from '@/shared/components/AppIcon';

interface Props {
  control: Control<AuthFormInputs, any, AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  handleSubmit: UseFormHandleSubmit<AuthFormInputs, AuthFormInputs>;
  onNavigate?: (view: View) => void;
  setToastMsg?: (msg: string, options: { type: 'success' | 'error' }) => void;
}

export const SignupForm: React.FC<Props> = ({ control, onChange, error, onNavigate, handleSubmit, setToastMsg }) => {
  const [isLoginMode] = useState('login');
  const [showTermsError, setShowTermsError] = useState(false);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');

  const signupMutation = useAuthMutation();

  const onSubmit: SubmitHandler<AuthFormInputs> = async (data) => {
    try {
      const isCompany = accountType === 'company';
      const effectivePosition = data.jobPosition === 'OTHER'
        ? data.customJobPosition || ''
        : data.jobPosition;

      const payload: AuthFormInputs = {
        ...data,
        account_type: accountType,
        login: isCompany ? (data.companyEmail || data.login) : data.login,
        companyName: data.companyName,
        companyEmail: data.companyEmail,
        fullName: data.fullName,
        phone: data.phone,
        country: data.country,
        dob: isCompany ? undefined : data.dob,
        position: effectivePosition,
      };

      console.log('payload being sent:', payload);

      const res = await signupMutation.mutateAsync(payload);

      if (res.result.created) {
        setToastMsg?.('Registration successful! Email for verification sent.', { type: 'success' });
        setTimeout(() => onNavigate && onNavigate('login'), 2000);
      } else {
        setToastMsg?.('User already exists, please log in.', { type: 'error' });
      }
    } catch (err: any) {
      console.error('Signup failed:', err.message);
    }
  };

  const handleLegalClick = (e: React.MouseEvent, view: View) => {
    e.stopPropagation();
    e.preventDefault();
    if (onNavigate) onNavigate(view);
  };

  return (
    <>
      <div className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={'signup'}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                Create Account
              </h1>
              <p className="text-slate-500 font-semibold text-sm sm:text-base max-w-sm leading-relaxed">
                Join our ecosystem of powerful mini-apps.
              </p>
            </header>

            <Box className="space-y-5">

              {/* Account Type */}
              <div>
                <label className={labelClasses}>Account Type</label>
                <Controller
                  name="account_type"
                  control={control}
                  defaultValue="individual"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => { setAccountType('individual'); field.onChange('individual'); }}
                        className={`py-3 text-sm font-bold transition-all ${accountType === 'individual' ? 'bg-tiffany-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        <i className="fa-solid fa-user mr-2" /> Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAccountType('company'); field.onChange('company'); }}
                        className={`py-3 text-sm font-bold transition-all ${accountType === 'company' ? 'bg-tiffany-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        <i className="fa-solid fa-building mr-2" /> Company
                      </button>
                    </div>
                  )}
                />
              </div>

              {/* Company Fields */}
              {accountType === 'company' && (
                <>
                  <div>
                    <label className={labelClasses}>Company Name</label>
                    <div className="relative group">
                      <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="companyName"
                        defaultValue=""
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="e.g. INTERCOM MALI"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Company Email</label>
                    <div className="relative group">
                      <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="companyEmail"
                        defaultValue=""
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="email"
                            placeholder="e.g. hello@company.com"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400 italic">Company email for login and communication.</p>
                  </div>
                </>
              )}

              {/* Individual Email */}
              {accountType === 'individual' && (
                <div>
                  <label className={labelClasses}>Your Email</label>
                  <div className="relative group">
                    <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Controller
                      name="login"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="email"
                          placeholder="e.g. nur@email.com"
                          className={inputClasses}
                          required
                          onChange={(e) => { field.onChange(e); onChange(e); }}
                        />
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400 italic">This will be your login email.</p>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className={labelClasses}>Your Name</label>
                <div className="relative group">
                  <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="fullName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder={accountType === 'company' ? 'e.g. Ahmad Nizam' : 'e.g. Nur AYA CHE'}
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {accountType === 'company' && (
                  <p className="mt-1 text-xs text-slate-400 italic">Your name as the company representative.</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className={labelClasses}>{accountType === 'individual' ? 'Phone (WhatsApp)' : 'Phone'}</label>
                <div className="relative group">
                  <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        placeholder={accountType === 'individual' ? 'e.g. +60123456789' : 'phone'}
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.phone && <p className="mt-1 text-xs text-red-500">{error.phone.message}</p>}
              </div>

              {/* Job Position */}
              <div>
                <label className={labelClasses}>Job Position</label>
                <div className="relative group">
                  <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm z-10 pointer-events-none" />
                  <Controller
                    name="jobPosition"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={inputClasses}
                        value={field.value || ''}
                        required
                        onChange={(e) => {
                          const value = e.target.value;
                          setIsOtherMode(value === 'OTHER');
                          field.onChange(value);
                          onChange(e);
                        }}
                      >
                        <option value="" disabled>-- Select Position --</option>
                        {DENTAL_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                        <option value="OTHER">Other</option>
                      </select>
                    )}
                  />
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* Custom Job Position */}
              <AnimatePresence>
                {isOtherMode && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <label className={labelClasses}>Specify Position</label>
                    <div className="relative group">
                      <i className="fa-solid fa-pen-nib absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="customJobPosition"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="e.g. Clinic Manager"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Country */}
              <div>
                <label className={labelClasses}>Country</label>
                <div className="relative group">
                  <i className="fa-solid fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm z-10 pointer-events-none" />
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={inputClasses}
                        value={field.value || ''}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      >
                        <option value="" disabled>-- Select Country --</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Thailand">Thailand</option>
                        <option value="Indonesia">Indonesia</option>
                        <option value="Vietnam">Vietnam</option>
                        <option value="Philippines">Philippines</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                      </select>
                    )}
                  />
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* Date of Birth — Individual only */}
              {accountType === 'individual' && (
                <div>
                  <label className={labelClasses}>Date of Birth</label>
                  <div className="relative group">
                    <i className="fa-regular fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Controller
                      name="dob"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="date"
                          className={inputClasses}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                          onChange={(e) => { field.onChange(e); onChange(e); }}
                          required
                        />
                      )}
                    />
                  </div>
                  {error.dob && <p className="mt-1 text-xs text-red-500">{error.dob.message}</p>}
                </div>
              )}

              {/* Password */}
              <div>
                <label className={labelClasses}>Password</label>
                <div className="relative group">
                  <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.password && <p className="mt-1 text-xs text-red-500">{error.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClasses}>Confirm Password</label>
                <div className="relative group">
                  <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.confirmPassword && <p className="mt-1 text-xs text-red-500">{error.confirmPassword.message}</p>}
              </div>

              {/* Terms */}
              <motion.div
                animate={showTermsError ? 'shake' : ''}
                variants={shakeVariants}
                className={`flex items-start gap-3 pb-2 rounded-2xl transition-all duration-300 ${showTermsError ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-transparent'}`}
              >
                <Controller
                  name="agreedToTerms"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <>
                      <input
                        id="agreedToTerms"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => { field.onChange(e.target.checked); onChange(e); }}
                        className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer transition-all ${showTermsError ? 'ring-2 ring-rose-500 border-rose-500' : 'accent-blue-600'}`}
                      />
                      <div className="text-xs">
                        <label
                          htmlFor="agreedToTerms"
                          className={`font-medium cursor-pointer leading-relaxed transition-colors ${error.agreedToTerms ? 'text-rose-600' : 'text-slate-500'}`}
                        >
                          I agree to the{' '}
                          <span onClick={(e) => handleLegalClick(e, 'terms')} className="text-tiffany-600 font-bold hover:underline">Terms of Service</span>,{' '}
                          <span onClick={(e) => handleLegalClick(e, 'privacy')} className="text-tiffany-600 font-bold hover:underline">Privacy Policy</span>{' '}
                          and{' '}
                          <span onClick={(e) => handleLegalClick(e, 'disclaimer')} className="text-tiffany-600 font-bold hover:underline">Disclaimer</span>.
                        </label>
                        {error.agreedToTerms && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] font-black uppercase text-rose-500 mt-1">
                            Required field
                          </motion.p>
                        )}
                      </div>
                    </>
                  )}
                />
              </motion.div>

              <SubmitButton isLoginMode={false} onClick={handleSubmit(onSubmit)} />
            </Box>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Side Showcase */}
      <div className="hidden md:flex flex-1 bg-slate-950 p-8 sm:p-10 lg:p-14 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 mb-12">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tighter">
              One account.<br />
              <span className="text-blue-500">Infinite</span> possibilities.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs font-medium">
              Unlock specialized tools built to accelerate your workflow.
            </p>
          </motion.div>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="grid grid-cols-3 gap-y-10 gap-x-6"
        >
          {MINI_APPS.map((app, i) => {
            if (i <= 5) {
              return <AppIcon key={app.id} icon={app.icon} label={app.title} color={app.colorScheme.bg} />;
            }
          })}
        </motion.div>
      </div>
    </>
  );
};


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { View } from '@/types/View';
import { DENTAL_POSITIONS } from '@/constants/dentalPositions';
import { Control, Controller, FieldErrors, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';
import { AuthFormInputs } from '../types/AuthFormInputs';
import {
  TextField,
  Select,
  MenuItem,
  Checkbox,
  Button,
  FormControl,
  Box,
} from "@mui/material";
import { inputClasses, labelClasses } from '@/shared/styles/style';
import { containerVariants, formVariants, shakeVariants } from '@/shared/styles/variants';
import { SubmitButton } from '@/shared/ui/SubmitButton';
import { useAuthMutation } from '../hooks/useAuthMutation';

interface Props {
  control: Control<AuthFormInputs, any, AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  handleSubmit: UseFormHandleSubmit<AuthFormInputs, AuthFormInputs>
  onNavigate?: (view: View) => void;
  setToastMsg?: (msg: string, options: { type: 'success' | 'error' }) => void;
}

export const SignupForm: React.FC<Props> = ({ control, onChange, error, onNavigate, handleSubmit, setToastMsg }) => {
  const [isLoginMode, setIsLoginMode] = useState('login');
  const [showTermsError, setShowTermsError] = useState(false);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [tempOtherValue, setTempOtherValue] = useState('');

    const signupMutation = useAuthMutation();
  
    const onSubmit: SubmitHandler<AuthFormInputs> = async (data) => {
      try {
        const res = await signupMutation.mutateAsync(data);
        if(res.result.created){
          setToastMsg('Registration successful! Email for verification sent.', { type: 'success' });
          setTimeout(() => {
            onNavigate && onNavigate('gallery');
          }, 5000);
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
        
        {/* Left Side: Form - layout removed to prevent height animation */}
        <div 
          className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30"
        >
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
                {/* Email */}
                <div>
                  <label className={labelClasses}>Email Address</label>

                  <div className="relative group">
                    <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base transition-colors group-focus-within:text-blue-500" />

                    <Controller
                      name="login"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="email"
                          placeholder="john@example.com"
                          className={inputClasses}
                          required
                          onChange={(e) => {
                            field.onChange(e);
                            onChange(e);  
                          }}
                        />
                      )}
                    />
                  </div>
                </div>

                    
                  <motion.div className="flex flex-col gap-5">
      {/* Full Name */}
      <div>
      <label className={labelClasses}>Full Name</label>

      <div className="relative group">
        <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base transition-colors group-focus-within:text-blue-500" />

        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              placeholder="John Doe"
              className={inputClasses}
              onChange={(e) => {
                field.onChange(e);      // react-hook-form state
                onChange(e);   // your side-effects
              }}
              required
            />
          )}
        />
      </div>
    </div>


      {/* Job Position */}
      <div>
  <label className={labelClasses}>Job Position</label>

  <div className="relative group">
    <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500 z-10 pointer-events-none" />

    <Controller
      name="jobPosition"
      control={control}
      render={({ field }) => (
        <select
          {...field}
          className={inputClasses}
          value={isOtherMode ? "OTHER" : field.value || ""}
          onChange={(e: any) => {
            field.onChange(e); // react-hook-form
            onChange(e); // your existing logic
          }}
          required
        >
          <option value="" disabled>
            Select Position
          </option>

          {DENTAL_POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}

          <option value="OTHER">OTHER</option>
        </select>
      )}
    />

    <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
  </div>
</div>


      {/* Custom Job */}
      <AnimatePresence>
        {isOtherMode && (
          <div>
            <label className={labelClasses}>Specify Position</label>
            <div className="relative group">
              <i className="fa-solid fa-pen-nib absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <Controller
                name="customJobPosition"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    placeholder="e.g. CLINIC MANAGER"
                    onChange={(e: any) => {
                      field.onChange(e);
                      onChange(e);
                    }}
                    error={!!error.customJobPosition}
                    helperText={error.customJobPosition?.message}
                    fullWidth
                    required
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      className: inputClasses,
                    }}
                  />
                )}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>

    {/* Phone */}
      <div>
        <label className={labelClasses}>Phone Number</label>

        <div className="relative group">
          <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-blue-500" />

          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                placeholder="+1 (555) 000-0000"
                className={inputClasses}
                required
                onChange={(e) => {
                  field.onChange(e);   // react-hook-form
                  onChange(e);         // side-effects
                }}
              />
            )}
          />
        </div>
          
        {error.phone && (
          <p className="mt-1 text-xs text-red-500">{error.phone.message}</p>
        )}
      </div>

          
    {/* Password */}
    {/* <div>
      <label className={labelClasses}>Password</label>

      <div className="relative group">
        <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-blue-500" />

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
              onChange={(e) => {
                field.onChange(e);
                onChange(e);
              }}
            />
          )}
        />
      </div>
        
      {error.password && (
        <p className="mt-1 text-xs text-red-500">{error.password.message}</p>
      )}
    </div> */}

        
      {/* Password */}
    {/* <div>
      <label className={labelClasses}>Confirm Password</label>

      <div className="relative group">
        <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-blue-500" />

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
              onChange={(e) => {
                field.onChange(e);
                onChange(e);
              }}
            />
          )}
        />
      </div>
        
      {error.confirmPassword && (
        <p className="mt-1 text-xs text-red-500">
          {error.confirmPassword.message}
        </p>
      )}
    </div> */}

        
    {/* Terms */}
    <motion.div
  animate={showTermsError ? "shake" : ""}
  variants={shakeVariants}
  className={`flex items-start gap-3 pb-2 rounded-2xl transition-all duration-300 ${
    showTermsError
      ? "bg-rose-50 ring-1 ring-rose-200"
      : "bg-transparent"
  }`}
>
  <div className="flex items-center h-5">
    <Controller
      name="agreedToTerms"
      control={control}
      render={({ field }) => (
        <input
          id="agreedToTerms"
          type="checkbox"
          checked={!!field.value}
          onChange={(e) => {
            field.onChange(e.target.checked); 
            onChange(e);                      
          }}
          className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer transition-all ${
            showTermsError
              ? "ring-2 ring-rose-500 border-rose-500"
              : "accent-blue-600"
          }`}
        />
      )}
    />
  </div>

  {/* TERMS */}
        <div className="flex items-center h-5">
          <Controller
            name="agreedToTerms"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <div className="text-xs">
          <label
            htmlFor="agreedToTerms"
            className={`font-medium cursor-pointer leading-relaxed transition-colors ${
              error.agreedToTerms ? "text-rose-600" : "text-slate-500"
            }`}
          >
            I agree to the{" "}
            <span
              onClick={(e) => handleLegalClick(e, "terms")}
              className="text-blue-600 font-bold hover:underline"
            >
              Terms of Service
            </span>{" "}
            and{" "}
            <span
              onClick={(e) => handleLegalClick(e, "privacy")}
              className="text-blue-600 font-bold hover:underline"
            >
              Privacy Policy
            </span>
            .
          </label>

          {error.agreedToTerms && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black uppercase text-rose-500 mt-1"
            >
              Required field
            </motion.p>
          )}
        </div>
            )}
          />
        </div>

        
</motion.div>

                    
        {/* Submit */}
        <SubmitButton isLoginMode={false} onClick={handleSubmit(onSubmit)} />
      </Box>
    </motion.div>
  </AnimatePresence>
</div>

  {/* Right Side: Showcase (Visible on md and up) */}
  <div className="hidden md:flex flex-1 bg-slate-950 p-8 sm:p-10 lg:p-14 flex-col justify-center relative overflow-hidden">
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
    
    <div className="relative z-10 mb-12">
      <motion.div 
        key={isLoginMode ? 'showcase-login' : 'showcase-signup'}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tighter">
          {isLoginMode ? 'Ready for' : 'One account.'}<br />
          <span className="text-blue-500">{isLoginMode ? 'Action?' : 'Infinite'}</span> {isLoginMode ? '' : 'possibilities.'}
        </h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-xs font-medium">
          {isLoginMode 
            ? 'Your customized dashboard and favorite tools are just one step away.'
            : 'Unlock specialized tools built to accelerate your workflow.'}
        </p>
      </motion.div>
    </div>  
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
            }}
            className="grid grid-cols-3 gap-y-10 gap-x-6"
          >
            <AppIcon icon="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMq1ycD19uS2-bqaqsEg7R_wyOnVH9gTXyQA&s" label="SHOP" color="bg-blue-600" />
            <AppIcon icon="fa-solid fa-boxes-stacked" label="INVENTORY" color="bg-[#fff1e6] text-[#b91c1c]" />
            <AppIcon icon="fa-solid fa-calendar-check" label="EVENT" color="bg-[#ecfeff] text-[#0891b2]" />
            <AppIcon icon="fa-solid fa-wand-magic-sparkles" label="IMAGE STUDIO" color="bg-[#f2e9ff] text-[#7e22ce]" />
            <AppIcon icon="fa-solid fa-calendar-plus" label="APPOINTMENT" color="bg-[#f0fdf4] text-[#15803d]" />
            <AppIcon icon="fa-solid fa-calculator" label="CALCULATOR" color="bg-[#fffbeb] text-[#b45309]" />
          </motion.div>
        </div>
        </>
  );
};

const AppIcon = ({ icon, label, color }: { icon: string, label: string, color: string }) => {
  const isImageUrl = icon.startsWith('http');
  
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 }
      }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
      className="flex flex-col items-center gap-3"
    >
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-black/30 relative overflow-hidden group/icon ${color}`}>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10" />
        
        {isImageUrl ? (
          <img src={icon} alt={label} className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover/icon:scale-110" />
        ) : (
          <i className={`${icon} text-2xl sm:text-3xl relative z-10 transition-transform duration-500 group-hover/icon:scale-110`}></i>
        )}
      </div>
      <span className="text-[8px] font-black tracking-[0.15em] text-slate-500 uppercase text-center leading-tight">{label}</span>
    </motion.div>
  );
};

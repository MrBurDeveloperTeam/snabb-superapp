import { ErrorMessage } from "@/components/ErrorMessage";
import { Control, Controller, FieldErrors, SubmitHandler, UseFormHandleSubmit, UseFormSetValue } from "react-hook-form";
import { LoginFormInputs } from "../types/LoginPageProps";
import React, { ChangeEventHandler, Dispatch, SetStateAction, useEffect } from "react";
import { Box } from "@mui/material";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { inputClasses, labelClasses } from "@/shared/styles/style";
import { AppIcon } from "@/shared/components/AppIcon";
import { SubmitButton } from "@/shared/ui/SubmitButton";
import { View } from "@/types/View";
import { AuthFormInputs } from "../types/AuthFormInputs";
import { useLoginMutation } from "../hooks/useLoginMutation";
import { on } from "events";
import { AuthFormData } from "@/types/AuthFormData";

interface Props {
  onAuthSuccess: () => void;
  control: Control<AuthFormInputs, any, AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  setValue: UseFormSetValue<AuthFormInputs>;
  handleSubmit: UseFormHandleSubmit<AuthFormInputs, AuthFormInputs>;
  onNavigate?: (view: View) => void;
  setToastMsg?: (msg: string, options: { type: 'success' | 'error' }) => void;
  setExternalUserId?: (id: string) => void;
  setLoggedInUser: React.Dispatch<React.SetStateAction<AuthFormData>>;
  setFormData: Dispatch<SetStateAction<Partial<LoginFormInputs>>>;
}

const formVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
};

const LoginForm: React.FC<Props> = ({ setFormData, onAuthSuccess, control, onChange, error, setValue, handleSubmit, onNavigate, setToastMsg, setExternalUserId, setLoggedInUser }) => {
  const loginMutation = useLoginMutation(onAuthSuccess);
  const isLoading = loginMutation.isPending;

  useEffect(() => {
    const saved = localStorage.getItem("remember_email");
    if (saved) {
      setValue("login", saved, { shouldDirty: false });
      setValue("rememberMe", true, { shouldDirty: false });
    }
  }, [setValue]);

  const onSubmit: SubmitHandler<AuthFormInputs> = async (data) => {
    const remember = (data as any).rememberMe;

    if (remember) {
      localStorage.setItem("remember_email", data.login);
    } else {
      localStorage.removeItem("remember_email");
    }
    try {
      const result = await loginMutation.mutateAsync(data);

      if (result?.sessionInfo?.name) {
        setToastMsg?.("Login successful!", { type: "success" });

        setLoggedInUser((user) => ({
          ...user,
          fullName: result.sessionInfo.name,
          email: result.sessionInfo.email,
        }));

        setExternalUserId?.(String(result.sessionInfo.uid));

        setFormData((prev) => ({
          ...prev,
          login: result.sessionInfo.email,
        }));

        setTimeout(() => {
          onNavigate?.("gallery");
        }, 1000);
      } else {
        throw new Error("Session info missing");
      }
    } catch (err) {
      setToastMsg?.("Login failed", { type: "error" });
    }
  };


  return (
    <>
    <Box className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                  Welcome Back
                </h1>
                <p className="text-slate-500 font-semibold text-sm sm:text-base max-w-sm leading-relaxed">
                  Sign in to access your saved tools and workspace.
                </p>
              </header>
              <Box className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)}>
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
                name="email"  
                autoComplete="email"
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

      {/* Password */}
      <div>
        <label className={labelClasses}>Password</label>
        <div className="relative group">
          <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500"></i>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className={inputClasses}
                onChange={(e) => {
                  field.onChange(e);
                  onChange(e);
                }}
              />
            )}
          />
          </div>
      </div>

      {/* Name */}
      <div style={{ display: 'none' }}>
      <Controller
      name="name" // Ensure the name field is part of the form
      control={control}
      render={({ field }) => (
        <input
          {...field}
          type="text"
          placeholder="John Doe"
          className={inputClasses}
          required
        />
      )}
    />
    </div>
      <div className="flex items-center justify-between">
        <Controller
          name="rememberMe"
          control={control}
          defaultValue={true}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
              Remember me
            </label>
          )}
        />
      </div>
      {/* Display generic form errors if needed */}
      {error && error.email && <ErrorMessage message={error.email.message} />}
      {error && error.password && <ErrorMessage message={error.password.message} />}
                {/* Submit button stays shared */}
      <SubmitButton isLoginMode={true} isLoading={isLoading} disabled={isLoading} />
      </form>
      </Box>
      </motion.div>
      </AnimatePresence>
    </Box>
    <div className="hidden md:flex flex-1 bg-slate-950 p-8 sm:p-10 lg:p-14 flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 mb-12">
            <motion.div 
              key={'showcase-login'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tighter">
                Ready for<br />
                <span className="text-blue-500">{'Action?'}</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed max-w-xs font-medium">
                Your customized dashboard and favorite tools are just one step away.
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

export default LoginForm;

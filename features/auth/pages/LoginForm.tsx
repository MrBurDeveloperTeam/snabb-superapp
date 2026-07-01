import { ErrorMessage } from "@/components/ErrorMessage";
import {
  Control,
  Controller,
  FieldErrors,
  SubmitHandler,
  UseFormHandleSubmit,
  UseFormSetValue,
} from "react-hook-form";
import { LoginFormInputs } from "../types/LoginPageProps";
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { inputClasses, labelClasses } from "@/shared/styles/style";
import { AppIcon } from "@/shared/components/AppIcon";
import { SubmitButton } from "@/shared/ui/SubmitButton";
import { View } from "@/types/View";
import { AuthFormInputs } from "../types/AuthFormInputs";
import { useLoginMutation } from "../hooks/useLoginMutation";
import { AuthFormData } from "@/types/AuthFormData";
import { MINI_APPS } from "@/constants";
import { resetPassword } from "@/services/resetPassword";

interface Props {
  onAuthSuccess: () => void;
  control: Control<AuthFormInputs, any, AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  setValue: UseFormSetValue<AuthFormInputs>;
  handleSubmit: UseFormHandleSubmit<AuthFormInputs, AuthFormInputs>;
  onNavigate?: (view: View) => void;
  setToastMsg?: (msg: string, options: { type: "success" | "error" }) => void;
  setExternalUserId?: (id: string) => void;
  setLoggedInUser: React.Dispatch<React.SetStateAction<AuthFormData | null>>;
  setFormData: Dispatch<SetStateAction<Partial<LoginFormInputs>>>;
}

const formVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// ─── Forgot-password panel variants ──────────────────────────────────────────
const forgotVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  exit:   { opacity: 0, y: -16, transition: { duration: 0.2, ease: "easeIn" } },
};

// ─── Inline "sent" confirmation banner ───────────────────────────────────────
const sentVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
};

const LoginForm: React.FC<Props> = ({
  setFormData,
  onAuthSuccess,
  control,
  onChange,
  error,
  setValue,
  handleSubmit,
  onNavigate,
  setToastMsg,
  setExternalUserId,
  setLoggedInUser,
}) => {
  const loginMutation = useLoginMutation(onAuthSuccess);
  const isLoading = loginMutation.isPending;

  // ── Forgot-password state ─────────────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const forgotInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill the forgot-password email from the login field when the panel opens
  useEffect(() => {
    if (showForgot) {
      // Small delay so the panel is mounted before we attempt focus
      setTimeout(() => forgotInputRef.current?.focus(), 80);
    } else {
      // Reset state when panel closes
      setForgotSent(false);
      setForgotError(null);
    }
  }, [showForgot]);

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

        setLoggedInUser((prev) => ({
          ...(prev ?? {
            fullName: "",
            jobPosition: "",
            phone: "",
            email: "",
            password: "",
            confirmPassword: "",
            agreedToTerms: true,
            country: "",
            partner_id: 0,
          }),
          fullName: result.sessionInfo.name,
          email: result.sessionInfo.email,
        }));

        setExternalUserId?.(String(result.sessionInfo.uid));

        setFormData((prev) => ({
          ...prev,
          login: result.sessionInfo.email,
        }));

      } else {
        return new Error("Session info missing");
      }
    } catch (err) {
      console.log('Login failed:', err);
      setToastMsg?.("Login failed", { type: "error" });
    }
  };

  // ── Forgot-password submit ────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotError(null);

    try {
      await resetPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <Box className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30">
        <AnimatePresence mode="wait" initial={false}>

          {/* ── LOGIN FORM ─────────────────────────────────────────────── */}
          {!showForgot ? (
            <motion.div
              key="login-panel"
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
                              // Mirror into forgot-email so it's pre-filled
                              setForgotEmail(e.target.value);
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className={labelClasses}>Password</label>

                    <div className="relative group">
                      <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500" />

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

                  <div style={{ display: "none" }}>
                    <Controller
                      name="fullName"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          placeholder="John Doe"
                          className={inputClasses}
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Controller
                      name="rememberMe"
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer">
                          <div className="relative h-4 w-4 flex-shrink-0">
                            <input
                              type="checkbox"
                              className="peer absolute opacity-0 h-4 w-4 cursor-pointer"
                              checked={!!field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                            <div className="h-4 w-4 rounded border-2 border-tiffany-500 peer-checked:bg-tiffany-500 peer-checked:border-tiffany-500 transition-colors" />
                            {!!field.value && (
                              <svg
                                className="absolute inset-0 h-4 w-4 text-white pointer-events-none"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M3 8l3.5 3.5L13 5"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          Remember me
                        </label>
                      )}
                    />

                    {/* ── Forgot password link ── */}
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs font-semibold text-tiffany-600 hover:text-tiffany-700 transition-colors underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error?.login && <ErrorMessage message={String(error.login.message ?? "")} />}
                  {error?.password && <ErrorMessage message={String(error.password.message ?? "")} />}

                  <SubmitButton isLoginMode={true} isLoading={isLoading} disabled={isLoading} />
                </form>
              </Box>
            </motion.div>

          ) : (
            /* ── FORGOT PASSWORD PANEL ──────────────────────────────── */
            <motion.div
              key="forgot-panel"
              variants={forgotVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full"
            >
              {/* Back button */}
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors mb-8 group"
              >
                <i className="fa-solid fa-arrow-left text-[10px] group-hover:-translate-x-0.5 transition-transform" />
                Back to sign in
              </button>

              <header className="mb-8">
                <div className="w-11 h-11 rounded-2xl bg-tiffany-50 border border-tiffany-100 flex items-center justify-center mb-4">
                  <i className="fa-solid fa-key text-tiffany-500 text-base" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                  Reset Password
                </h2>
                <p className="text-slate-500 font-semibold text-sm max-w-sm leading-relaxed">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </header>

              <AnimatePresence mode="wait">
                {forgotSent ? (
                  /* ── Success state ── */
                  <motion.div
                    key="sent"
                    variants={sentVariants}
                    initial="hidden"
                    animate="visible"
                    className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 flex gap-3 items-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fa-solid fa-check text-emerald-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800 mb-0.5">Check your inbox</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        If <span className="font-semibold">{forgotEmail}</span> is registered, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowForgot(false)}
                        className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors underline-offset-2 hover:underline"
                      >
                        Return to sign in →
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Email form ── */
                  <motion.form
                    key="forgot-form"
                    onSubmit={handleForgotSubmit}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div>
                      <label className={labelClasses}>Email Address</label>
                      <div className="relative group">
                        <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base transition-colors group-focus-within:text-tiffany-500" />
                        <input
                          ref={forgotInputRef}
                          type="email"
                          autoComplete="email"
                          placeholder="john@example.com"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            setForgotError(null);
                          }}
                          required
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex gap-2 items-center">
                        <i className="fa-solid fa-circle-exclamation text-red-400 text-xs flex-shrink-0" />
                        <p className="text-xs font-semibold text-red-700">{forgotError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail.trim()}
                      className="mt-5 w-full py-3.5 rounded-xl bg-tiffany-500 hover:bg-tiffany-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {forgotLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane text-xs" />
                          Send Reset Link
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </Box>

      <div className="hidden md:flex flex-1 bg-slate-950 p-8 sm:p-10 lg:p-14 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 mb-12">
          <motion.div
            key="showcase-login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tighter">
              Ready for
              <br />
              <span className="text-blue-500">Action?</span>
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
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
          className="grid grid-cols-3 gap-y-10 gap-x-6"
        >
          {MINI_APPS.map((app, i) => {
            if (i <= 5) {
              return (
                <AppIcon
                  key={app.id}
                  icon={app.icon}
                  label={app.title}
                />
              );
            }
            return null;
          })}
        </motion.div>
      </div>
    </>
  );
};

export default LoginForm;

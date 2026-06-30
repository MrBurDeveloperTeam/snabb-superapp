import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SnabbbIcon } from '../../../public/icons/SnabbbIcon';

const ODOO_BASE = 'https://app.snabbb.com';

interface ResetPasswordPageProps {
  navigate: (path: string) => void;
}

type Stage = 'form' | 'success' | 'error';

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ navigate }) => {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setErrorMsg('No reset token found. Please request a new password reset link.');
      setStage('error');
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${ODOO_BASE}/mrbur/reset_password/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          id: 1,
          params: { token, password },
        }),
      });

      const data = await res.json();
      const result = data?.result;

      if (result?.ok) {
        setStage('success');
      } else {
        setErrorMsg(result?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (stage === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-tiffany-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-check text-emerald-500 text-2xl" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Password updated!</h2>
          <p className="text-slate-500 text-sm mb-8">
            Your password has been reset successfully. You're now logged in.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="w-full py-3 bg-tiffany-600 text-white font-bold rounded-xl hover:bg-tiffany-700 transition-all"
          >
            Go to App
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Error (no/invalid token) ──────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-rose-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-link-slash text-rose-500 text-2xl" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Invalid link</h2>
          <p className="text-slate-500 text-sm mb-8">{errorMsg}</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-tiffany-600 text-white font-bold rounded-xl hover:bg-tiffany-700 transition-all"
          >
            Back to Login
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-tiffany-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl tracking-tighter text-slate-900">
            <span style={{ transform: 'skewX(353deg)', display: 'inline-block' }}>App.</span>
            <SnabbbIcon />
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-4 mb-1">Set new password</h1>
          <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-tiffany-500/30 focus:border-tiffany-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat your password"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-tiffany-500/30 focus:border-tiffany-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <i className={`fa-solid ${showConfirm ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
              </button>
            </div>
          </div>

          {/* Inline error */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-4 py-3 rounded-xl"
            >
              <i className="fa-solid fa-circle-exclamation shrink-0" />
              {errorMsg}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full py-3.5 bg-tiffany-600 text-white font-bold rounded-xl hover:bg-tiffany-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin text-sm" />
                Updating…
              </span>
            ) : (
              'Update Password'
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Remembered it?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-tiffany-600 font-bold hover:underline"
          >
            Back to Login
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;

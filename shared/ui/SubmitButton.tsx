import React from 'react';
import { motion } from 'framer-motion';
import { SubmitButtonProps } from '../types/SubmitButtonProps';

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoginMode,
  isLoading = false,
  disabled = false,
  onClick,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      type="submit"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group text-sm ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        <>
          {isLoginMode ? 'Sign In to Workspace' : 'Get Started Now'}
          <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
        </>
      )}
    </motion.button>
  );
};


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { View, AuthFormData } from '../App';

interface AuthPageProps {
  onAuthSuccess: () => void;
  initialMode?: 'login' | 'signup';
  onNavigate?: (view: View) => void;
  formData: AuthFormData;
  setFormData: React.Dispatch<React.SetStateAction<AuthFormData>>;
}

const DENTAL_POSITIONS = [
  "General Dentist",
  "Restorative Dentist",
  "Pediatric Dentist",
  "Prosthodontist",
  "Endodontist",
  "Orthodontist",
  "Periodontist",
  "Oral Surgeon",
  "Other"
];

const AuthPage: React.FC<AuthPageProps> = ({ 
  onAuthSuccess, 
  initialMode = 'login', 
  onNavigate,
  formData,
  setFormData
}) => {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [error, setError] = useState<string | null>(null);
  const [showTermsError, setShowTermsError] = useState(false);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [tempOtherValue, setTempOtherValue] = useState('');

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
    setError(null);
    setShowTermsError(false);
    
    // Check if current jobPosition is a custom one or "OTHER"
    const currentPos = formData.jobPosition;
    if (currentPos === 'OTHER' || (currentPos && !DENTAL_POSITIONS.includes(currentPos))) {
      setIsOtherMode(true);
      if (currentPos !== 'OTHER') {
        setTempOtherValue(currentPos);
      }
    } else {
      setIsOtherMode(false);
    }
  }, [initialMode, formData.jobPosition]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    }
  };

  const inputClasses = "w-full bg-white border border-slate-200 rounded-xl px-11 py-3 text-slate-800 focus:outline-none focus:border-blue-600 text-sm font-medium placeholder:text-slate-400 transition-all appearance-none";
  const labelClasses = "block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5 ml-1";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setError(null);
    
    let checked = false;
    if (e.target instanceof HTMLInputElement && type === 'checkbox') {
      checked = (e.target as HTMLInputElement).checked;
      if (name === 'agreedToTerms' && checked) {
        setShowTermsError(false);
      }
    }

    if (name === 'jobPosition') {
      if (value === 'OTHER') {
        setIsOtherMode(true);
        setFormData(prev => ({ ...prev, jobPosition: 'OTHER' }));
      } else {
        setIsOtherMode(false);
        setTempOtherValue('');
        setFormData(prev => ({ ...prev, jobPosition: value }));
      }
    } else if (name === 'customJobPosition') {
      setTempOtherValue(value);
      setFormData(prev => ({ ...prev, jobPosition: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowTermsError(false);

    if (!isLoginMode) {
      if (!formData.fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!formData.jobPosition || formData.jobPosition === 'OTHER') {
        setError("Please provide your job position.");
        return;
      }
      if (!formData.phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
      if (!formData.email.trim()) {
        setError("Please enter your email.");
        return;
      }
      if (!formData.password) {
        setError("Please enter a password.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!formData.agreedToTerms) {
        setShowTermsError(true);
        setError("Please agree to the Terms and Privacy Policy.");
        return;
      }
    }
    
    onAuthSuccess();
  };

  const handleLegalClick = (e: React.MouseEvent, view: View) => {
    e.stopPropagation();
    e.preventDefault();
    if (onNavigate) onNavigate(view);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-84px)] flex items-center justify-center p-0 sm:p-6 lg:p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-slate-50 -z-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100/50 blur-[100px] rounded-full pointer-events-none" />

      {/* Container - layout removed to prevent height animation */}
      <div 
        className="max-w-5xl w-full bg-white rounded-none sm:rounded-[2.5rem] shadow-none sm:shadow-[0_40px_160px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row min-h-[calc(100vh-84px)] sm:min-h-[500px] border-0 sm:border border-white relative z-10"
      >
        
        {/* Left Side: Form - layout removed to prevent height animation */}
        <div 
          className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isLoginMode ? 'login' : 'signup'}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full"
            >
              <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                  {isLoginMode ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-slate-500 font-semibold text-sm sm:text-base max-w-sm leading-relaxed">
                  {isLoginMode 
                    ? 'Sign in to access your saved tools and workspace.' 
                    : 'Join our ecosystem of powerful mini-apps.'}
                </p>
              </header>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className={labelClasses}>Email Address</label>
                  <div className="relative group">
                    <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base transition-colors group-focus-within:text-blue-500"></i>
                    <input 
                      type="email" 
                      name="email"
                      placeholder="john@example.com" 
                      className={inputClasses} 
                      required 
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {!isLoginMode && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-5"
                  >
                    <div>
                      <label className={labelClasses}>Full Name</label>
                      <div className="relative group">
                        <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-base transition-colors group-focus-within:text-blue-500"></i>
                        <input 
                          type="text" 
                          name="fullName"
                          placeholder="John Doe" 
                          className={inputClasses}
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Job Position</label>
                      <div className="relative group">
                        <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500 z-10 pointer-events-none"></i>
                        <select 
                          name="jobPosition"
                          className={inputClasses}
                          value={isOtherMode ? 'OTHER' : (formData.jobPosition || '')}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="" disabled>Select Position</option>
                          {DENTAL_POSITIONS.map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none"></i>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isOtherMode && (
                        <div>
                          <label className={labelClasses}>Specify Position</label>
                          <div className="relative group">
                            <i className="fa-solid fa-pen-nib absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
                            <input
                              type="text"
                              name="customJobPosition"
                              placeholder="e.g. CLINIC MANAGER"
                              className={inputClasses}
                              value={tempOtherValue}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {!isLoginMode && (
                  <div>
                    <label className={labelClasses}>Phone Number</label>
                    <div className="relative group">
                      <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500"></i>
                      <input 
                        type="tel" 
                        name="phone"
                        placeholder="+1 (555) 000-0000" 
                        className={inputClasses} 
                        required 
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={labelClasses}>Password</label>
                    {isLoginMode && (
                      <button type="button" className="text-[10px] font-bold text-blue-600 hover:underline">Forgot?</button>
                    )}
                  </div>
                  <div className="relative group">
                    <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500"></i>
                    <input 
                      type="password" 
                      name="password"
                      placeholder="••••••••" 
                      className={inputClasses} 
                      required 
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {!isLoginMode && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="space-y-5"
                   >
                    <div>
                      <label className={labelClasses}>Confirm Password</label>
                      <div className="relative group">
                        <i className="fa-solid fa-check-double absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm transition-colors group-focus-within:text-blue-500"></i>
                        <input 
                          type="password" 
                          name="confirmPassword"
                          placeholder="••••••••" 
                          className={inputClasses} 
                          required 
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <motion.div 
                      animate={showTermsError ? "shake" : ""}
                      variants={shakeVariants}
                      className={`flex items-start gap-3 pb-2 rounded-2xl transition-all duration-300 ${showTermsError ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-transparent'}`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          id="agreedToTerms"
                          name="agreedToTerms"
                          type="checkbox"
                          required
                          checked={formData.agreedToTerms}
                          onChange={handleInputChange}
                          className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer transition-all ${showTermsError ? 'ring-2 ring-rose-500 border-rose-500' : 'accent-blue-600'}`}
                        />
                      </div>
                      <div className="text-xs">
                        <label htmlFor="agreedToTerms" className={`font-medium cursor-pointer leading-relaxed transition-colors ${showTermsError ? 'text-rose-600' : 'text-slate-500'}`}>
                          I agree to the <span onClick={(e) => handleLegalClick(e, 'terms')} className="text-blue-600 font-bold hover:underline">Terms of Service</span> and <span onClick={(e) => handleLegalClick(e, 'privacy')} className="text-blue-600 font-bold hover:underline">Privacy Policy</span>.
                        </label>
                        {showTermsError && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-[10px] font-black uppercase text-rose-500 mt-1"
                          >
                            Required field
                          </motion.p>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3"
                    >
                      <i className="fa-solid fa-circle-exclamation text-rose-500 text-sm"></i>
                      <p className="text-rose-600 text-xs font-bold">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group text-sm"
                >
                  {isLoginMode ? 'Sign In to Workspace' : 'Get Started Now'}
                  <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                </motion.button>

                <div className="pt-2 flex items-center justify-center gap-2 border-t border-slate-100 mt-2">
                  <span className="text-slate-400 text-xs font-semibold">
                    {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <button 
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setError(null);
                      setShowTermsError(false);
                      setFormData(prev => ({ ...prev, agreedToTerms: false }));
                    }} 
                    type="button" 
                    className="text-blue-600 hover:text-blue-700 font-black text-xs transition-all hover:underline decoration-2 underline-offset-4"
                  >
                    {isLoginMode ? 'Create Account' : 'Log In Here'}
                  </button>
                </div>
              </form>
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
      </div>
    </motion.div>
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

export default AuthPage;

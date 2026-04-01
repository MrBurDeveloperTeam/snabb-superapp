import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MINI_APPS, CATEGORIES } from './constants';
import AppCard from './components/AppCard';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import { AuthPage } from './features/auth/pages/AuthPage';
import { signOut } from './services/signOut';
import { getAuthUser } from './utils/authStorage';
import useGetSessionInfo from './features/auth/hooks/useGetSessionInfo';
import api from './services/api';

import type { MiniApp } from './types';
import type { AuthFormData } from './types/AuthFormData';
import type { View } from './types/View';

const initialFormData: AuthFormData = {
  fullName: '',
  jobPosition: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
};

const ALLOWED_ORIGINS = [
  'https://inventory.snabbb.com',
  'https://appointment.snabbb.com',
  'https://event.snabbb.com',
  'https://shop.snabbb.com',
  'https://app.snabbb.com',
];

const App: React.FC = () => {
  const path = window.location.pathname;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<View>('gallery');
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [authFormData, setAuthFormData] = useState<AuthFormData>(initialFormData);
  const [user, setUser] = useState<AuthFormData | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<AuthFormData | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const checkingSessionRef = useRef(false);
  const lastVerifyAtRef = useRef(0);

  const { mutateAsync: getSessionInfo } = useGetSessionInfo();

  const userName = authFormData?.fullName || 'Guest User';
  const userInitial = userName.charAt(0).toUpperCase();

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-rose-500',
      'bg-orange-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const avatarBgColor = useMemo(() => getAvatarColor(userName), [userName]);

  const clearAuthState = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    setLoggedInUser(null);
    setAuthFormData(initialFormData);
    setIsProfileMenuOpen(false);
    setCurrentView('gallery');
    setPreviousView(null);
  }, []);

  const verifySession = useCallback(async () => {
    try {
      const res = (await getSessionInfo()) as any;

      console.log('the res: ',!res?.sessionInfo);
      if (!res?.sessionInfo) {
        clearAuthState();
        return false;
      }

      const nextUser: AuthFormData = {
        fullName: res.sessionInfo.name || '',
        jobPosition: '',
        phone: '',
        email: res.sessionInfo.username || '',
        password: '',
        confirmPassword: '',
        agreedToTerms: true,
      };

      setIsLoggedIn(true);
      setAuthFormData(nextUser);
      setUser(nextUser);

      return true;
    } catch (error) {
            console.log('the res down: ',error);
      clearAuthState();
      return false;
    }
  }, [getSessionInfo, clearAuthState]);

  const verifySessionSafe = useCallback(
    async (force = false) => {
      const now = Date.now();

      if (!force && now - lastVerifyAtRef.current < 1500) {
        return;
      }

      if (checkingSessionRef.current) {
        return;
      }

      checkingSessionRef.current = true;
      lastVerifyAtRef.current = now;

      try {
        if(currentView === 'gallery' &&
          path !== '/signup' &&
          path !== '/login'){
          await verifySession();
        }
      } finally {
        checkingSessionRef.current = false;
      }
    },
    [verifySession, currentView]
  );

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const bootstrapSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sid');

      if (!sessionId) {
        await verifySessionSafe(true);
        return;
      }

      console.log('Received session_id from SSO:', sessionId);

      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        const { data } = await api.get(`https://sso.snabbb.com/api/redirect?sid=${sessionId}`);

        console.log('the data cookie check response:', data);

        if (data?.ok) {
          await verifySessionSafe(true);
        } else {
          clearAuthState();
          window.location.href = '/login';
        }
      } catch (error) {
        clearAuthState();
        window.location.href = '/login';
      }
    };

    bootstrapSession();
  }, [verifySessionSafe, clearAuthState]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      if (event.data?.type === 'SSO_LOGOUT') {
        console.log('Received SSO logout message from:', event.origin);
        clearAuthState();
      }

      if (event.data?.type === 'SSO_LOGIN') {
        console.log('Received SSO login message from:', event.origin);
        await verifySessionSafe(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [verifySessionSafe, clearAuthState]);

  useEffect(() => {
    const onFocus = () => {
      verifySessionSafe();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifySessionSafe();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [verifySessionSafe]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    

    if (path === '/signup' && !verifySession()) {
      setAuthMode('signup');
      setCurrentView('auth');
    }

    if (path === '/login' && !verifySession()) {
      setAuthMode('login');
      setCurrentView('auth');
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredApps = useMemo(() => {
    return MINI_APPS.filter((app: MiniApp) => {
      const categoryMatch = activeCategory === 'All' || app.category.trim() === activeCategory.trim();
      const searchMatch =
        !searchQuery.trim() || app.title.toLowerCase().includes(searchQuery.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [activeCategory, searchQuery]);

  const handleSuccessfulAuth = () => {
    const s = getAuthUser();

    if (!s) {
      clearAuthState();
      return;
    }

    const nextUser: AuthFormData = {
      fullName: s.name || '',
      jobPosition: '',
      phone: '',
      email: s.username || '',
      password: '',
      confirmPassword: '',
      agreedToTerms: true,
    };

    setIsLoggedIn(true);
    setAuthFormData(nextUser);
    setUser(nextUser);
    setCurrentView('gallery');
    setPreviousView(null);
  };

  const navigateTo = (view: View) => {
    setPreviousView(currentView);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthState();
      window.location.href = 'https://app.snabbb.com';
    }
  };

  const handleBack = () => {
    if (previousView) {
      setCurrentView(previousView);
      setPreviousView(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigateTo('gallery');
    }
  };

  const Navigation = () => (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
      <div className="w-full flex items-center justify-between py-5 px-4 sm:px-6">
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
          onClick={() => {
            window.history.pushState({}, '', '/');
            navigateTo('gallery');
            setActiveCategory('All');
          }}
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <i className="fa-solid fa-layer-group text-xs sm:text-lg"></i>
          </div>
          <span className="font-extrabold text-lg sm:text-2xl tracking-tighter text-slate-900">
            Snabbb.
            <span className="text-blue-600">io</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-8">
          {isLoggedIn === null ? (
            <div className="w-24 h-11 bg-gray-200 rounded-xl animate-pulse"></div>
          ) : isLoggedIn ? (
            <div className="relative" ref={profileMenuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="block relative"
              >
                <div
                  className={`w-11 h-11 sm:w-11 sm:h-11 rounded-full shadow-md flex items-center justify-center ${avatarBgColor} text-white font-black text-sm sm:text-base hover:border-blue-500/30 transition-all`}
                >
                  {userInitial}
                </div>
              </motion.button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.12)] overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                        Profile Info
                      </p>

                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-base font-bold text-slate-900 truncate leading-tight">
                            {authFormData?.fullName}
                          </p>

                          {authFormData?.jobPosition && (
                            <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-100/50">
                              {authFormData.jobPosition}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-500">
                            <i className="fa-regular fa-envelope text-[10px] w-3 text-center"></i>
                            <p className="text-xs font-semibold truncate">{authFormData?.email}</p>
                          </div>

                          {authFormData?.phone && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <i className="fa-solid fa-phone text-[10px] w-3 text-center"></i>
                              <p className="text-xs font-semibold truncate">{authFormData?.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group text-left"
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket w-5"></i>
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/login');
                  setAuthMode('login');
                  navigateTo('auth');
                }}
                className={`px-3 sm:px-4 py-2 font-bold text-xs sm:text-base transition-colors ${
                  currentView === 'auth' && authMode === 'login'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log In
              </button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  window.history.pushState({}, '', '/signup');
                  setAuthMode('signup');
                  navigateTo('auth');
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Sign Up
              </motion.button>
            </>
          )}
        </div>
      </div>
    </header>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {currentView === 'auth' && !isLoggedIn && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AuthPage
                authMode={authMode}
                setCurrentView={setCurrentView}
                onAuthSuccess={handleSuccessfulAuth}
                setLoggedInUser={setLoggedInUser}
                setFormData={setAuthFormData}
              />
            </motion.div>
          )}

          {currentView === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PrivacyPage onBack={previousView === 'auth' ? handleBack : undefined} />
            </motion.div>
          )}

          {currentView === 'terms' && (
            <motion.div key="terms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TermsPage onBack={previousView === 'auth' ? handleBack : undefined} />
            </motion.div>
          )}

          {currentView === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-6 pb-24"
            >
              <section className="pt-12 sm:pt-20 pb-12 text-center flex flex-col items-center border-b border-slate-100/50 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-tight max-w-4xl">
                    Snabbb.
                    <span className="text-blue-600">io</span>
                  </h1>

                  <p className="text-slate-600 text-lg md:text-xl font-light max-w-3xl mx-auto leading-relaxed mb-12">
                    {isLoggedIn
                      ? `Welcome back, ${user?.fullName.split(' ')[0]}! Discover our premium collection.`
                      : 'Explore a curated universe of mini-apps designed to streamline your daily tasks.'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="w-full max-w-2xl relative px-4"
                >
                  <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-7 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                      type="text"
                      placeholder="Search for tools..."
                      className="w-full bg-white border border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-500/50 transition-all text-base md:text-lg font-medium placeholder:text-slate-400 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </motion.div>
              </section>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-1 pt-6">
                <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-3 pt-1 sm:pb-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 border ${
                        activeCategory === cat
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                          : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:bg-slate-50 shadow-sm'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="text-slate-400 text-xs sm:text-sm font-bold whitespace-nowrap bg-slate-100/50 px-4 py-2 rounded-full mb-3 sm:mb-0">
                  Showing <span className="text-slate-900 font-extrabold">{filteredApps.length}</span> apps
                </div>
              </div>

              <div className="mt-12">
                {activeCategory === 'All' ? (
                  ['Shops', 'Productivity', 'Value Added'].map((cat) => {
                    const appsInCategory = filteredApps.filter((app) => app.category === cat);
                    if (appsInCategory.length === 0) return null;

                    return (
                      <div key={cat} className="mb-12">
                        <div className="flex items-center gap-4 mb-8">
                          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{cat}</h2>
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-xs font-bold text-slate-300">{appsInCategory.length} apps</span>
                        </div>

                        <motion.div
                          layout
                          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 sm:gap-y-12 gap-x-4 sm:gap-x-8"
                        >
                          <AnimatePresence mode="popLayout">
                            {appsInCategory.map((app, index) => (
                              <AppCard isLoggedIn={isLoggedIn} key={app.id} app={app} index={index} />
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })
                ) : (
                  <motion.div
                    layout
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 sm:gap-y-12 gap-x-4 sm:gap-x-8"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredApps.map((app, index) => (
                        <AppCard isLoggedIn={isLoggedIn} key={app.id} app={app} index={index} />
                      ))}
                    </AnimatePresence>

                    {filteredApps.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="col-span-full py-32 flex flex-col items-center justify-center"
                      >
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-4">
                          <i className="fa-solid fa-search text-slate-300"></i>
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg mb-1">No results found</h3>
                        <p className="text-slate-400 text-sm">Try another category or search term.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentView !== 'auth' && (
          <footer className="max-w-7xl mx-auto px-6 mt-12 pb-12">
            <div className="py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-slate-400 text-sm font-bold">© 2026 Snabbb Apps Gallery.</p>

              <div className="flex gap-8">
                <button
                  onClick={() => navigateTo('privacy')}
                  className={`transition-colors text-xs font-black uppercase tracking-widest ${
                    currentView === 'privacy' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
                  }`}
                >
                  Privacy
                </button>

                <button
                  onClick={() => navigateTo('terms')}
                  className={`transition-colors text-xs font-black uppercase tracking-widest ${
                    currentView === 'terms' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
                  }`}
                >
                  Terms
                </button>
              </div>
            </div>
          </footer>
        )}
      </main>
    </motion.div>
  );
};

export default App;
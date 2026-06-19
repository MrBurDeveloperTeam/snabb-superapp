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
import { debounce } from 'lodash';
import type { MiniApp } from './types';
import type { AuthFormData } from './types/AuthFormData';
import CatMascot from './components/CatMascot';
import { MolarChat } from './components/MolarChat';
import type { ChatHistory } from './components/MolarChat';
import { VirtualPetContainer } from './VirtualPet/VirtualPetContainer';
import { chatWithGemini } from './services/geminiService';
import { fetchUserChatContext, buildUserContextString, type UserChatContext } from './services/userContextService';
import { supabase } from './services/supabaseClient';
import { SnabbbIcon } from './public/icons/SnabbbIcon';
import { toast, ToastContainer } from 'react-toastify';
import { AnnouncementBar } from "./components/AnnouncementBar";
import { useAnnouncementBarStore } from './store/announcementBarStore';
import DisclaimerPage from './components/DisclaimerPage';
import { Toaster } from "sonner";
import { plantMrBurCookie } from './services/plantCookies';
import SsoCheck from './components/SsoCheck';
import { useCreateAppLink } from './mutation/useCreateAppLink';
import { useGetUserId } from './mutation/useGetUserId';
import ProfileSettingsPage from './components/ProfileSettingsPage';

const initialFormData: AuthFormData = {
  fullName: '',
  jobPosition: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
  country: '',
  partner_id: 0,
};

const ALLOWED_ORIGINS = [
  'https://inventory.snabbb.com',
  'https://appointment.snabbb.com',
  'https://event.snabbb.com',
  'https://shop.snabbb.com',
  'https://app.snabbb.com',
];

const App: React.FC = () => {
  const authUser = getAuthUser();
  const [path, setPath] = useState(window.location.pathname);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [authFormData, setAuthFormData] = useState<AuthFormData>(initialFormData);
  const [user, setUser] = useState<AuthFormData | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<AuthFormData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVirtualPetOpen, setIsVirtualPetOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userChatContext, setUserChatContext] = useState<string>('');
  const setConfig = useAnnouncementBarStore((s) => s.setConfig);
  const [isToastBackdropOpen, setIsToastBackdropOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const checkingSessionRef = useRef(false);
  const lastVerifyAtRef = useRef(0);
  const handleClearChat = () => setChatHistory([]);
  const [badgeText, setBadgeText] = useState("Ask Me");
  const { mutateAsync: createAppLink, isPending } = useGetUserId();
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  

useEffect(() => {
  const partnerId = authFormData?.partner_id // or however you store partner_id after login
  if (!partnerId) return

  fetch(`https://app.snabbb.com/api/wallet?partner_id=${partnerId}`, {
    credentials: 'include',
  })
    .then(r => r.json())
    .then(data => setCreditBalance(data?.data?.balance ?? null))
    .catch(() => setCreditBalance(null))
}, [authFormData?.partner_id])

  useEffect(() => {
    const texts = !isLoggedIn 
      ? ['Log In', 'Get Started']
      : ['Ask Me', 'Try Me!', 'SNAI'];
      
    let i = 0;
    setBadgeText(texts[0]);

    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setBadgeText(texts[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const { mutateAsync: getSessionInfo } = useGetSessionInfo();

  const userName = authFormData?.fullName || 'Guest User';
  const userInitial = userName.charAt(0).toUpperCase();

  const isAuthRoute = path === '/login' || path === '/signup';
  const authMode: 'login' | 'signup' = path === '/signup' ? 'signup' : 'login';

  const navigate = useCallback((url: string) => {
    if (window.location.pathname !== url) {
      window.history.pushState({}, '', url);
    }
    setPath(url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", parts: [{ text: userMsg }] }]);
    setIsChatLoading(true);

    try {
      let response = null;

      // 1. Check custom responses first
      const { data: apps } = await supabase
        .from('aiboard_response_target_apps')
        .select('response_id')
        .in('app_name', ['App.Snabbb', 'All']);

      if (apps && apps.length > 0) {
        const responseIds = apps.map(a => a.response_id);
        const { data: keywords } = await supabase
          .from('aiboard_response_keywords')
          .select('keyword, response_id')
          .in('response_id', responseIds);

        if (keywords && keywords.length > 0) {
          const matchedKeyword = keywords.find(k => userMsg.toLowerCase().includes(k.keyword.toLowerCase()));

          if (matchedKeyword) {
            const { data: respData } = await supabase
              .from('aiboard_responses')
              .select('response')
              .eq('id', matchedKeyword.response_id)
              .single();

            if (respData) {
              response = respData.response;
            }
          }
        }
      }

      // 2. Fallback to Gemini
      if (!response) {
        response = await chatWithGemini(
          chatHistory,
          userMsg,
          "SuperApp Gallery context.",
          "",
          "",
          userChatContext || undefined,
        );
      }
      
      setChatHistory((prev) => [...prev, { role: "model", parts: [{ text: response as string }] }]);
    } catch (error) {
      console.error(error);
      setChatHistory((prev) => [...prev, { role: "model", parts: [{ text: "SNAI Error: Unable to process request." }] }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

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
    setUserChatContext('');
  }, []);

    const verifySession = useCallback(async () => {
    if (user && (user as any).isSimulated) return true;

    try {
      const res = (await getSessionInfo()) as any;

      if (!res?.sessionInfo) {
        if (user && (user as any).isSimulated) return true;
        clearAuthState();
        return false;
      }


      console.log('res.sessionInfo:', res);
      const nextUser: AuthFormData = {
        fullName: res.sessionInfo.name || '',
        jobPosition: '',
        phone: '',
        email: res.sessionInfo.username || '',
        password: '',
        confirmPassword: '',
        country: '',
        agreedToTerms: true,
        partner_id: res.sessionInfo.partner_id,
      };

      setIsLoggedIn(true);
      setAuthFormData(nextUser);
      setUser(nextUser);

      try {
        const partnerRes = await api.get(
          `/partner/profile?email=${encodeURIComponent(nextUser.email)}`
        );
        const profileComplete = partnerRes?.data?.profileComplete ?? false;
        setUser({ ...nextUser, profileComplete } as any);
      } catch (e) {
        console.warn("Failed to fetch partner profile:", e);
      }

     const COMPANY_SUBDOMAIN_MAP: Record<string, string> = {
        MMY: "my", MSG: "sg", MTH: "th", MIN: "id",
        MUSA: "us", MUK: "uk", MAU: "au", MVN: "vn",
        MPH: "ph", MKR: "kr", MCA: "ca", MAE: "ae",
        MSA: "sa", MNZ: "nz", MEU: "eu",
      };

      try {
        const raw = localStorage.getItem("odoo_session");
        if (raw) {
          const session = JSON.parse(raw);
          const companyCode = session?.company_code as string;
          const subdomain = COMPANY_SUBDOMAIN_MAP[companyCode];
          if (subdomain) {
            setConfig({
              linkIncomplete: `https://account.snabbb.com`,
              // linkIncomplete: `https://${subdomain}.mrbur.shop/my/account`,
            });
          }
        }
      } catch (e) {
        console.warn("Failed to parse odoo_session:", e);
      }
      

      // Fetch personalized context for Molar AI
      try {
        const ctx = await fetchUserChatContext(nextUser.email);
        setUserChatContext(buildUserContextString(ctx));
      } catch (e) {
        console.warn('[MolarAI] Context fetch failed:', e);
      }

      // localStorage.setItem("company_code", String(companyCode));
      // localStorage.setItem("company_id", String(firstCompanyId));

      return true;
    } catch (error) {
      clearAuthState();
      return false;
    }
  }, [getSessionInfo, clearAuthState]);

  const verifySessionSafe = useCallback(
    async (force = false) => {
      const now = Date.now();

      if (!force && now - lastVerifyAtRef.current < 1500) return;
      if (checkingSessionRef.current) return;

      checkingSessionRef.current = true;
      lastVerifyAtRef.current = now;

      try {
        if (!isAuthRoute) {
          await verifySession();
        }
      } finally {
        checkingSessionRef.current = false;
      }
    },
    [verifySession, isAuthRoute]
  );
  
  async function syncSessionToMrBur() {
    // Get the current session_id from Odoo
    const res = await fetch("https://app.snabbb.com/api/web/session/get_session_info", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
    });

    const data = await res.json();
    const sid = data?.result?.session_id;  // Odoo includes this in session_info

    if (sid) {
      await plantMrBurCookie(sid);
    }
  }

  // Debounced session check
  const verifySessionDebounced = useCallback(
    debounce(async () => {
      await verifySessionSafe();
    }, 1000), [verifySessionSafe]);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    syncSessionToMrBur();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

      window.history.replaceState({}, document.title, window.location.pathname);
      setPath(window.location.pathname);

      try {
        const { data } = await api.get(`https://sso.snabbb.com/api/redirect?sid=${sessionId}`);

        if (data?.ok) {
          await verifySessionSafe(true);
        } else {
          clearAuthState();
          navigate('/login');
        }
      } catch (error) {
        clearAuthState();
        navigate('/login');
      }
    };

    bootstrapSession();
  }, [verifySessionSafe, clearAuthState, navigate]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      if (event.data?.type === 'SSO_LOGOUT') {
        clearAuthState();
      }

      if (event.data?.type === 'SSO_LOGIN') {
        await verifySessionSafe(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [verifySessionSafe, clearAuthState]);

  useEffect(() => {
    const onFocus = () => {
      verifySessionDebounced();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifySessionDebounced();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [verifySessionDebounced]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const run = async () => {
      const loggedIn = await verifySession();

      if (path === '/login' || path === '/signup') {
        if (loggedIn) {
          window.history.replaceState({}, '', '/');
          setPath('/'); 
        } else {
          setIsLoggedIn(false);
        }
      }
    };

    run();
  }, [path, verifySession]);

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
      country: '',
      partner_id: null
    };

    setIsLoggedIn(true);
    setAuthFormData(nextUser);
    setUser(nextUser);
    navigate('/');
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

  const toastMessage = useCallback(
    (msg: string, options: { type: 'success' | 'error' }) => {
      toast.dismiss();
      setIsToastBackdropOpen(true);

      const toastOptions = {
        toastId: 'center-toast',
        onClose: () => setIsToastBackdropOpen(false),
      };

      if (options.type === 'success') {
        toast.success(msg, toastOptions);
      } else {
        toast.error(msg, toastOptions);
      }
    },
    []
  );

  if(path === '/sso/check') {
    return <SsoCheck />;
  }

  return (
    <>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#fef2f2",
          color: "#b91c1c",
          border: "1px solid #fca5a5",
        },
      }}
    />
    <AnnouncementBar
        isLoggedIn={!!user}
        profileComplete={(user as any)?.profileComplete}
      />
    {isToastBackdropOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[1px]"
          onClick={() => {
            toast.dismiss('center-toast');
            setIsToastBackdropOpen(false);
          }}
        />
      )}

      <ToastContainer
        position="top-center"
        hideProgressBar={true}
        autoClose={false}
        closeOnClick={false}
        pauseOnHover
        draggable={false}
        style={{
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
          width: 'auto',
          maxWidth: '90vw',
          background: 'transparent',
          zIndex: 9999,
        }}
        toastStyle={{
          width: 'fit-content',
          minWidth: '320px',
          maxWidth: '90vw',
          padding: "1.7rem",
        }}
      />
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
        <div className="w-full flex items-center justify-between py-5 px-4 sm:px-6">
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer text-left"
            onClick={(event) => {
              event.stopPropagation();
              navigate('/');
              setActiveCategory('All');
              setSearchQuery('');
            }}
            aria-label="Return to Snabbb.io gallery"
          >
            <span className="font-extrabold text-lg sm:text-2xl tracking-tighter text-slate-900">
              <span style={{ transform: 'skewX(353deg)', display: 'inline-block' }}>App.</span>
              <SnabbbIcon />
            </span>
          </button>

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
                    {/* Profile Info */}
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
                        
                    {/* Nav Items */}
                    <div className="p-2 border-b border-slate-100">
                      {/* Snabbb Credit */}
                      <button
                        // onClick={() => router.push('/wallet')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                      >
                        <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-wallet text-[11px] text-violet-500"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">Snabbb Credit</p>
                          <p className="text-[11px] font-semibold text-slate-400 truncate">
                            {creditBalance !== null ? `${creditBalance} credits` : 'Loading...'}
                          </p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                      </button>
                        
                      {/* My Channel */}
                      <button
                        onClick={async () => {
                          const res = await createAppLink({
                            app: 'e-learning',
                            email: authUser?.username,
                            name: authUser?.name,
                          });
                          
                          const supabaseUserId = res.result?.supabase_user_id;
                          const w = window.open('', '_blank');
                          if (supabaseUserId && w) {
                            w.location.href = `https://e-learning.snabbb.com/channel/${supabaseUserId}`;
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                      >
                        <div className="w-7 h-7 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-tv text-[11px] text-sky-500"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">My Channel</p>
                          <p className="text-[11px] font-semibold text-slate-400 truncate">Manage your channel</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                      </button>
                        
                      {/* Settings */}
                      <button
                        onClick={() => navigate('/profile-settings')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                      >
                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-gear text-[11px] text-slate-500"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 leading-tight">Settings</p>
                          <p className="text-[11px] font-semibold text-slate-400 truncate">Account & preferences</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                      </button>
                    </div>
                        
                    {/* Log Out */}
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
                  onClick={() => navigate('/login')}
                  className={`px-3 sm:px-4 py-2 font-bold text-xs sm:text-base transition-colors ${
                    path === '/login' ? 'text-tiffany-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Log In
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/signup')}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-tiffany-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-tiffany-600/20 hover:bg-tiffany-700 transition-all"
                >
                  Sign Up
                </motion.button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        <div className={isAuthRoute || isVirtualPetOpen ? 'hidden' : 'contents'}>
          <CatMascot
            onCatClick={() => setIsVirtualPetOpen(true)}
            disabled={!isLoggedIn}
            isHidden={isAuthRoute || isVirtualPetOpen}
          />
        </div>
        
        <MolarChat
          isOpen={isChatOpen && !isVirtualPetOpen}
          onClose={() => setIsChatOpen(false)}
          chatHistory={chatHistory}
          isChatLoading={isChatLoading}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          chatEndRef={chatEndRef}
          onPetToggle={() => setIsVirtualPetOpen(true)}
        />
        
        <VirtualPetContainer isOpen={isVirtualPetOpen} onClose={() => setIsVirtualPetOpen(false)} />

        {!isChatOpen && (
          <div className={isAuthRoute || isVirtualPetOpen ? 'hidden' : 'contents'}>
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-center group">
               <div className="relative flex items-center justify-center">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
                     <AnimatePresence mode="wait">
                        <motion.div
                          key={badgeText}
                          initial={{ opacity: 0, y: 5, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.9 }}
                          className="bg-white text-emerald-500 text-[12px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                        >
                          {badgeText}
                        </motion.div>
                     </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    disabled={!isLoggedIn}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all relative overflow-hidden ${!isLoggedIn ? 'bg-slate-300 grayscale cursor-not-allowed opacity-70 shadow-none' : 'bg-[#1F7A6F] hover:scale-105 hover:shadow-xl shadow-[#1F7A6F]/30'}`}
                  >
                    <img src="/icons/ai_logo.png" alt="Molar AI" className={`w-10 h-10 object-contain drop-shadow-sm transition-transform ${!isLoggedIn ? 'brightness-80' : ''}`} />
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* <AnimatePresence mode="wait" initial={false}> */}
          {isAuthRoute && (
            <AuthPage
              authMode={authMode}
              setCurrentView={setPath}
              onAuthSuccess={handleSuccessfulAuth}
              setLoggedInUser={setLoggedInUser}
              setFormData={setAuthFormData}
              setToastMsg={toastMessage}
            />
          )}
          {path === '/profile-settings' && (
            <motion.div key="profile-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileSettingsPage />
            </motion.div>
          )}

          {path === '/privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PrivacyPage />
            </motion.div>
          )}

          {path === '/terms' && (
            <motion.div key="terms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TermsPage />
            </motion.div>
          )}

          {path === '/disclaimer' && (
            <motion.div key="disclaimer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DisclaimerPage />
            </motion.div>
          )}

          {path === '/' && (
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
                  <span className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-tight max-w-4xl">
                    <h1 style={{transform: 'skewX(353deg)', display: 'inline-block'}}>App.</h1>
                    <SnabbbIcon />
                  </span>

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
                          ? 'bg-tiffany-600 text-white border-tiffany-600 shadow-md shadow-tiffany-600/30'
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
        {/* </AnimatePresence> */}

        {!isAuthRoute && (
          <footer className="max-w-7xl mx-auto px-6 mt-12 pb-12">
            <div className="py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-slate-400 text-sm font-bold">© 2026 Snabbb Apps Gallery.</p>

              <div className="flex gap-8">
                <button
                  onClick={() => navigate('/privacy')}
                  className={`transition-colors text-xs font-black uppercase tracking-widest ${
                    path === '/privacy' ? 'text-tiffany-600' : 'text-slate-400 hover:text-tiffany-600'
                  }`}
                >
                  Privacy
                </button>

                <button
                  onClick={() => navigate('/terms')}
                  className={`transition-colors text-xs font-black uppercase tracking-widest ${
                    path === '/terms' ? 'text-tiffany-600' : 'text-slate-400 hover:text-tiffany-600'
                  }`}
                >
                  Terms
                </button>

                <button
                  onClick={() => navigate('/disclaimer')}
                  className={`transition-colors text-xs font-black uppercase tracking-widest ${
                    path === '/disclaimer' ? 'text-tiffany-600' : 'text-slate-400 hover:text-tiffany-600'
                  }`}
                >
                  Disclaimer
                </button>
              </div>
            </div>
          </footer>
        )}
      </main>
    </motion.div>
    </>
  );
};

export default App;

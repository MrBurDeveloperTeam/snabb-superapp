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
import { fetchUserChatContext, buildUserContextString } from './services/userContextService';
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
import { getActiveCompanyFromOdooSession } from './services/getCompanies';
import { loadUserProfile } from './services/loadProfile';
import { getWebsiteCodeForCountry } from './services/authOdoo';
import ProfileSettingsPage from './components/ProfileSettingsPage';
import { useProfileImage } from './hooks/useProfileImage';
import ThemeToggle from './components/ThemeToggle';
import { useThemeStore } from './store/themeStore';
import LoadingOverlay from './components/LoadingOverlay';
import UserManagementPage from './subuser/components/UserManagementPage';
import CompanyMemberSignupPage from './subuser/components/CompanyMemberSignupPage';
import TutorialLibraryPage from './tutorial-Video/TutorialLibraryPage';
import TutorialWatchPage from './tutorial-Video/TutorialWatchPage';
import { BookOpenText } from 'lucide-react';

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

type PendingSignupInvite = {
  invitation: string;
  tags: string;
};

type ResolveInviteResponse = {
  ok: boolean;
  invite_code?: string;
  tags?: string[];
  error?: string;
  message?: string;
};

const PENDING_SIGNUP_INVITE_KEY =
  'snabbb_pending_signup_invite';

const readStoredSignupInvite =
  (): PendingSignupInvite | null => {
    try {
      const raw = sessionStorage.getItem(
        PENDING_SIGNUP_INVITE_KEY
      );

      if (!raw) return null;

      const parsed = JSON.parse(
        raw
      ) as Partial<PendingSignupInvite>;

      const invitation = String(
        parsed.invitation || ''
      ).trim();

      if (!invitation) return null;

      return {
        invitation,
        tags: String(parsed.tags || '').trim(),
      };
    } catch {
      return null;
    }
  };

const readSignupInviteFromUrl =
  (): PendingSignupInvite | null => {
    const params = new URLSearchParams(
      window.location.search
    );

    const invitation = (
      params.get('invitation') || ''
    ).trim();

    if (!invitation) return null;

    return {
      invitation,
      tags: (
        params.get('tags') || ''
      ).trim(),
    };
  };

const App: React.FC = () => {
  const { 
    mutateAsync: createAppLinks,
  } = useCreateAppLink();
  const authUser = getAuthUser();
  const [path, setPath] = useState(window.location.pathname);
  const [
    pendingSignupInvite,
    setPendingSignupInvite,
  ] = useState<PendingSignupInvite | null>(
    () =>
      readSignupInviteFromUrl() ||
      readStoredSignupInvite()
  );
  const [
    isResolvingInvite,
    setIsResolvingInvite,
  ] = useState(
    () =>
      /^\/r\/[^/]+\/?$/.test(
        window.location.pathname
      )
  );

  const [
    inviteResolveError,
    setInviteResolveError,
  ] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isOpeningSupportTickets, setIsOpeningSupportTickets] = useState(false);
  const [authFormData, setAuthFormData] = useState<AuthFormData>(initialFormData);
  const [user, setUser] = useState<AuthFormData | null>(null);
  const [, setLoggedInUser] = useState<AuthFormData | null>(null);
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [isCheckingAccountType, setIsCheckingAccountType] = useState(false);
  // const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const { profileImageUrl } = useProfileImage(isLoggedIn);
  const isCompanyAccount = accountType === 'company';

  useEffect(() => {
    let cancelled = false;

    const loadAccountType = async () => {
      if (!isLoggedIn) {
        setAccountType(null);
        setIsCheckingAccountType(false);
        return;
      }

      setIsCheckingAccountType(true);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) {
          if (!cancelled) setAccountType(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!cancelled) setAccountType(profile?.account_type ?? null);
      } catch (error) {
        console.warn('[User Management] Failed to load account type:', error);
        if (!cancelled) setAccountType(null);
      } finally {
        if (!cancelled) setIsCheckingAccountType(false);
      }
    };

    loadAccountType();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

useEffect(() => {
  const partnerId = authFormData?.partner_id // or however you store partner_id after login
  if (!partnerId) return

  // The /api/wallet Cloudflare Worker proxy forwards query params straight
  // to Odoo's /snabbb/reward/api/wallet/my, and picks which per-company
  // wallet to return using `website_scope` / `website_domain` — defaulting
  // to "MMY" whenever neither is present.
  //
  // company_codes (from getActiveCompanyFromOdooSession) is keyed by
  // company_id, and most countries (US, UK, AU, CA, SA, NZ, KR, AE, VN, PH,
  // JP) share ONE company ("MR. BUR (M) SDN. BHD.", id 2) whose code is
  // always "MMY" — so company-based resolution can never tell those
  // countries apart and silently defaults everyone to Malaysia.
  //
  // res.partner.country_id, on the other hand, IS reliably set per-user at
  // signup regardless of the company/website mixup (confirmed via
  // GET https://account.snabbb.com/api/account/profile — country_id comes
  // back correct even for users whose wallet was defaulting to MMY). So
  // resolve website_scope from the account profile's country first, and
  // only fall back to the company-code path for countries with their own
  // dedicated company (Singapore, Indonesia, Thailand) where that already
  // works correctly today.
  (async () => {
    const params = new URLSearchParams({ partner_id: String(partnerId) });
    if (authFormData?.email) params.set('email', authFormData.email);

    let websiteCode: string | undefined;
    try {
      const profile = await loadUserProfile();
      const countryName = profile?.partner?.country_id?.[1];
      websiteCode = getWebsiteCodeForCountry(countryName);
    } catch (e) {
      console.warn('[Wallet] Failed to load account profile for country resolution:', e);
    }

    if (!websiteCode) {
      const company = getActiveCompanyFromOdooSession();
      websiteCode = company?.companyCode;
    }

    if (websiteCode) {
      params.set('website_scope', websiteCode);
      params.set('website_domain', websiteCode);
    }

    fetch(`https://app.snabbb.com/api/wallet?${params.toString()}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => setCreditBalance(data?.data?.balance ?? null))
      .catch(() => setCreditBalance(null))
  })();
}, [authFormData?.partner_id, authFormData?.email])

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

  const shortInviteMatch =
    path.match(/^\/r\/([^/]+)\/?$/);

  const isShortInviteRoute =
    Boolean(shortInviteMatch);

  const isAuthRoute =
    path === '/login' ||
    path === '/signup' ||
    isShortInviteRoute;

  const authMode: 'login' | 'signup' =
    path === '/signup' || isShortInviteRoute
      ? 'signup'
      : 'login';

  const isInviteSignup =
    authMode === 'signup' &&
    (
      isShortInviteRoute ||
      Boolean(pendingSignupInvite)
    );
  const isCompanyMemberSignup =
    path === '/company-member-signup' ||
    /^\/invite\/[^/]+\/?$/.test(path);  const isStandaloneSignup = isInviteSignup || isCompanyMemberSignup;

  const tutorialVideoMatch = path.match(/^\/tutorial-video\/([^/]+)\/?$/);
  const isTutorialRoute = path === '/tutorial-video' || Boolean(tutorialVideoMatch);

  useEffect(() => {
    let cancelled = false;

    const resolveInvite = async () => {
      const match =
        path.match(/^\/r\/([^/]+)\/?$/);

      if (!match) {
        const directInvite =
          readSignupInviteFromUrl();

        if (directInvite) {
          sessionStorage.setItem(
            PENDING_SIGNUP_INVITE_KEY,
            JSON.stringify(directInvite)
          );

          setPendingSignupInvite(
            directInvite
          );
        }

        setInviteResolveError('');
        setIsResolvingInvite(false);
        return;
      }

      let shortCode = match[1];

      try {
        shortCode =
          decodeURIComponent(shortCode);
      } catch {
        // Keep the original value.
      }

      shortCode =
        shortCode.trim().toLowerCase();

      setIsResolvingInvite(true);
      setInviteResolveError('');

      try {
        const response = await fetch(
          `https://mrbur.odoo.com/api/snabbb/invite/resolve/${
            encodeURIComponent(shortCode)
          }`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          }
        );

        const responseText = await response.text();

        let result: ResolveInviteResponse;

        try {
          result = JSON.parse(
            responseText
          ) as ResolveInviteResponse;
        } catch {
          throw new Error(
            'Invite resolver returned an invalid response.'
          );
        }

        const invitation =
          result?.invite_code?.trim() || '';

        if (
          !response.ok ||
          !result?.ok ||
          !invitation
        ) {
          throw new Error(
            result?.message ||
            result?.error ||
            'Unable to resolve invite link.'
          );
        }

        const tags = Array.isArray(
          result.tags
        )
          ? result.tags
              .filter(
                (tag): tag is string =>
                  typeof tag === 'string' &&
                  Boolean(tag.trim())
              )
              .map((tag) => tag.trim())
              .join(',')
          : '';

        const invite: PendingSignupInvite = {
          invitation,
          tags,
        };

        if (cancelled) return;

        sessionStorage.setItem(
          PENDING_SIGNUP_INVITE_KEY,
          JSON.stringify(invite)
        );

        setPendingSignupInvite(invite);

        window.history.replaceState(
          {},
          '',
          '/signup'
        );

        setPath('/signup');

        window.scrollTo({
          top: 0,
          behavior: 'auto',
        });
      } catch (error: any) {
        if (cancelled) return;

        sessionStorage.removeItem(
          PENDING_SIGNUP_INVITE_KEY
        );

        setPendingSignupInvite(null);

        setInviteResolveError(
          error?.message ||
          'Unable to open this invite link.'
        );
      } finally {
        if (!cancelled) {
          setIsResolvingInvite(false);
        }
      }
    };

    resolveInvite();

    return () => {
      cancelled = true;
    };
  }, [path]);

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

  const openSupportTickets = useCallback(async () => {
    if (isOpeningSupportTickets) return;

    setIsProfileMenuOpen(false);
    setIsOpeningSupportTickets(true);

    try {
      const { data } = await api.post('/ticketing/sso');
      // const data = await data.json().catch(() => null);

      if (!data?.redirectUrl) {
        throw new Error(data?.error || 'Unable to open the support portal.');
      }

      window.location.assign(data.redirectUrl);
    } catch (error) {
      console.error('Ticketing SSO failed:', error);
      setIsOpeningSupportTickets(false);
    }
  }, [isOpeningSupportTickets]);

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
              linkIncomplete: `https://app.snabbb.com/profile-settings`,
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
      if (!user?.email) return;

      const syncedKey = `snabbb_sso_synced_${user.email}`;

      if (sessionStorage.getItem(syncedKey)) return;

      sessionStorage.setItem(syncedKey, 'true');
      syncmrbursso();
    }, [user?.email]);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    syncSessionToMrBur();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ─── Theme sync from Odoo ─────────────────────────────────────────────────
  // Fetches the user's saved theme from Odoo and applies it locally.
  // Called after login and on session bootstrap so cross-device theme is correct.
  const setTheme = useThemeStore((s) => s.setTheme);

  const syncThemeFromOdoo = async () => {
    try {
      const res = await fetch('/api/user/theme', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok && data?.authenticated && data?.theme) {
        const valid = new Set(['light', 'dark', 'system']);
        if (valid.has(data.theme)) {
          setTheme(data.theme); // updates Zustand + writes cookie
        }
      }
    } catch {
      // Odoo unreachable — keep current theme

    }
  }

  const hydrateSupabaseSession = useCallback(async () => {
    try {
      const { data: existing } = await supabase.auth.getSession();
      
      if (existing?.session) return; // already have a Supabase session
      
      // Bridge the shared Snabbb SSO cookie into a real Supabase Auth session,
      // so VirtualPet (and anything else using supabase.auth) sees the same
      // logged-in user as the other Snabbb apps.
      const sso = await api.get('/sso/exchange');
      if (sso?.data?.access_token && sso?.data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: sso.data.access_token,
          refresh_token: sso.data.refresh_token,
        });
      }
    } catch (err) {
      // Non-fatal: the Odoo-based login flow below doesn't depend on this.
      console.warn('[SSO] Supabase session hydrate failed:', err);
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const bootstrapSession = async () => {
      // If we just landed here fresh off completing a login's SSO handshake,
      // force one real browser reload so the whole page — not just this
      // mount — reflects the newly-established session. The marker is
      // cleared immediately so this can only ever fire once per login.
      if (sessionStorage.getItem('snabbb_just_logged_in')) {
        sessionStorage.removeItem('snabbb_just_logged_in');
        window.location.reload();
        return;
      }

      await hydrateSupabaseSession();

      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sid');

      if (!sessionId) {
        await verifySessionSafe(true);
        // Sync theme from Odoo after session is confirmed on page load
        syncThemeFromOdoo();
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      setPath(window.location.pathname);

      try {
        const { data } = await api.get(`https://sso.snabbb.com/api/redirect?sid=${sessionId}`);

        if (data?.ok) {
          await verifySessionSafe(true);
          syncThemeFromOdoo();
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
  }, [verifySessionSafe, clearAuthState, navigate, hydrateSupabaseSession]);

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

  const syncmrbursso = async () => {
    if (!user?.email) return;
    try {
      const resurl = await createAppLinks({
        app: 'snabbb',
        email: user.email,
        name: user.fullName,
      });
      console.log("check url: ", resurl);
      if (resurl?.result?.url) {
        window.location.href = resurl.result.url;
      }
    } catch (e) {
      console.error('Failed to sync mrbur SSO:', e);
    }
  }

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

      if (isAuthRoute) {
        if (loggedIn) {
          window.history.replaceState(
            {},
            '',
            '/'
          );

          setPath('/');
        } else {
          setIsLoggedIn(false);
        }
      }
    };

    run();
  }, [path, isAuthRoute, verifySession]);

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
      partner_id: 0
    };

    setIsLoggedIn(true);
    setAuthFormData(nextUser);
    setUser(nextUser);
    navigate('/');

    // Fetch the user's saved theme from Odoo and apply it.
    // Runs after login so the correct cross-device theme is applied immediately.
    syncThemeFromOdoo();
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthState();
    window.location.href =
      "https://e-learning.snabbb.com/logout?next=https%3A%2F%2Fapp.snabbb.com";
    }
  };

  const toastMessage = useCallback(
    (msg: React.ReactNode, options: { type: 'success' | 'error'; hideIcon?: boolean }) => {
      toast.dismiss();
      setIsToastBackdropOpen(true);

      const toastOptions = {
        toastId: 'center-toast',
        onClose: () => setIsToastBackdropOpen(false),
        icon: options.hideIcon ? (false as const) : undefined,
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
    <LoadingOverlay
      isLoading={isPending || isResolvingInvite}
      message={
        isResolvingInvite
          ? 'Opening invite link...'
          : 'loading...'
      }
    />
    <Toaster
      position="top-right"
      richColors
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
      {!isStandaloneSignup && (
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
            <ThemeToggle />
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
                  {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-11 h-11 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <span className={`w-11 h-11 sm:w-11 sm:h-11 rounded-full shadow-md flex items-center justify-center ${avatarBgColor} text-white font-black text-sm sm:text-base hover:border-blue-500/30 transition-all`}>
                    {userInitial}
                  </span>
                )}
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
                            {userName}
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
                        onClick={async () => {
                          // Open the tab synchronously (before any await) so Safari's
                          // popup blocker doesn't treat it as an unrequested popup.
                          const w = window.open('', '_blank');
                          try {
                            const res = await createAppLink({
                              app: 'reward',
                              email: authUser?.username,
                              name: authUser?.name,
                            });

                            const supabaseUserId = res.result?.supabase_user_id;
                            if (supabaseUserId && w) {
                              w.location.href = `https://reward.snabbb.com`;
                            } else {
                              w?.close();
                            }
                          } catch (e: any) {
                            w?.close();
                            console.error('Failed to open Snabbb Credit:', e);
                            toast.error(e?.message || 'Could not open Snabbb Credit. Please try logging in again.');
                          }
                        }}
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
                          // Open the tab synchronously (before any await) so Safari's
                          // popup blocker doesn't treat it as an unrequested popup.
                          const w = window.open('', '_blank');
                          try {
                            const res = await createAppLink({
                              app: 'e-learning',
                              email: authUser?.username,
                              name: authUser?.name,
                            });

                            const supabaseUserId = res.result?.supabase_user_id;
                            if (supabaseUserId && w) {
                              w.location.href = `https://e-learning.snabbb.com/channel/${supabaseUserId}`;
                            } else {
                              w?.close();
                            }
                          } catch (e: any) {
                            w?.close();
                            console.error('Failed to open My Channel:', e);
                            toast.error(e?.message || 'Could not open My Channel. Please try logging in again.');
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
 
                      <button
                        type="button"
                        disabled={isOpeningSupportTickets}
                        onClick={openSupportTickets}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                          <i className="fa-solid fa-life-ring text-xs" aria-hidden="true"></i>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-slate-900 leading-tight">Support Tickets</span>
                          <span className="block text-[11px] font-semibold text-slate-500 truncate">Create and track your support tickets</span>
                        </span>
                        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-slate-500 transition-colors" aria-hidden="true"></i>
                      </button>

                      {isCompanyAccount && (
                        <button
                          onClick={() => {
                            navigate('/user-management');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                        >
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-users text-[11px] text-emerald-500"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight">User Management</p>
                            <p className="text-[11px] font-semibold text-slate-400 truncate">Manage company members</p>
                          </div>
                          <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-slate-400 transition-colors"></i>
                        </button>
                      )}

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
      )}

      <main className="flex-1 relative">
        {inviteResolveError && (
          <div className="min-h-[70vh] flex items-center justify-center px-6">
            <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-xl">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <i className="fa-solid fa-link-slash" />
              </div>

              <h1 className="text-2xl font-black text-slate-900">
                Invite link unavailable
              </h1>

              <p className="mt-3 text-sm font-medium text-slate-500">
                {inviteResolveError}
              </p>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(
                    PENDING_SIGNUP_INVITE_KEY
                  );

                  setPendingSignupInvite(null);
                  setInviteResolveError('');
                  navigate('/signup');
                }}
                className="mt-7 rounded-xl bg-tiffany-600 px-6 py-3 text-sm font-bold text-white hover:bg-tiffany-700"
              >
                Continue with regular signup
              </button>
            </div>
          </div>
        )}
        <div className={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen ? 'hidden' : 'contents'}>
          {/* key remounts CatMascot when auth changes → entry walk plays after login */}
          <CatMascot
            key={isLoggedIn ? 'logged-in' : 'guest'}
            onCatClick={() => setIsVirtualPetOpen(true)}
            disabled={!isLoggedIn}
            isHidden={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen}
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
          <div className={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen ? 'hidden' : 'contents'}>
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-center group">
               <motion.button
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 whileHover={{ scale: 1.04 }}
                 whileTap={{ scale: 0.97 }}
                 onClick={() => navigate('/tutorial-video')}
                 className="mb-5 flex items-center gap-2 rounded-full bg-tiffany-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-tiffany-500/30 hover:bg-tiffany-600"
                 aria-label="Open the Tutorial Library"
               >
                 <BookOpenText size={17} fill="currentColor" />
                 Tutorials
               </motion.button>
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
          {isAuthRoute &&
            !isResolvingInvite &&
            !inviteResolveError && (
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

          {path === '/user-management' && (
            <motion.div key="user-management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UserManagementPage
                isCompanyAccount={isCompanyAccount}
                isCheckingAccountType={isCheckingAccountType}
              />
            </motion.div>
          )}

          {isCompanyMemberSignup && (
            <CompanyMemberSignupPage
              onComplete={() => navigate('/login')}
              setToastMsg={toastMessage}
            />
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

          {path === '/tutorial-video' && (
            <motion.div key="tutorial-library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TutorialLibraryPage onNavigate={navigate} />
            </motion.div>
          )}

          {tutorialVideoMatch && (
            <motion.div key={`tutorial-${tutorialVideoMatch[1]}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TutorialWatchPage videoId={decodeURIComponent(tutorialVideoMatch[1])} onNavigate={navigate} />
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
                      ? `Welcome back, ${userName.split(' ')[0]}! Discover our premium collection.`
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
                          key={`grid-${cat}-${activeCategory}-${searchQuery.trim().toLowerCase()}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 sm:gap-y-12 gap-x-4 sm:gap-x-8"
                        >
                          {appsInCategory.map((app, index) => (
                            <AppCard isLoggedIn={isLoggedIn} key={app.id} app={app} index={index} />
                          ))}
                        </motion.div>
                      </div>
                    );
                  })
                ) : (
                  <motion.div
                    key={`grid-${activeCategory}-${searchQuery.trim().toLowerCase()}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-8 sm:gap-y-12 gap-x-4 sm:gap-x-8"
                  >
                    {filteredApps.map((app, index) => (
                      <AppCard isLoggedIn={isLoggedIn} key={app.id} app={app} index={index} />
                    ))}

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

        {!isAuthRoute && !isCompanyMemberSignup && !isTutorialRoute && (
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

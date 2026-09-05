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
import { SharedMolarAI } from '@mrburdeveloperteam/molar-experience/ai';
import type { MolarChatEmptyState } from '@mrburdeveloperteam/molar-experience/ai';
import { createAppGalleryMolarAdapter } from './aiExperience/appGalleryMolarAdapter';
import { MOLAR_LOGO_URL } from './aiExperience/molarExperienceAssets';
import AppGalleryVirtualPet from './petExperience/AppGalleryVirtualPet';
import MeowdokuLauncher from './petExperience/MeowdokuLauncher';
import { isPersonalizedPetDialogueEnabled } from './features/petDialogue/dialogueFlag';
import type { ProfileCompletionStatus } from './features/petDialogue/types';
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
  const [isVirtualPetOpen, setIsVirtualPetOpen] = useState(false);
  const [isMeowdokuOpen, setIsMeowdokuOpen] = useState(false);
  const [userChatContext, setUserChatContext] = useState<string>('');
  // Molar user-context ownership — see reconcileSupabaseIdentity/verifySession
  // below. `userChatContext` alone is not a safe signal that the fetched
  // context actually belongs to the CURRENT verified Odoo identity: on a
  // direct A -> B account switch, the old value can still be sitting in
  // this state while B's own fetch is in flight. `hasSafeMolarContext`
  // (computed below, near the Molar mount) is the only thing General Chat
  // is allowed to read.
  const [userChatContextStatus, setUserChatContextStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [userChatContextOwnerEmail, setUserChatContextOwnerEmail] = useState<string | null>(null);
  const userChatContextGenerationRef = useRef(0);
  // Tri-state canonical Shared Cat/Molar/Pet owner identity — see
  // reconcileSupabaseIdentity below. `undefined` = reconciliation still in
  // progress/not yet attempted (never guess); `null` = confirmed guest or a
  // definitive reconciliation failure; a string = the Supabase auth user id
  // confirmed (via /sso/exchange) to belong to the same account as the
  // currently Odoo-verified user.
  const [matchedSupabaseUserId, setMatchedSupabaseUserId] = useState<string | null | undefined>(undefined);
  const reconcileGenerationRef = useRef(0);
  // The last Odoo email a successful verifySession() actually applied —
  // used ONLY to detect a real identity change synchronously, so
  // matchedSupabaseUserId/userChatContext can be invalidated in the SAME
  // tick the new email is accepted, before any reconciliation await even
  // starts (closing the window where a slow reconcile/context fetch could
  // otherwise still publish/read the outgoing user's values). Routine
  // re-verification of the SAME email (focus/visibility/SSO_LOGIN checks)
  // must NOT flip this — see verifySession below.
  const lastVerifiedEmailRef = useRef<string | null>(null);
  const verifySessionGenerationRef = useRef(0);
  const [profileCompletionStatus, setProfileCompletionStatus] = useState<ProfileCompletionStatus>('unknown');
  // `undefined` collapsed to a 'guest' sentinel for components that only
  // need a stable cache/key identity (never cache/key under a guessed,
  // unconfirmed id) — the personalized-dialogue system itself continues to
  // read the raw tri-state `matchedSupabaseUserId` directly.
  const petCatOwnerId = matchedSupabaseUserId === undefined ? null : matchedSupabaseUserId;
  const isPetOwnerReconciling = isLoggedIn === true && matchedSupabaseUserId === undefined;
  const setConfig = useAnnouncementBarStore((s) => s.setConfig);
  const [isToastBackdropOpen, setIsToastBackdropOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const checkingSessionRef = useRef(false);
  const lastVerifyAtRef = useRef(0);
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

  // Molar General Chat context ownership gate — see the state declarations
  // above. Only General Chat may read `userChatContext`; it must never see
  // a value that wasn't actually fetched for the CURRENT verified Odoo
  // identity.
  const hasSafeMolarContext =
    typeof matchedSupabaseUserId === 'string' &&
    !!user?.email &&
    userChatContextStatus === 'ready' &&
    userChatContextOwnerEmail === user.email.trim().toLowerCase();

  const safeUserChatContext = hasSafeMolarContext ? userChatContext : '';

  const [molarEmptyState, setMolarEmptyState] = useState<MolarChatEmptyState>({});

  useEffect(() => {
    let cancelled = false;
    const fetchSimConfig = async () => {
      try {
        const { data: configs } = await supabase
          .from('aiboard_simulator_configs')
          .select('id, title, subtitle')
          .eq('module_name', 'App.Snabbb')
          .limit(1);

        if (configs && configs.length > 0) {
          const title = configs[0].title;
          const subtitle = configs[0].subtitle || undefined;

          const { data: promptData } = await supabase
            .from('aiboard_simulator_prompts')
            .select('text, icon_name, sort_order')
            .eq('config_id', configs[0].id)
            .order('sort_order', { ascending: true });

          const prompts = promptData && promptData.length > 0
            ? promptData.map((p) => ({ label: p.text, iconName: p.icon_name }))
            : undefined;

          if (!cancelled) setMolarEmptyState({ title, subtitle, prompts });
        }
      } catch (err) {
        console.error('Error fetching sim configs:', err);
      }
    };

    fetchSimConfig();
    return () => { cancelled = true; };
  }, []);

  const molarAdapter = useMemo(
    () => createAppGalleryMolarAdapter({ userChatContext: safeUserChatContext }),
    [safeUserChatContext]
  );

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
    setUserChatContextStatus('idle');
    setUserChatContextOwnerEmail(null);
    userChatContextGenerationRef.current += 1;
    setProfileCompletionStatus('unknown');
    // Bumping the reconcile generation invalidates any in-flight
    // reconcileSupabaseIdentity call so a late exchange response can never
    // apply after this logout (or log the user back in as the outgoing
    // account).
    reconcileGenerationRef.current += 1;
    // Same idea for verifySession: an intentional auth reset (logout, a
    // genuine session failure) must invalidate any verifySession call
    // already in flight, so it can't resolve afterward and resurrect stale
    // "logged in" state.
    verifySessionGenerationRef.current += 1;
    setMatchedSupabaseUserId(null);
    lastVerifiedEmailRef.current = null;
  }, []);

  // Cross-tab SSO_LOGOUT never calls the Odoo server logout endpoint again
  // (the tab that actually initiated logout already did that) and never
  // ran a local Supabase sign-out of its own — but Supabase's persisted
  // session lives in *this origin's* localStorage, which a different
  // origin's sign-out cannot reach. A receiving tab must still clear its
  // own local copy, best-effort, before resetting React state, so this
  // origin's Supabase session doesn't silently survive an otherwise-
  // complete logout.
  const clearLocalSessionOnReceivedLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[SSO_LOGOUT] Best-effort local Supabase sign-out failed:', err);
    }
    clearAuthState();
  }, [clearAuthState]);

    const verifySession = useCallback(async (): Promise<boolean | null> => {
    if (user && (user as any).isSimulated) return true;

    // Claim this invocation's generation before the only await that can
    // race (getSessionInfo()). If verifySessionGenerationRef has moved on
    // by the time that await resolves — a newer verifySession() call
    // started, or clearAuthState() ran (logout/explicit reset) — this
    // call's result is stale and must not be applied to auth state.
    const myGeneration = ++verifySessionGenerationRef.current;

    try {
      const res = (await getSessionInfo()) as any;

      if (myGeneration !== verifySessionGenerationRef.current) {
        return null;
      }

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

      // Synchronous identity-change invalidation — BEFORE any async
      // reconciliation/context fetch starts. A direct A -> B Odoo account
      // switch must never leave A's matchedSupabaseUserId/userChatContext
      // readable even for the brief window while B's own reconciliation/
      // fetch is in flight. Routine re-verification of the SAME email
      // (focus/visibility/SSO_LOGIN re-checks) intentionally does NOT hit
      // this branch, so it doesn't force a needless Cat/Pet/Molar remount.
      const normalizedNextEmail = nextUser.email.trim().toLowerCase();
      if (normalizedNextEmail !== lastVerifiedEmailRef.current) {
        lastVerifiedEmailRef.current = normalizedNextEmail;
        setMatchedSupabaseUserId(undefined);
        setUserChatContext('');
        setUserChatContextStatus('loading');
        setUserChatContextOwnerEmail(null);
        userChatContextGenerationRef.current += 1;
      }

      // Fire-and-forget: confirms/repairs the Supabase session for this
      // Odoo-verified identity before any personalized-dialogue provider is
      // allowed to run. Every verifySession() success reconciles again
      // (not just the first one) — this is what actually closes the
      // cross-tab/focus/visibility account-switch gap, not just one-time
      // bootstrap hydration.
      void reconcileSupabaseIdentity(nextUser.email);

      setProfileCompletionStatus('loading');
      try {
        const partnerRes = await api.get(
          `/partner/profile?email=${encodeURIComponent(nextUser.email)}`
        );
        if (myGeneration !== verifySessionGenerationRef.current) return null;
        const profileComplete = partnerRes?.data?.profileComplete ?? false;
        setUser({ ...nextUser, profileComplete } as any);
        setProfileCompletionStatus(profileComplete ? 'complete' : 'incomplete');
      } catch (e) {
        console.warn("Failed to fetch partner profile:", e);
        if (myGeneration === verifySessionGenerationRef.current) {
          setProfileCompletionStatus('unknown');
        }
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
      

      // Fetch personalized context for Molar AI — latest-request-wins,
      // gated by BOTH the userChatContext generation and the requested
      // owner email still matching by the time the fetch resolves (see
      // hasSafeMolarContext at the Molar mount site, which additionally
      // re-checks this at read time).
      {
        const myContextGeneration = ++userChatContextGenerationRef.current;
        try {
          const ctx = await fetchUserChatContext(nextUser.email);
          if (
            myContextGeneration === userChatContextGenerationRef.current &&
            myGeneration === verifySessionGenerationRef.current
          ) {
            setUserChatContext(buildUserContextString(ctx));
            setUserChatContextOwnerEmail(normalizedNextEmail);
            setUserChatContextStatus('ready');
          }
        } catch (e) {
          console.warn('[MolarAI] Context fetch failed:', e);
          if (myContextGeneration === userChatContextGenerationRef.current) {
            setUserChatContext('');
            setUserChatContextOwnerEmail(null);
            setUserChatContextStatus('error');
          }
        }
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

  // Confirms — and if necessary repairs — that the Supabase Auth session
  // belongs to the same account as `expectedEmail` (the just Odoo-verified
  // user). This is the sole gate personalized-dialogue providers and Shared
  // Pet key off (via matchedSupabaseUserId/petCatOwnerId) — it never runs
  // an Inventory/Todo/Appointment query itself.
  //
  // /sso/exchange is cookie-scoped to whichever Odoo session is currently
  // active server-side — calling it always returns tokens for *the
  // current* Odoo account, never a stale/cached one, so re-exchanging here
  // is safe to repeat on every Odoo re-verification.
  //
  // Single-flight: `reconcileGenerationRef` is bumped on every call
  // (including a logout, via clearAuthState); any earlier call's
  // continuation checks `isStaleReconcile()` before every state-setting
  // step, so a slower User A exchange can never overwrite a faster User B
  // result (or vice versa), and a logout mid-reconciliation can never let a
  // late exchange response log the user back in.
  //
  // Email is the mapping used because it's the only identity value present
  // in both systems today: the Odoo session-info response's `username`
  // field is already treated as email throughout this file, and Supabase's
  // own session always carries `session.user.email`.
  const reconcileSupabaseIdentity = useCallback(async (expectedEmail: string | null) => {
    const generation = ++reconcileGenerationRef.current;
    const isStaleReconcile = () => generation !== reconcileGenerationRef.current;

    if (!expectedEmail) {
      setMatchedSupabaseUserId(null);
      return;
    }

    const normalizedExpected = expectedEmail.trim().toLowerCase();
    if (!normalizedExpected) {
      setMatchedSupabaseUserId(null);
      return;
    }

    try {
      // Check whether the current Supabase session ALREADY matches the
      // expected account before ever flipping matchedSupabaseUserId to
      // `undefined` — this function runs on every successful
      // verifySession() (mount, every focus/visibility check, every
      // SSO_LOGIN broadcast), far more often than the identity actually
      // changes, so avoid needless Cat/Pet/Molar remount flicker for the
      // common "already correct" case. (The genuine-identity-change case
      // is additionally covered synchronously by verifySession's own
      // lastVerifiedEmailRef check, which fires before this function is
      // even called — this internal check here is a second, independent
      // layer, not the only one.)
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();
      if (isStaleReconcile()) return;

      const existingEmail = existingSession?.user?.email?.trim().toLowerCase() ?? null;

      if (existingSession && existingEmail === normalizedExpected) {
        setMatchedSupabaseUserId(existingSession.user.id);
        return;
      }

      setMatchedSupabaseUserId(undefined);

      if (existingSession) {
        // A stale cross-account session must be cleared before exchanging,
        // never layered under a new one.
        await supabase.auth.signOut();
        if (isStaleReconcile()) return;
      }

      const sso = await api.get('/sso/exchange');
      if (isStaleReconcile()) return;

      if (!sso?.data?.access_token || !sso?.data?.refresh_token) {
        console.warn('[SSO] identity reconciliation: exchange returned no tokens');
        setMatchedSupabaseUserId(null);
        return;
      }

      const { data: setResult, error: setSessionError } = await supabase.auth.setSession({
        access_token: sso.data.access_token,
        refresh_token: sso.data.refresh_token,
      });
      if (isStaleReconcile()) return;

      if (setSessionError || !setResult.session) {
        console.warn('[SSO] identity reconciliation: setSession failed');
        setMatchedSupabaseUserId(null);
        return;
      }

      const newEmail = setResult.session.user?.email?.trim().toLowerCase() ?? null;
      if (newEmail !== normalizedExpected) {
        console.warn('[SSO] identity reconciliation: exchange result did not match expected account');
        setMatchedSupabaseUserId(null);
        return;
      }

      setMatchedSupabaseUserId(setResult.session.user.id);
    } catch (err) {
      if (isStaleReconcile()) return;
      console.warn('[SSO] identity reconciliation failed:', err);
      setMatchedSupabaseUserId(null);
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
  }, [verifySessionSafe, clearAuthState, navigate]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      if (event.data?.type === 'SSO_LOGOUT') {
        await clearLocalSessionOnReceivedLogout();
      }

      if (event.data?.type === 'SSO_LOGIN') {
        await verifySessionSafe(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [verifySessionSafe, clearLocalSessionOnReceivedLogout]);

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
        {/* `petCatOwnerId` collapses matchedSupabaseUserId's `undefined`
            ("still reconciling") down to `null` for CatMascot's own
            account-sensitive presentation cache — never cache/key under a
            guessed, unconfirmed identity. `key` is identity-bound (not
            just the guest/logged-in boolean this previously used):
            'guest' while signed out or still reconciling, the actual
            reconciled owner id once logged in — so a direct A -> B account
            switch unmounts A's Cat and mounts a fresh B instance, instead
            of the old key={isLoggedIn ? 'logged-in' : 'guest'} which never
            changed across an in-session account swap. */}
        <div className={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen ? 'hidden' : 'contents'}>
          <CatMascot
            key={!isLoggedIn ? 'guest' : (petCatOwnerId ?? 'guest')}
            onCatClick={() => setIsVirtualPetOpen(true)}
            disabled={!isLoggedIn}
            isHidden={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen}
            profileCompletionStatus={isPersonalizedPetDialogueEnabled() ? profileCompletionStatus : 'unknown'}
            personalizedMatchedUserId={isPersonalizedPetDialogueEnabled() ? matchedSupabaseUserId : null}
            catCacheOwnerId={petCatOwnerId}
            onNavigateInternal={navigate}
          />
        </div>

        {/* SharedMolarAI owns the floating trigger button, chat panel,
            history, loading, submit mechanics, and badge-text cycling
            internally — kept mounted (CSS-hidden, not unmounted) while Pet
            is open or on an auth route, exactly mirroring CatMascot's own
            wrapper above.
            Keyed by the reconciled owner identity (never just the boolean
            isLoggedIn) so a direct A -> B account switch unmounts A's chat
            history/adapter and mounts a fresh B instance, rather than
            leaving A's history visible under B. Disabled entirely — not
            just context-starved — while a logged-in identity is still
            unreconciled, so no chat can start under an unconfirmed owner. */}
        <div className={isAuthRoute || isCompanyMemberSignup || isVirtualPetOpen ? 'hidden' : 'contents'}>
          <SharedMolarAI
            key={!isLoggedIn ? 'guest' : typeof matchedSupabaseUserId === 'string' ? matchedSupabaseUserId : 'reconciling'}
            adapter={molarAdapter}
            disabled={!isLoggedIn || typeof matchedSupabaseUserId !== 'string'}
            onPetToggle={() => setIsVirtualPetOpen(true)}
            emptyState={molarEmptyState}
            logoUrl={MOLAR_LOGO_URL}
          />
        </div>

        {/* Withheld entirely while an already-Odoo-logged-in user's
            Supabase reconciliation is still pending — never mount an
            authenticated Pet instance under a guessed/null owner just
            because that lookup hasn't resolved yet. `key` forces a full
            unmount/remount on any real owner-identity change, including a
            direct A -> B switch that never passes through a null/guest
            state. Guest (petCatOwnerId === null, not reconciling) still
            mounts, preserving existing guest Pet behavior; userId={null}
            there is intentional ephemeral mode, never a persisted
            "anonymous" identity. */}
        {!isPetOwnerReconciling && (
          <AppGalleryVirtualPet
            key={petCatOwnerId ?? 'guest'}
            isOpen={isVirtualPetOpen}
            onClose={() => setIsVirtualPetOpen(false)}
            userId={petCatOwnerId}
            extraGames={petCatOwnerId ? [
              {
                id: 'meowdoku',
                title: 'Meowdoku',
                iconUrl: '/games/meowdoku/cover-148.png',
                onSelect: () => setIsMeowdokuOpen(true),
              },
            ] : undefined}
          />
        )}
        {/* Meowdoku is already live/user-facing in Production (legacy
            VirtualPet/{GamePage,RoomMenus}.tsx) — exposed here as a 4th
            game via SharedVirtualPet's extraGames slot instead. Rendered
            as a sibling ABOVE SharedVirtualPet's own z-[1000] overlay
            (z-[1100]) so it never renders invisibly behind it; closing it
            leaves SharedVirtualPet's Games room still open underneath. */}
        {petCatOwnerId && (
          <MeowdokuLauncher
            isOpen={isMeowdokuOpen}
            onClose={() => setIsMeowdokuOpen(false)}
            userId={petCatOwnerId}
          />
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

        {!isAuthRoute && !isCompanyMemberSignup && (
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

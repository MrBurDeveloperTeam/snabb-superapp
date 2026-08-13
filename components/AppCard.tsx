import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { MiniApp } from '../types';
import { getAuthUser } from '@/utils/authStorage';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';

interface AppCardProps {
  isLoggedIn: boolean | null;
  app: MiniApp;
  index: number;
}

// Render a 120px image inside the 112px desktop icon viewport.
// The viewport clips the excess evenly on every side.
const ICON_SCALE = 120 / 112;

const AppCard: React.FC<AppCardProps> = ({ app, index, isLoggedIn }) => {
  const { mutateAsync: createAppLink, isPending } = useCreateAppLink();

  // Supports both full image URLs and local public paths like /icons/kaneiko_black.png
  const isImageUrl = app.icon.startsWith('http') || app.icon.startsWith('/');

  const user = getAuthUser();
  const isComingSoon = !app.route;
  const iconCornerRadius = '20%';

  const handleClick = async () => {
    if (!app.route) return;

    const isExternal =
      app.route.startsWith('http://') || app.route.startsWith('https://');

    if (isExternal && isLoggedIn) {
      // Figure out which app we're launching synchronously — no awaits yet.
      //
      // Shop is matched on app.id, not app.route, on purpose: constants.ts
      // resolves Shop's route from the user's company_code, which is read
      // from localStorage once, at module-load time. Right after a fresh
      // login that data usually isn't populated yet, so the route silently
      // falls back to 'https://app.snabbb.com/shop' — a string that doesn't
      // contain 'mrbur.shop', so the old substring match here would fail to
      // recognize it as the Shop app and just no-op on click (no tab, no
      // error). Matching on the stable id sidesteps that entirely; the real
      // shop URL still comes from the backend's createAppLink response
      // below, not from app.route.
      const appCode = app.id === 'app-1'
        ? 'shop'
        : app.route.includes('inventory')
        ? 'inventory'
        : app.route.includes('recruitment')
        ? null // not wired up yet
        : app.route.includes('appointment')
        ? 'appointment'
        : app.route.includes('event')
        ? 'event'
        : app.route.includes('calculator')
        ? 'calculator'
        : app.route.includes('todo')
        ? 'todo'
        : app.route.includes('imageai')
        ? 'imageai'
        : app.route.includes('e-learning')
        ? 'e-learning'
        : app.route.includes('reward')
        ? 'reward'
        : app.route.includes('charting')
        ? 'charting'
        : null;

      if (!appCode) return;

      // Safari requires window.open() to happen synchronously inside the
      // click handler, before any `await`. If we wait for createAppLink()
      // to resolve first, Safari's popup blocker silently kills the tab
      // (Chrome is more lenient, which is why this worked there). So we
      // open a blank tab right away and navigate it once we have the URL.
      const newTab = window.open('', '_blank');

      try {
        const res = await createAppLink({
          app: appCode,
          email: user.username,
          name: user.name,
        });

        let targetUrl = res.result?.url;

        if (appCode === 'shop' && targetUrl) {
          const ssoUrl = new URL(targetUrl);
          const token = ssoUrl.searchParams.get('token');
          const companyCode = ssoUrl.searchParams.get('company_code') || 'INT';
          if (token) {
            targetUrl = `https://app.snabbb.com/api/sso/odoo-exchange?token=${encodeURIComponent(
              token
            )}&company_code=${encodeURIComponent(companyCode)}`;
          }
        }

        if (!targetUrl) {
          throw new Error('No launch URL was returned.');
        }

        if (newTab) {
          newTab.location.href = targetUrl;
        } else {
          // Popup blocker still caught it (e.g. blocked at the OS/browser
          // level) — fall back to a direct open as a last resort.
          window.open(targetUrl, '_blank');
        }
      } catch (e: any) {
        newTab?.close();
        console.error(`Failed to open ${app.title}:`, e);
        toast.error(e?.message || `Could not open ${app.title}. Please try again.`);
      }
    } else {
      window.open(app.route, '_blank');
    }
  };

  const cardBaseStyle: React.CSSProperties = {
    borderRadius: iconCornerRadius,
    overflow: 'hidden',
    position: 'relative',
  };

  const activeCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
  };

  const activeCardHoverStyle: React.CSSProperties = {
    ...cardBaseStyle,
  };

  const comingSoonCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
  };

  const comingSoonCardHoverStyle: React.CSSProperties = {
    ...cardBaseStyle,
  };

  const activeIconWrapStyle: React.CSSProperties = {
    background:
      'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.45) 35%, transparent 60%), linear-gradient(145deg, #dff2ef 0%, #d5ebe6 35%, #c7e2db 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(95,111,148,0.10)',
    borderRadius: iconCornerRadius,
  };

  const comingSoonIconWrapStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #ececf1 0%, #e3e5eb 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 14px rgba(148,163,184,0.10)',
    borderRadius: iconCornerRadius,
  };

  const glowStyle: React.CSSProperties = {
    backgroundColor: `${app.colorScheme.icon}22`,
  };

  const iconInsetClass = 'absolute inset-[3px]';

  const cardClass =
    'relative z-10 w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 flex items-center justify-center transition-all duration-150';

  const wrapperClass =
    'group flex flex-col items-center gap-3 sm:gap-4 w-full pb-4 pt-2';

  const iconContentClass =
    'relative z-10 flex items-center justify-center h-full w-full select-none transition-all duration-300';

  const renderIcon = (imageClass = '') => {
    if (isImageUrl) {
      if (app.iconDark) {
        return (
          <div className="w-full h-full">
            <img
              src={app.icon}
              alt={app.title}
              className={`block dark:hidden w-full h-full object-cover ${imageClass}`}
            />
            <img
              src={app.iconDark}
              alt={app.title}
              className={`hidden dark:block w-full h-full object-cover ${imageClass}`}
            />
          </div>
        );
      }

      return (
        <img
          src={app.icon}
          alt={app.title}
          className={`w-full h-full object-cover ${imageClass}`}
        />
      );
    }

    return <i className={`${app.icon} text-3xl sm:text-4xl`} />;
  };

  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          opacity: { duration: 0.18 },
          scale: { duration: 0.18 },
          y: { duration: 0.18 },
        }}
        className={wrapperClass}
        data-no-cat="true"
      >
        <div className="relative">
          <div className={cardClass} style={activeCardStyle}>
            {!isImageUrl && (
              <div className={iconInsetClass} style={activeIconWrapStyle} />
            )}

            <div
              className={`${iconContentClass} ${!isImageUrl ? app.colorScheme.text : ''}`}
            >
              {isImageUrl ? (
                <img
                  src={app.icon}
                  alt={app.title}
                  className="block h-full w-full object-cover"
                  style={{
                    borderRadius: iconCornerRadius,
                    transform: `scale(${ICON_SCALE})`,
                  }}
                />
              ) : (
                <i className={`${app.icon} text-3xl sm:text-4xl`} />
              )}
            </div>

            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px]" />

              <svg
                className="relative animate-spin h-6 w-6 text-white"
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
            </div>
          </div>
        </div>

        <h3 className="text-[12px] sm:text-[14px] font-bold text-slate-800 dark:text-slate-100 text-center px-1 truncate w-full tracking-tight">
          {app.title}
        </h3>
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={isComingSoon ? undefined : handleClick}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 },
        y: { duration: 0.18 },
      }}
      className={`${wrapperClass} ${isComingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      data-no-cat="true"
    >
      <div className="relative">
        <motion.div
          whileHover={
            isComingSoon
              ? {}
              : {
                  scale: 1.05,
                  y: -8,
                  transition: { type: 'spring', stiffness: 400, damping: 12 },
                }
          }
          whileTap={isComingSoon ? {} : { scale: 0.98 }}
          onHoverStart={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (el) {
              Object.assign(
                el.style,
                isComingSoon ? comingSoonCardHoverStyle : activeCardHoverStyle
              );
            }
          }}
          onHoverEnd={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (el) {
              Object.assign(
                el.style,
                isComingSoon ? comingSoonCardStyle : activeCardStyle
              );
            }
          }}
          className={cardClass}
          style={isComingSoon ? comingSoonCardStyle : activeCardStyle}
        >
          {!isImageUrl && (
            <div
              className={iconInsetClass}
              style={isComingSoon ? comingSoonIconWrapStyle : activeIconWrapStyle}
            />
          )}

          {!isImageUrl && (
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-20" />
          )}

          <div
            className={`${iconContentClass} group-hover:scale-100 ${
              !isImageUrl ? app.colorScheme.text : ''
            }`}
          >
            {isImageUrl ? (
              <img
                src={app.icon}
                alt={app.title}
                className="block h-full w-full object-cover transition-transform duration-200"
                style={{ transform: `scale(${ICON_SCALE})` }}
              />
            ) : (
              <i className={`${app.icon} text-3xl sm:text-4xl`} />
            )}
          </div>

          {isComingSoon && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center z-30">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] bg-white/80 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-sm">
                Coming Soon
              </span>
            </div>)}
        </motion.div>

        {!isComingSoon && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl -z-10 scale-100"
            style={glowStyle}
          />
        )}
      </div>

      <h3
        className={`text-[12px] sm:text-[14px] font-bold transition-colors text-center px-1 truncate w-full tracking-tight ${
          isComingSoon
            ? 'text-slate-500 dark:text-slate-400'
            : 'group-hover:opacity-90'
        }`}
        style={!isComingSoon ? { color: app.colorScheme.icon } : undefined}
      >
        {app.title}
      </h3>
    </motion.div>
  );
};

export default AppCard;

import React from 'react';
import { motion } from 'framer-motion';
import { MiniApp } from '../types';

interface AppCardProps {
  isLoggedIn: boolean | null;
  app: MiniApp;
  index: number;
}

// Render a 120px image inside the 112px desktop icon viewport.
// The viewport clips the excess evenly on every side.
const ICON_SCALE = 120 / 112;

const AppCard: React.FC<AppCardProps> = ({ app, index, isLoggedIn }) => {
  // Supports both full image URLs and local public paths like /icons/kaneiko_black.png
  const isImageUrl = app.icon.startsWith('http') || app.icon.startsWith('/');

  const isComingSoon = !app.route;
  const iconCornerRadius = '20%';

  // ✅ Opens the destination directly via the worker's server-side
  // /launch/:appCode redirect, instead of the old pattern of opening a
  // blank tab (window.open('', '_blank')) and only relocating it *after*
  // an async fetch('/api/v1/sso/app_link') resolved. That old pattern --
  // blank tab now, silent JS redirect later -- is structurally identical
  // to how malicious popunder/redirect ads dodge popup blockers, and
  // Chrome's Enhanced Safe Browsing can silently block the delayed
  // relocation step, leaving the tab stuck at about:blank with no visible
  // error. Opening the real (worker-resolved) destination URL synchronously,
  // in direct response to the click, avoids that pattern entirely -- the
  // worker does the same session/company-code resolution server-side and
  // responds with a normal HTTP redirect.
  const handleClick = () => {
    if (!app.route) return;

    const isExternal =
      app.route.startsWith('http://') || app.route.startsWith('https://');

    if (isExternal && isLoggedIn) {
      let appCode: string | null = null;

      switch (true) {
        case app.route.includes('inventory'):
          appCode = 'inventory';
          break;

        case app.route.includes('recruitment'):
          // Not wired up yet -- previously a no-op here too.
          return;

        case app.route.includes('appointment'):
          appCode = 'appointment';
          break;

        case app.route.includes('event'):
          appCode = 'event';
          break;

        case app.route.includes('mrbur.shop'):
          appCode = 'shop';
          break;

        case app.route.includes('calculator'):
          appCode = 'calculator';
          break;

        case app.route.includes('todo'):
          appCode = 'todo';
          break;

        case app.route.includes('imageai'):
          appCode = 'imageai';
          break;

        case app.route.includes('e-learning'):
          appCode = 'e-learning';
          break;

        case app.route.includes('reward'):
          appCode = 'reward';
          break;

        case app.route.includes('charting'):
          appCode = 'charting';
          break;

        default:
          return;
      }

      if (appCode) {
        window.open(`https://app.snabbb.com/launch/${appCode}`, '_blank');
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

  // Note: there used to be an isPending-driven spinner state here while the
  // app-link fetch resolved before opening a blank tab. Now that the click
  // handler navigates directly (see handleClick above), there's no local
  // async gap on this page to show a spinner for anymore -- the new tab's
  // own loading indicator covers that instead.

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

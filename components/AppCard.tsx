import React from 'react';
import { motion } from 'framer-motion';
import { MiniApp } from '../types';
import { getAuthUser } from '@/utils/authStorage';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';

interface AppCardProps {
  isLoggedIn: boolean | null;
  app: MiniApp;
  index: number;
}

const AppCard: React.FC<AppCardProps> = ({ app, index, isLoggedIn }) => {
  const { mutateAsync: createAppLink, isPending } = useCreateAppLink();

  // Supports both full image URLs and local public paths like /icons/kaneiko_black.png
  const isImageUrl = app.icon.startsWith('http') || app.icon.startsWith('/');

  const user = getAuthUser();
  const isComingSoon = !app.route;

  const handleClick = async () => {
    if (!app.route) return;

    const isExternal =
      app.route.startsWith('http://') || app.route.startsWith('https://');

    if (isExternal && isLoggedIn) {
      const w = window.open('', '_blank');

      switch (true) {
        case app.route.includes('inventory'): {
          const res = await createAppLink({
            app: 'inventory',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('recruitment'):
          break;

        case app.route.includes('appointment'): {
          const res = await createAppLink({
            app: 'appointment',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('event'): {
          const res = await createAppLink({
            app: 'event',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('mrbur.shop'): {
          const res = await createAppLink({
            app: 'shop',
            email: user.username,
            name: user.name,
          });

          if (res.result?.url && w) {
            const ssoUrl = new URL(res.result.url);
            const token = ssoUrl.searchParams.get('token');
            const companyCode = ssoUrl.searchParams.get('company_code') || 'MMY';

            if (token) {
              w.location.href = `https://app.snabbb.com/api/sso/odoo-exchange?token=${encodeURIComponent(
                token
              )}&company_code=${encodeURIComponent(companyCode)}`;
            } else {
              w.location.href = res.result.url;
            }
          }

          break;
        }

        case app.route.includes('calculator'): {
          const res = await createAppLink({
            app: 'calculator',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('todo'): {
          const res = await createAppLink({
            app: 'todo',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('imageai'): {
          const res = await createAppLink({
            app: 'imageai',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('e-learning'): {
          const res = await createAppLink({
            app: 'e-learning',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        case app.route.includes('snabbb-reward'): {
          const res = await createAppLink({
            app: 'reward',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
          break;
        }

        default:
          break;
      }
    } else {
      window.open(app.route, '_blank');
    }
  };

  const cardBaseStyle: React.CSSProperties = {
    borderRadius: '2rem',
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
    backgroundColor: 'transparent',
    borderRadius: '1.65rem',
  };

  const comingSoonIconWrapStyle: React.CSSProperties = {
    borderRadius: '1.65rem',
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
        layout
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.08 } }}
        transition={{
          layout: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.3 },
          scale: { duration: 0.3 },
          y: { duration: 0.3 },
        }}
        className={wrapperClass}
        data-no-cat="true"
      >
        <div className="relative">
          <div className={cardClass} style={activeCardStyle}>
            <div className={iconInsetClass} style={activeIconWrapStyle} />

            <div
              className={`${iconContentClass} ${!isImageUrl ? app.colorScheme.text : ''}`}
            >
              {renderIcon()}
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
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.08 } }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: { duration: 0.3 },
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
          <div
            className={iconInsetClass}
            style={isComingSoon ? comingSoonIconWrapStyle : activeIconWrapStyle}
          />

          {!isImageUrl && (
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-20" />
          )}

          <div
            className={`${iconContentClass} group-hover:scale-100 ${
              !isImageUrl ? app.colorScheme.text : ''
            }`}
          >
            {isImageUrl ? (
              renderIcon('')
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
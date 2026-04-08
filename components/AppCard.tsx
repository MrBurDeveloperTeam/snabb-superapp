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
  const isImageUrl = app.icon.startsWith('http');
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
        case app.route.includes('shop'): {
          const res = await createAppLink({
            app: 'shop',
            email: user.username,
            name: user.name,
          });
          if (res.result?.url && w) w.location.href = res.result.url;
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
    background:
      'linear-gradient(145deg, #f6f9fc 0%, #eef3f8 45%, #e5edf5 100%)',
    boxShadow:
      '0 10px 30px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.7)',
  };

  const activeCardHoverStyle: React.CSSProperties = {
    ...cardBaseStyle,
    background:
      'linear-gradient(145deg, #f6f9fc 0%, #eef3f8 45%, #e5edf5 100%)',
    boxShadow:
      '0 20px 40px rgba(95,111,148,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.72)',
  };

  const comingSoonCardStyle: React.CSSProperties = {
    ...cardBaseStyle,
    background: 'linear-gradient(145deg, #f7f7f9 0%, #f1f2f5 100%)',
    boxShadow:
      '0 8px 24px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.6)',
  };

  const comingSoonCardHoverStyle: React.CSSProperties = {
    ...cardBaseStyle,
    background: 'linear-gradient(145deg, #f7f7f9 0%, #f1f2f5 100%)',
    boxShadow:
      '0 12px 24px rgba(148,163,184,0.08), inset 0 1px 0 rgba(255,255,255,0.72)',
    border: '1px solid rgba(255,255,255,0.62)',
  };

  const activeIconWrapStyle: React.CSSProperties = {
    background:
      'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), rgba(255,255,255,0.45) 35%, transparent 60%), linear-gradient(145deg, #dff2ef 0%, #d5ebe6 35%, #c7e2db 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(95,111,148,0.10)',
    borderRadius: '1.65rem',
  };

  const comingSoonIconWrapStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #ececf1 0%, #e3e5eb 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 14px rgba(148,163,184,0.10)',
    borderRadius: '1.65rem',
  };

  const glowStyle: React.CSSProperties = {
    backgroundColor: `${app.colorScheme.icon}22`,
  };

  const iconInsetClass = 'absolute inset-[3px]';
  const cardClass =
    'relative z-10 w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 flex items-center justify-center transition-all duration-500';
  const wrapperClass =
    'group flex flex-col items-center gap-3 sm:gap-4 w-full pb-4 pt-2';
  const iconContentClass =
    'relative z-10 flex items-center justify-center h-full w-full select-none transition-all duration-300';

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
      >
        <div className="relative">
          <div className={cardClass} style={activeCardStyle}>
            <div className={iconInsetClass} style={activeIconWrapStyle} />

            <div
              className={`${iconContentClass} ${!isImageUrl ? app.colorScheme.text : ''}`}
            >
              {isImageUrl ? (
                <img
                  src={app.icon}
                  alt={app.title}
                  className="w-full h-full object-contain"
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

        <h3 className="text-[12px] sm:text-[14px] font-bold text-slate-800 text-center px-1 truncate w-full tracking-tight">
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
            Object.assign(
              el.style,
              isComingSoon ? comingSoonCardHoverStyle : activeCardHoverStyle
            );
          }}
          onHoverEnd={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            Object.assign(
              el.style,
              isComingSoon ? comingSoonCardStyle : activeCardStyle
            );
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
            className={`${iconContentClass} ${
              isComingSoon ? 'opacity-75 grayscale-[20%]' : 'group-hover:scale-110'
            } ${!isImageUrl ? app.colorScheme.text : ''}`}
          >
            {isImageUrl ? (
              <img
                src={app.icon}
                alt={app.title}
                className={`${
                  app.route?.includes('shop')
                    ? 'max-w-[100%] max-h-[100%] object-cover'
                    : 'max-w-[60%] max-h-[60%] object-contain'
                } ${isComingSoon ? 'opacity-70 grayscale-[35%]' : ''}`}
              />
            ) : (
              <i
                className={`${app.icon} text-3xl sm:text-4xl ${
                  isComingSoon ? 'text-slate-400' : ''
                }`}
              />
            )}
          </div>

          {isComingSoon && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center z-30">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] bg-white/80 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-sm">
                Coming Soon
              </span>
            </div>
          )}
        </motion.div>

        {!isComingSoon && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl -z-10 scale-110"
            style={glowStyle}
          />
        )}
      </div>

      <h3
        className={`text-[12px] sm:text-[14px] font-bold transition-colors text-center px-1 truncate w-full tracking-tight ${
          isComingSoon
            ? 'text-slate-500'
            : 'text-slate-800 group-hover:text-slate-950'
        }`}
      >
        {app.title}
      </h3>
    </motion.div>
  );
};

export default AppCard;
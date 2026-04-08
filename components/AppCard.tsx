import React from 'react';
import { motion } from 'framer-motion';
import { MiniApp } from '../types';
import { getAuthUser } from '@/utils/authStorage';
import { useCreateAppLink } from '@/mutation/useCreateAppLink';

interface AppCardProps {
  isLoggedIn: boolean;
  app: MiniApp;
  index: number;
}

const AppCard: React.FC<AppCardProps> = ({ app, index, isLoggedIn }) => {
  const { mutateAsync: createAppLink, isPending, error } = useCreateAppLink();
  const isImageUrl = app.icon.startsWith('http');
  const user = getAuthUser();
  const isComingSoon = !app.route;

  const handleClick = async () => {
    if (app.route) {
      const isExternal = app.route.startsWith("http://") || app.route.startsWith("https://");
      if (isExternal && isLoggedIn) {
        const host = window.location.hostname; 
        console.log('app.route: ', app.route);

        const w = window.open("", "_blank");
        switch (true) {
          case app.route?.includes('inventory'):
            const inventoryRes = await createAppLink({ app: 'inventory', email: user.username, name: user.name });
            if (inventoryRes.result && inventoryRes.result.url) {
              if (!w) return;
              w.location.href = inventoryRes.result.url;
            }
            break;
          case app.route?.includes('recruitment'):
            break;
          case app.route?.includes('appointment'):
            const appointmentRes = await createAppLink({ app: 'appointment', email: user.username, name: user.name });
            if (appointmentRes.result && appointmentRes.result.url) {
              if (!w) return;
              w.location.href = appointmentRes.result.url;
            }
            break;
          case app.route?.includes('event'):
            const eventRes = await createAppLink({ app: 'event', email: user.username, name: user.name });
            if (eventRes.result && eventRes.result.url) {
              if (!w) return;
              w.location.href = eventRes.result.url;
            }
            break;
          case app.route?.includes('shop'):
            const shopRes = await createAppLink({ app: 'shop', email: user.username, name: user.name });
            if (shopRes.result && shopRes.result.url) {
              if (!w) return;
              w.location.href = shopRes.result.url;
            }
            break;
          case app.route?.includes('calculator'):
            const calculatorRes = await createAppLink({ app: 'calculator', email: user.username, name: user.name });
            if (calculatorRes.result && calculatorRes.result.url) {
              if (!w) return;
              w.location.href = calculatorRes.result.url;
            }
            break;
          case app.route?.includes('todo'):
            const todoRes = await createAppLink({ app: 'todo', email: user.username, name: user.name });
            if (todoRes.result && todoRes.result.url) {
              if (!w) return;
              w.location.href = todoRes.result.url;
            }
            break;
          case app.route?.includes('imageai'):
            const aimageRes = await createAppLink({ app: 'imageai', email: user.username, name: user.name });
            if (aimageRes.result && aimageRes.result.url) {
              if (!w) return;
              w.location.href = aimageRes.result.url;
            }
            break;
          default:
            break;
        }
      } else {
        switch (true) {
          case app.route?.includes('inventory'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('recruitment'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('appointment'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('event'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('shop'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('calculator'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('todo'):
            window.open(app.route, "_blank");
            break;
          case app.route?.includes('imageai'):
            window.open(app.route, "_blank");
            break;
          default:
            break;
        }
      }
    }
  };

  const activeCardClass =
    "bg-[linear-gradient(145deg,#f6f9fc_0%,#eef3f8_45%,#e5edf5_100%)] " +
    "shadow-[0_10px_30px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.75)] " +
    "border border-white/70";

  const comingSoonCardClass =
    "bg-[linear-gradient(145deg,#f7f7f9_0%,#f1f2f5_100%)] " +
    "shadow-[0_8px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.7)] " +
    "border border-white/60";

  const activeIconWrapClass =
    "bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.95),rgba(255,255,255,0.45)_35%,transparent_60%),linear-gradient(145deg,#dff2ef_0%,#d5ebe6_35%,#c7e2db_100%)] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(95,111,148,0.10)]";

  const comingSoonIconWrapClass =
    "bg-[linear-gradient(145deg,#ececf1_0%,#e3e5eb_100%)] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_14px_rgba(148,163,184,0.10)]";

  if (isPending) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.08 } }}
        transition={{
          layout: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.3 },
          scale: { duration: 0.3 },
          y: { duration: 0.3 },
        }}
        className="group flex flex-col items-center gap-3 sm:gap-4 w-full pb-4 pt-2"
      >
        <div className="relative">
          <div
            className={`relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-[2rem] flex items-center justify-center overflow-hidden ${activeCardClass}`}
          >
            <div
              className={`absolute inset-[10px] rounded-[1.4rem] ${activeIconWrapClass}`}
            />

            <div
              className={`relative z-10 select-none transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center h-full w-full ${
                !isImageUrl ? app.colorScheme.text : ""
              }`}
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

            {isPending && (
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
            )}
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
        y: { duration: 0.3 }
      }}
      className={`group flex flex-col items-center gap-3 sm:gap-4 w-full pb-4 pt-2 ${
        isComingSoon ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="relative">
        <motion.div
          whileHover={
            isComingSoon
              ? {}
              : {
                  scale: 1.05,
                  y: -8,
                  transition: { type: 'spring', stiffness: 400, damping: 12 }
                }
          }
          className={`relative z-10 w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all duration-500 ${
            isComingSoon
              ? `${comingSoonCardClass} group-hover:shadow-[0_12px_24px_rgba(148,163,184,0.08)]`
              : `${activeCardClass} group-hover:shadow-[0_20px_40px_rgba(95,111,148,0.14),inset_0_1px_0_rgba(255,255,255,0.8)]`
          }`}
        >
          <div
            className={`absolute inset-[10px] rounded-[1.4rem] ${
              isComingSoon ? comingSoonIconWrapClass : activeIconWrapClass
            }`}
          />

          {!isImageUrl && (
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none z-20" />
          )}

          <div
            className={`relative z-10 select-none transition-all duration-300 flex items-center justify-center h-full w-full ${
              isComingSoon
                ? 'opacity-75 grayscale-[20%]'
                : 'transform group-hover:scale-110'
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
            style={{ backgroundColor: app.colorScheme.icon + '22' }}
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
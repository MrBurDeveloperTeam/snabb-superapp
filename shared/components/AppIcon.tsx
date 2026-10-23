import { motion } from 'framer-motion';

export const AppIcon = ({ icon, label }: { icon: string, label: string }) => {
  // const isImageUrl = icon.startsWith('http');
  const isImageUrl = icon.startsWith('http') || icon.startsWith('/');
  const isMrBur = label === 'Mr.Bur';
  // Legacy full-bleed icons (not in /new-icons/, no transparent margin) look bigger
  // than the padded new icons, so shrink them to match visually.
  const needsInset = isImageUrl && !isMrBur && !icon.includes('/new-icons/');

  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 }
      }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
      className="flex flex-col items-center gap-3"
    >
      <div className={`w-18 h-18 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center shadow-2xl shadow-black/30 relative overflow-hidden group/icon`}>
        {!isMrBur && (
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10" />
        )}
        
        {isImageUrl ? (
          <img
            src={icon}
            alt={label}
            className={`relative z-10 transition-transform duration-500 group-hover/icon:scale-110 ${
              isMrBur ? 'w-full h-full object-contain' : 'w-full h-full object-cover'
            } ${needsInset ? 'scale-[0.81] rounded-2xl' : ''}`}
          />
        ) : (
          <i className={`${icon} text-2xl sm:text-3xl relative z-10 transition-transform duration-500 group-hover/icon:scale-110`}></i>
        )}
      </div>
      <span className="text-[8px] font-black tracking-[0.15em] text-slate-500 uppercase text-center leading-tight">{label}</span>
    </motion.div>
  );
};
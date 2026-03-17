import { motion, AnimatePresence } from 'framer-motion';

export const AppIcon = ({ icon, label, color }: { icon: string, label: string, color: string }) => {
  const isImageUrl = icon.startsWith('http');
  
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.8, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0 }
      }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
      className="flex flex-col items-center gap-3"
    >
      <div className={`p-2w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-black/30 relative overflow-hidden group/icon ${color}`}>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-10" />
        
        {isImageUrl ? (
          <img src={icon} alt={label} className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover/icon:scale-110" />
        ) : (
          <i className={`${icon} text-2xl sm:text-3xl relative z-10 transition-transform duration-500 group-hover/icon:scale-110`}></i>
        )}
      </div>
      <span className="text-[8px] font-black tracking-[0.15em] text-slate-500 uppercase text-center leading-tight">{label}</span>
    </motion.div>
  );
};
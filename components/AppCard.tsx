
import React from 'react';
import { motion } from 'framer-motion';
import { MiniApp } from '../types';

interface AppCardProps {
  app: MiniApp;
  index: number;
}

const AppCard: React.FC<AppCardProps> = ({ app, index }) => {
  const isImageUrl = app.icon.startsWith('http');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.08 } }}
      transition={{ 
        layout: {
          type: 'spring',
          stiffness: 300,
          damping: 30
        },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: { duration: 0.3 }
      }}
      className="group flex flex-col items-center gap-3 sm:gap-4 w-full pb-4 pt-2"
    >
      <div className="relative">
        <motion.div 
          whileHover={{ 
            scale: 1.05, 
            y: -8,
            transition: { type: 'spring', stiffness: 400, damping: 12 }
          }}
          className={`relative z-10 w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 ${app.colorScheme.bg} rounded-[2rem] shadow-[0_4px_12px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)] flex items-center justify-center transition-all duration-500 overflow-hidden group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]`}
        >
          {/* Subtle white gloss overlay */}
          {!isImageUrl && <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-20" />}
          
          <div className={`relative z-10 select-none transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center h-full w-full ${!isImageUrl ? app.colorScheme.text : ''}`}>
             {isImageUrl ? (
               <img src={app.icon} alt={app.title} className="w-full h-full object-cover" />
             ) : (
               <i className={`${app.icon} text-3xl sm:text-4xl`}></i>
             )}
          </div>
        </motion.div>

        {/* Animated accent glow */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl -z-10 scale-110"
          style={{ backgroundColor: app.colorScheme.icon + '40' }}
        />
      </div>
      
      <h3 className="text-[12px] sm:text-[14px] font-bold text-slate-800 group-hover:text-slate-950 transition-colors text-center px-1 truncate w-full tracking-tight">
        {app.title}
      </h3>
    </motion.div>
  );
};

export default AppCard;

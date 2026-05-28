
import React from 'react';
import { motion } from 'framer-motion';

interface DisclaimerPageProps {
  onBack?: () => void;
}

const DisclaimerPage: React.FC<DisclaimerPageProps> = ({ onBack }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-6 py-20 relative"
    >
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </div>
          <span className="text-sm">Back to Sign Up</span>
        </motion.button>
      )}

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Disclaimer</h1>
        <p className="text-slate-500 font-medium">Effective Date: May 28, 2026</p>
      </div>

      <div className="prose prose-slate max-w-none space-y-12">
        <section>
          The tools, calculators, schedules, inventory functions, educational content, and other features available on this Platform are provided for general productivity, workflow support, operational convenience, and informational purposes only.
          <br/>
          <br/>
          The Platform is not intended to replace certified accounting systems, clinical management software, medical record systems, audit systems, or professional regulatory compliance systems.
          <br/>
          <br/>
          Any results, calculations, schedules, records, or information generated through the Platform should be independently reviewed and verified by users before reliance or implementation.
          <br/>
          <br/>
          The Company makes no guarantees regarding the accuracy, completeness, reliability, or suitability of the Platform or its tools for any specific purpose.
          <br/>
          <br/>
          Users are solely responsible for their own business, operational, clinical, financial, and compliance decisions.
        </section>
      </div>
    </motion.div>
  );
};

export default DisclaimerPage;

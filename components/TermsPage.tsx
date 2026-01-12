
import React from 'react';
import { motion } from 'framer-motion';

interface TermsPageProps {
  onBack?: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Terms of Service</h1>
        <p className="text-slate-500 font-medium">Effective Date: May 20, 2025</p>
      </div>

      <div className="prose prose-slate max-w-none space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-600 leading-relaxed">
            By accessing Snabbb Apps, you agree to be bound by these Terms of Service. If you do not agree 
            with any part of these terms, you may not use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Use License</h2>
          <p className="text-slate-600 leading-relaxed">
            We grant you a personal, non-exclusive, non-transferable license to use our mini-apps for 
            professional and personal productivity. You may not reverse engineer or attempt to extract 
            source code from our tools.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Account Responsibility</h2>
          <p className="text-slate-600 leading-relaxed">
            You are responsible for maintaining the confidentiality of your login credentials and for all 
            activities that occur under your account. Notify us immediately of any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Limitations</h2>
          <p className="text-slate-600 leading-relaxed">
            In no event shall Snabbb Apps or its suppliers be liable for any damages arising out of the 
            use or inability to use the materials on our platform, even if notified orally or in writing.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Revisions and Errata</h2>
          <p className="text-slate-600 leading-relaxed">
            The materials appearing on Snabbb Apps could include technical, typographical, or photographic 
            errors. We do not warrant that any of the materials on its website are accurate, complete, or current.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default TermsPage;

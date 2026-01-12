
import React from 'react';
import { motion } from 'framer-motion';

interface PrivacyPageProps {
  onBack?: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
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
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Privacy Policy</h1>
        <p className="text-slate-500 font-medium">Last Updated: May 20, 2025</p>
      </div>

      <div className="prose prose-slate max-w-none space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Information We Collect</h2>
          <p className="text-slate-600 leading-relaxed">
            At Snabbb Apps, we value your privacy. We collect minimal information required to provide our services, 
            including account details (name, email) and usage data to improve our mini-app ecosystem.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">2. How We Use Data</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            The data we collect is used primarily to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>Personalize your app gallery experience.</li>
            <li>Enable AI-driven suggestions and tool discovery.</li>
            <li>Maintain account security and workspace preferences.</li>
            <li>Communicate essential updates regarding our services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">3. AI and Third Parties</h2>
          <p className="text-slate-600 leading-relaxed">
            Some features utilize the Gemini API for generative tasks. Data sent to these services is handled 
            according to Google's strict enterprise privacy standards. We do not sell your personal data to advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Your Rights</h2>
          <p className="text-slate-600 leading-relaxed">
            You have the right to access, export, or delete your account information at any time through your 
            profile settings. For any privacy-related inquiries, please contact our support team.
          </p>
        </section>
      </div>

      <div className="mt-20 p-8 bg-blue-50 rounded-[2rem] border border-blue-100/50">
        <p className="text-blue-900 font-bold text-center">
          Questions about our privacy practices? 
          <a href="mailto:privacy@snabbb.com" className="ml-2 text-blue-600 underline underline-offset-4">Contact our DPO</a>
        </p>
      </div>
    </motion.div>
  );
};

export default PrivacyPage;

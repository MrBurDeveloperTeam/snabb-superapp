
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
        <p className="text-slate-500 font-medium">Last Updated: May 28, 2026</p>
      </div>

      <div className="prose prose-slate max-w-none space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
          <p className="text-slate-600 leading-relaxed">
            App.Snabbb (“Platform”) respects your privacy and is committed to protecting your information. By using the Platform, you agree to the collection and use of information in accordance with this Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Information Collection</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            The Platform may collect information including account details, usage data, inventory records, schedules, appointments, and other information voluntarily submitted by users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">3. ⁠Purpose of Information</h2>
          <p className="text-slate-600 leading-relaxed">
            Information collected may be used to operate, improve, maintain, personalize, and support the Platform and its services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">4. ⁠User Responsibility</h2>
          <p className="text-slate-600 leading-relaxed">
            Users are responsible for ensuring that any information uploaded, stored, or shared through the Platform complies with applicable laws and regulations.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">5. No Guarantee of Data Security</h2>
          <p className="text-slate-600 leading-relaxed">
            While reasonable efforts may be taken to protect information, the Company does not guarantee that the Platform will always be secure, uninterrupted, or free from unauthorized access.          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Third-Party Services</h2>
          <p className="text-slate-600 leading-relaxed">
            The Platform may use third-party services, hosting providers, analytics tools, or integrations. The Company is not responsible for the privacy practices or content of third-party services.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Data Storage & Backup</h2>
          <p className="text-slate-600 leading-relaxed">
            Users are responsible for maintaining their own backups and copies of important information stored on the Platform.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Changes to the Platform</h2>
          <p className="text-slate-600 leading-relaxed">
            The Company reserves the right to modify, suspend, or discontinue any part of the Platform or its services at any time without prior notice.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">9. Changes to Privacy Policy</h2>
          <p className="text-slate-600 leading-relaxed">
            The Company may update this Privacy Policy from time to time. Continued use of the Platform constitutes acceptance of any updated terms.
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

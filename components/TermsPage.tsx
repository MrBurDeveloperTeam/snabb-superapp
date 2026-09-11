
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
        <p className="text-slate-500 font-medium">Effective Date: May 28, 2026</p>
      </div>

      <div className="prose prose-slate max-w-none space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
          <p className="text-slate-600 leading-relaxed">
            Welcome to App.Snabbb (“Platform”). By accessing or using the Platform, you agree to comply with and be bound by these Terms of Use.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">2. ⁠Purpose of Platform</h2>
          <p className="text-slate-600 leading-relaxed">
            The Platform provides general productivity, workflow support, educational, and operational tools for users and businesses.
            <br/>
            The Platform is not intended to replace certified accounting systems, medical record systems, audit systems, clinical management software, or regulatory compliance systems.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">3. User Responsibility</h2>
          <p className="text-slate-600 leading-relaxed">
            Users are solely responsible for verifying the accuracy, completeness, and suitability of any data, schedules, calculations, inventory records, appointments, or information generated or stored through the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">4. No Warranty</h2>
          <p className="text-slate-600 leading-relaxed">
            The Platform and its services are provided on an “as-is” and “as-available” basis without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Limitation of Liability</h2>
          <p className="text-slate-600 leading-relaxed">
            The Company shall not be liable for any loss, damages, operational interruption, business decisions, compliance issues, or claims arising from the use or inability to use the Platform or its tools.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Data & Privacy</h2>
          <p className="text-slate-600 leading-relaxed">
            Users are responsible for maintaining their own backups and ensuring compliance with applicable data protection and privacy regulations.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Platform Availability</h2>
          <p className="text-slate-600 leading-relaxed">
            The Company may modify, suspend, or discontinue any part of the Platform or its features at any time without prior notice.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Intellectual Property</h2>
          <p className="text-slate-600 leading-relaxed">
            All Platform content, branding, software, designs, and materials remain the intellectual property of the Company unless otherwise stated.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">9. Account Termination</h2>
          <p className="text-slate-600 leading-relaxed">
            The Company reserves the right to suspend or terminate accounts that misuse the Platform or violate these Terms of Use.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default TermsPage;

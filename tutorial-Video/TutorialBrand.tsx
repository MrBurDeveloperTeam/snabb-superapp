import React from 'react';
import { SnabbbIcon } from '../public/icons/SnabbbIcon';

interface TutorialBrandProps {
  onHome: () => void;
  showBack?: boolean;
}

const TutorialBrand: React.FC<TutorialBrandProps> = ({ onHome, showBack = false }) => (
  <div className="flex items-center gap-4">
    {showBack && (
      <button type="button" onClick={() => window.history.back()} className="text-sm font-bold text-slate-500 hover:text-tiffany-600 transition-colors">
        <span aria-hidden="true">←</span> Back
      </button>
    )}
    {showBack && <span className="h-6 w-px bg-slate-200" aria-hidden="true" />}
    <button type="button" onClick={onHome} className="flex items-center gap-1 text-left" aria-label="Return to the App.Snabbb home page">
      <span className="font-extrabold text-xl tracking-tighter text-slate-900" style={{ transform: 'skewX(353deg)', display: 'inline-block' }}>App.</span>
      <span className="text-xl"><SnabbbIcon /></span>
    </button>
    <span className="rounded-full bg-tiffany-100 px-3 py-1 text-xs font-extrabold text-tiffany-700">Tutorials</span>
  </div>
);

export default TutorialBrand;

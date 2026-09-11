import React from 'react';
import { SnabbbIcon } from '../public/icons/SnabbbIcon';

interface TutorialBrandProps {
  onHome: () => void;
}

const TutorialBrand: React.FC<TutorialBrandProps> = ({ onHome }) => (
  <button
    type="button"
    className="tutorial-brand flex cursor-pointer items-center gap-2 text-left sm:gap-3"
    onClick={onHome}
    aria-label="Return to the App.Snabbb home page"
  >
    <span className="font-extrabold text-lg tracking-tighter text-slate-900 sm:text-2xl">
      <span style={{ transform: 'skewX(353deg)', display: 'inline-block' }}>App.</span>
      <SnabbbIcon />
    </span>
  </button>
);

export default TutorialBrand;

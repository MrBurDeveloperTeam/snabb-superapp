import React, { useEffect, useRef, useState } from 'react';

interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  options: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/**
 * A typeable, filterable dropdown that behaves like a <select> for the
 * purposes of react-hook-form (value/onChange in, committed string out),
 * but renders as a real text <input>.
 *
 * Why: a native <select> with a long option list (e.g. every country)
 * opens the OS picker on mobile, which has no way to type/search - users
 * are stuck scrolling through hundreds of options one at a time. A text
 * input brings up the normal mobile keyboard, so typing a few letters
 * narrows the list immediately, on both mobile and desktop.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  name,
  value,
  options,
  placeholder = 'Select...',
  className,
  required,
  onChange,
  onBlur,
}) => {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the displayed text in sync when the committed value changes
  // from outside (initial load, form reset, etc).
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed === ''
    ? options
    : options.filter((opt) => opt.toLowerCase().includes(trimmed));

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Typed text that doesn't match a real option never becomes the
        // committed value - snap the display back to what's actually set.
        setQuery(value || '');
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, value, onBlur]);

  const commitSelection = (option: string) => {
    onChange(option);
    setQuery(option);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        commitSelection(filtered[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(value || '');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        inputMode="text"
        className={className}
        value={query}
        placeholder={placeholder}
        required={required}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-slate-400">No matches found</li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt}
                className={`px-4 py-2 cursor-pointer text-slate-700 ${idx === highlightIndex ? 'bg-tiffany-50 text-tiffany-700' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); commitSelection(opt); }}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import type { ThemeMode } from "../store/themeStore";

const THEME_META: Record<
  ThemeMode,
  { icon: string; label: string; title: string }
> = {
  light: { icon: "fa-solid fa-sun", label: "Light", title: "Light mode (click for dark)" },
  dark: { icon: "fa-solid fa-moon", label: "Dark", title: "Dark mode (click for system)" },
  system: {
    icon: "fa-solid fa-circle-half-stroke",
    label: "System",
    title: "System mode (click for light)",
  },
};

/**
 * Header theme switcher. Cycles light -> dark -> system on click.
 * Uses Font Awesome icons (loaded app-wide via CDN) to match the
 * existing icon language of the header.
 */
const ThemeToggle: React.FC = () => {
  const { theme, toggle } = useTheme();
  const meta = THEME_META[theme];

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      aria-label={meta.title}
      title={meta.title}
      className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
    >
      <i className={`${meta.icon} text-base`} />
      <span className="sr-only">{meta.label}</span>
    </motion.button>
  );
};

export default ThemeToggle;

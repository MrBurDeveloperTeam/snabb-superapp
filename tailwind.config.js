/** @type {import('tailwindcss').Config} */
// Replaces window.__tailwindConfig that used to be fed to cdn.tailwindcss.com.
// Pinned to Tailwind 3.4.17 (the version the CDN served) so utilities match.
export default {
  // Follow the app's own light/dark toggle (the `.dark` class on <html>), not
  // the OS preference.
  darkMode: 'class',
  content: [
    './index.html',
    './*.{ts,tsx}',
    './{VirtualPet,aiExperience,components,constants,features,hooks,lib,mutation,petExperience,services,shared,sharedPet,store,subuser,supabase,ticketing,tutorial-Video,types,utils}/**/*.{ts,tsx,js,jsx}',
    // @mrburdeveloperteam/pet-function ships its own compiled CSS (imported in
    // index.tsx), so it is intentionally not scanned here.
  ],
  theme: {
    extend: {
      colors: {
        tiffany: {
          50: '#f0fdfb',
          100: '#ccfbf4',
          200: '#99f5e9',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0abfbc',
          700: '#089a98',
          800: '#0a7a78',
          900: '#0c5f5e',
        },
      },
    },
  },
  plugins: [],
};

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import getTracker from '../lib/tracker';

/**
 * TrackerProvider — wraps your app to auto-track page views on route changes.
 * Uses React Router's useLocation (plain React / Vite setup).
 *
 * Usage in App.tsx:
 *   <Router>
 *     <TrackerProvider>
 *       <YourRoutes />
 *     </TrackerProvider>
 *   </Router>
 */
export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const url = location.pathname + location.search;
    if (prevPath.current === url) return;
    prevPath.current = url;
    getTracker().pageView(url);
  }, [location]);

  return <>{children}</>;
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import getTracker from '../lib/tracker';

/**
 * TrackerProvider
 *
 * Drop this in your root layout to automatically track:
 * - Page views on every route change
 * - Duration when the user navigates away
 *
 * Usage in app/layout.tsx:
 *   import { TrackerProvider } from '@/components/TrackerProvider';
 *   <TrackerProvider>
 *     {children}
 *   </TrackerProvider>
 */
export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    // Skip if same path (e.g. searchParams didn't change meaningfully)
    if (prevPath.current === url) return;
    prevPath.current = url;

    getTracker().pageView(url);
  }, [pathname, searchParams]);

  return <>{children}</>;
}

import { useCallback } from 'react';
import getTracker, { EventType } from '../lib/tracker';

/**
 * useTracker — React hook that exposes the Snabbb tracker.
 *
 * Usage:
 *   const { track, click, featureUsage, search } = useTracker();
 *   <button onClick={() => click('add-product-btn', { product_id: 123 })}>
 */
export function useTracker() {
  const tracker = getTracker();

  const track = useCallback(
    (eventType: EventType, extra?: Parameters<typeof tracker.track>[1]) => {
      tracker.track(eventType, extra);
    },
    [tracker]
  );

  const click = useCallback(
    (element: string, metadata?: Record<string, unknown>) => {
      tracker.click(element, metadata);
    },
    [tracker]
  );

  const featureUsage = useCallback(
    (feature: string, metadata?: Record<string, unknown>) => {
      tracker.featureUsage(feature, metadata);
    },
    [tracker]
  );

  const tabChange = useCallback(
    (tabName: string, metadata?: Record<string, unknown>) => {
      tracker.tabChange(tabName, metadata);
    },
    [tracker]
  );

  const filterChange = useCallback(
    (filterName: string, value: unknown) => {
      tracker.filterChange(filterName, value);
    },
    [tracker]
  );

  const search = useCallback(
    (query: string, resultsCount?: number) => {
      tracker.search(query, resultsCount);
    },
    [tracker]
  );

  const login = useCallback(
    (metadata?: Record<string, unknown>) => {
      tracker.login(metadata);
    },
    [tracker]
  );

  const signup = useCallback(
    (metadata?: Record<string, unknown>) => {
      tracker.signup(metadata);
    },
    [tracker]
  );

  const logout = useCallback(() => {
    tracker.logout();
  }, [tracker]);

  return {
    track,
    click,
    featureUsage,
    tabChange,
    filterChange,
    search,
    login,
    signup,
    logout,
  };
}

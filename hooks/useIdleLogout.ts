import { useEffect, useRef } from 'react';

export const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
export const IDLE_STORAGE_KEY = 'snabbb_last_activity';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];
const WRITE_THROTTLE_MS = 10 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

const readLast = (): number => {
  try {
    const v = Number(localStorage.getItem(IDLE_STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
};

const writeLast = (ts: number) => {
  try {
    localStorage.setItem(IDLE_STORAGE_KEY, String(ts));
  } catch {
    /* ignore */
  }
};

export const clearIdleActivity = () => {
  try {
    localStorage.removeItem(IDLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Logs the user out after `timeoutMs` without activity.
 * The last-activity timestamp lives in localStorage, so activity in any
 * tab of app.snabbb.com keeps every tab alive, and a tab that wakes up
 * after the computer slept past the limit logs out immediately.
 */
export function useIdleLogout(
  enabled: boolean,
  onIdle: () => void,
  timeoutMs: number = IDLE_TIMEOUT_MS
) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    firedRef.current = false;

    // Missing timestamp = fresh login, treat as active now.
    // An old timestamp is honoured (user was away longer than the timeout).
    if (!readLast()) writeLast(Date.now());

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      writeLast(now);
    };

    const check = () => {
      if (firedRef.current) return;
      const last = readLast();
      if (last && Date.now() - last >= timeoutMs) {
        firedRef.current = true;
        clearIdleActivity();
        onIdleRef.current();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true, capture: true })
    );
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    check();

    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, onActivity, { capture: true } as any)
      );
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, [enabled, timeoutMs]);
}

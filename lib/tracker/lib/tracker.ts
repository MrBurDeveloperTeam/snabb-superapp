/**
 * Snabbb Behaviour Tracker
 * Sends events to MR. BUR Odoo backend /web/tracker/event
 */

const ENDPOINT = '/api/tracker/event'; // proxied via Cloudflare Worker to avoid CORS

export type EventType =
  | 'page_view'
  | 'click'
  | 'feature_usage'
  | 'login'
  | 'signup'
  | 'logout'
  | 'search'
  | 'tab_change'
  | 'filter_change';

export interface TrackEvent {
  event_type: EventType;
  url?: string;
  referrer?: string;
  element?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface TrackerUser {
  partner_id?: number;
  email?: string;
  name?: string;
}

class SnabbbTracker {
  private sessionId: string;
  private pageStart: number = Date.now();
  private user: TrackerUser = {};

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.setupPageViewBeacon();
  }

  setUser(user: TrackerUser) {
    this.user = user;
  }

  clearUser() {
    this.user = {};
  }

  private getOrCreateSessionId(): string {
    try {
      let sid = sessionStorage.getItem('snabbb_tracker_sid');
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('snabbb_tracker_sid', sid);
      }
      return sid;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }

  private setupPageViewBeacon() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.track('page_view', {
          duration: Math.round((Date.now() - this.pageStart) / 1000),
        }, true);
      }
    });
  }

  track(
    eventType: EventType,
    extra: Omit<TrackEvent, 'event_type'> = {},
    useBeacon = false
  ): void {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        event_type: eventType,
        url: typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '',
        referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
        session_id: this.sessionId,
        source: 'snabbb',
        snabbb_user: this.user.email || null,
        snabbb_partner_id: this.user.partner_id || null,
        ...extra,
      },
    });

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {}); // never throw
    }
  }

  // ── Convenience methods ────────────────────────────────────────────────────

  pageView(url?: string) {
    this.pageStart = Date.now();
    this.track('page_view', { url: url || window.location.pathname });
  }

  click(element: string, metadata?: Record<string, unknown>) {
    this.track('click', { element, metadata });
  }

  featureUsage(feature: string, metadata?: Record<string, unknown>) {
    this.track('feature_usage', { element: feature, metadata });
  }

  tabChange(tabName: string, metadata?: Record<string, unknown>) {
    this.track('tab_change', { element: tabName, metadata });
  }

  filterChange(filterName: string, value: unknown) {
    this.track('filter_change', { element: filterName, metadata: { value } });
  }

  search(query: string, resultsCount?: number) {
    this.track('search', {
      element: 'search',
      metadata: { query, results_count: resultsCount ?? null },
    });
  }

  login(metadata?: Record<string, unknown>) {
    this.track('login', { metadata });
  }

  signup(metadata?: Record<string, unknown>) {
    this.track('signup', { metadata });
  }

  logout() {
    this.track('logout');
  }
}

// Singleton — safe for SSR (only instantiated client-side)
let _tracker: SnabbbTracker | null = null;

export function getTracker(): SnabbbTracker {
  if (typeof window === 'undefined') {
    // SSR: return a no-op proxy
    return new Proxy({} as SnabbbTracker, {
      get: () => () => {},
    });
  }
  if (!_tracker) {
    _tracker = new SnabbbTracker();
  }
  return _tracker;
}

export default getTracker;

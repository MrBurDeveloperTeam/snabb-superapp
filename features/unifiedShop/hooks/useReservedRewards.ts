import { useQuery } from '@tanstack/react-query';
import { useUnifiedCartStore } from '../store/unifiedCartStore';

/**
 * A Snabbb reward the shopper has redeemed and that Odoo has already put
 * into their cart (snabbb_reward_state === 'reserved' on the loyalty.card —
 * see snabbb_discount_loyalty_reward_api). It's a free line on the real Odoo
 * order, so it never exists in the local zustand cart; this is how the
 * header badge and CartDrawer know about it.
 */
export interface ReservedReward {
  id: number;
  code: string;
  name: string;
  benefitSummary: string;
  validUntil: string;
}

export const RESERVED_REWARDS_QUERY_KEY = ['snabbb-shop', 'reserved-rewards'] as const;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isExpired(validUntil: string): boolean {
  if (!validUntil) return false;
  const date = new Date(validUntil.includes('T') ? validUntil : validUntil.replace(' ', 'T') + 'Z');
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

/**
 * Same-origin call to the Cloudflare Worker's /api/reward/my route (the one
 * reward.snabbb.com's "My Rewards" uses) — the Worker adds the API key, so no
 * secret lives in this bundle.
 */
async function fetchReservedRewards(email: string): Promise<ReservedReward[]> {
  const res = await fetch(`/api/reward/my?email=${encodeURIComponent(email)}`, {
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  const raw = await res.json().catch(() => null);
  const payload = raw?.result || raw;
  if (!res.ok || payload?.ok !== true || !Array.isArray(payload.redemptions)) return [];

  return (payload.redemptions as Record<string, unknown>[])
    .filter((r) => (str(r.state) || str(r.status)).toLowerCase() === 'reserved')
    .filter((r) => str(r.code) && !isExpired(str(r.valid_until)))
    .map((r) => ({
      id: Number(r.id || 0),
      code: str(r.code),
      name: str(r.reward_name) || str(r.name) || 'Reward',
      benefitSummary: str(r.benefit_summary),
      validUntil: str(r.valid_until),
    }));
}

/** Rewards already sitting in the shopper's Odoo cart (empty while signed out / on error). */
export function useReservedRewards(): ReservedReward[] {
  const email = useUnifiedCartStore((s) => s.ownerId);
  const { data } = useQuery({
    queryKey: [...RESERVED_REWARDS_QUERY_KEY, email] as const,
    queryFn: () => fetchReservedRewards(email as string),
    enabled: Boolean(email),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return data ?? [];
}

/** Header cart badge: local cart items plus rewards already reserved in the Odoo cart. */
export function useUnifiedCartBadgeCount(): number {
  const localCount = useUnifiedCartStore((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));
  const rewards = useReservedRewards();
  return localCount + rewards.length;
}

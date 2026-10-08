import { useEffect, useMemo, useState } from 'react';
import { fetchUomPrices } from '../api/checkoutApi';
import type { UnifiedProduct } from '../types';

export interface UnitChoice {
  id: number;
  name: string;
  price: number;
}

/**
 * Unit selection for one product. The catalog only ships the unit names
 * (cheap); the price of one of each unit is fetched lazily — only when a
 * product with more than one unit is opened — and cached for the session.
 */
const cache = new Map<number, UnitChoice[]>();

export function useProductUnit(product: UnifiedProduct | null | undefined) {
  const [choices, setChoices] = useState<UnitChoice[]>([]);
  const [unitId, setUnitId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnitId(product?.unitId);
    setChoices([]);
    if (!product || (product.uoms?.length ?? 0) < 2) return undefined;
    const cached = cache.get(product.id);
    if (cached) {
      setChoices(cached);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchUomPrices(product.id)
      .then((res) => {
        if (cancelled || !res.ok) return;
        cache.set(product.id, res.uoms);
        setChoices(res.uoms);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => choices.find((c) => c.id === unitId), [choices, unitId]);
  return {
    /** Units to render in the select (names only until prices arrive). */
    options: choices.length ? choices : (product?.uoms ?? []).map((u) => ({ ...u, price: NaN })),
    unitId,
    setUnitId,
    loading,
    /** Chosen unit with its price, or undefined while using the default. */
    selected,
    price: selected?.price ?? product?.price ?? 0,
  };
}

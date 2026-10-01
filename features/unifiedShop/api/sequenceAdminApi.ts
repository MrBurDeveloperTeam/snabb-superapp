import type { ShopBrand } from '../types';

const BASE = '/api/snabbb-shop/admin/sequence';

export interface SequenceProduct {
  id: number;
  name: string;
  sku: string;
  sequence: number;
  imageUrl: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body
  }
  if (!res.ok) {
    throw new Error(
      data?.error ||
        (res.status === 404
          ? 'Sequence admin is not deployed on the server yet.'
          : `Request failed (${res.status})`)
    );
  }
  return data as T;
}

export async function fetchSequenceProducts(brand: ShopBrand): Promise<SequenceProduct[]> {
  const data = await post<{ products: SequenceProduct[] }>('', { brand });
  return data.products;
}

export function saveSequence(orderedIds: number[]): Promise<{ ok: boolean; count: number }> {
  return post('/save', { orderedIds });
}

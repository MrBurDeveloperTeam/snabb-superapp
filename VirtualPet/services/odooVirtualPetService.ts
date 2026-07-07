import { PetStats } from '../types';

export interface VirtualPetIdentity {
  email?: string | null;
  externalUserId?: string | null;
  supabaseUserId?: string | null;
}

export interface VirtualPetSavedState extends VirtualPetIdentity {
  pet_name?: string | null;
  has_adopted_pet?: boolean;
  stats: PetStats;
  inventory: Record<string, number>;
  is_sleeping: boolean;
  active_ball_id: string;
  active_bed_id?: string | null;
}

export interface VirtualPetStateResponse {
  ok: boolean;
  exists?: boolean;
  state?: {
    pet_name?: string | null;
    has_adopted_pet?: boolean;
    stats?: Partial<PetStats>;
    inventory?: Record<string, number>;
    is_sleeping?: boolean;
    active_ball_id?: string | null;
    active_bed_id?: string | null;
    updated_at?: string | null;
  };
  error?: string;
}

type RuntimeConfig = {
  virtualPetApiUrl?: string;
};

declare global {
  interface Window {
    __SNABBB_CONFIG__?: RuntimeConfig;
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getApiBaseUrl = () => {
  const runtimeUrl = window.__SNABBB_CONFIG__?.virtualPetApiUrl?.trim();
  const envUrl = import.meta.env?.VITE_VIRTUAL_PET_API_URL?.trim?.();
  return trimTrailingSlash(runtimeUrl || envUrl || 'https://app.snabbb.com/api/virtual-pet');
};

export const getStoredExternalUserId = () => {
  try {
    return localStorage.getItem('external_user_id') || undefined;
  } catch {
    return undefined;
  }
};

function appendIdentityParams(url: URL, identity: VirtualPetIdentity) {
  if (identity.email) url.searchParams.set('email', identity.email);
  if (identity.externalUserId) url.searchParams.set('external_user_id', identity.externalUserId);
  if (identity.supabaseUserId) url.searchParams.set('supabase_user_id', identity.supabaseUserId);
}

export async function fetchVirtualPetState(identity: VirtualPetIdentity): Promise<VirtualPetStateResponse> {
  const url = new URL(`${getApiBaseUrl()}/state`, window.location.origin);
  appendIdentityParams(url, identity);

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `Virtual pet state load failed with status ${response.status}.`);
  }
  return payload;
}

export async function saveVirtualPetState(state: VirtualPetSavedState): Promise<VirtualPetStateResponse> {
  const response = await fetch(`${getApiBaseUrl()}/state`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(state),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error || `Virtual pet state save failed with status ${response.status}.`);
  }
  return payload;
}

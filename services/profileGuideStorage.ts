export const PROFILE_GUIDE_DISMISSALS_KEY = 'snabbb-profile-guide-dismissals';

const normalizeOwner = (owner: string) => owner.trim().toLowerCase();

function readDismissals(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROFILE_GUIDE_DISMISSALS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isProfileGuideDismissed(owner: string): boolean {
  return !!normalizeOwner(owner) && readDismissals().includes(normalizeOwner(owner));
}

export function dismissProfileGuide(owner: string): void {
  const normalized = normalizeOwner(owner);
  if (!normalized) return;
  try {
    localStorage.setItem(PROFILE_GUIDE_DISMISSALS_KEY, JSON.stringify([...new Set([...readDismissals(), normalized])]));
  } catch {
    // The component still dismisses the guide for this session if storage is unavailable.
  }
}

// Single place to resolve the destinations Phase 1A action buttons can point
// to, so the route strings aren't duplicated between providers and so
// navigation always goes through a small, known set of destinations.
import { MINI_APPS } from '@/constants';

const FALLBACK_INVENTORY_ROUTE = 'https://inventory.snabbb.com/';
const PROFILE_SETTINGS_ROUTE = '/profile-settings';

export function getInventoryAppRoute(): string {
  const app = MINI_APPS.find((a) => a.title === 'Inventory');
  return app?.route || FALLBACK_INVENTORY_ROUTE;
}

export function getProfileSettingsRoute(): string {
  return PROFILE_SETTINGS_ROUTE;
}

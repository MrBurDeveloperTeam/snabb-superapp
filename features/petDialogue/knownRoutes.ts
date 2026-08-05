// Single place to resolve the destinations Phase 1A action buttons can point
// to, so the route strings aren't duplicated between providers and so
// navigation always goes through a small, known set of destinations.
import { MINI_APPS } from '@/constants';

const FALLBACK_INVENTORY_ROUTE = 'https://inventory.snabbb.com/';
const FALLBACK_TODO_ROUTE = 'https://todo.snabbb.com/';
const PROFILE_SETTINGS_ROUTE = '/profile-settings';

export function getInventoryAppRoute(): string {
  const app = MINI_APPS.find((a) => a.title === 'Inventory');
  return app?.route || FALLBACK_INVENTORY_ROUTE;
}

/** The Todo app's landing page only — never a task-detail path, which
 *  doesn't exist as a controlled destination. */
export function getTodoAppRoute(): string {
  const app = MINI_APPS.find((a) => a.title === 'To-Do Manager');
  return app?.route || FALLBACK_TODO_ROUTE;
}

export function getProfileSettingsRoute(): string {
  return PROFILE_SETTINGS_ROUTE;
}

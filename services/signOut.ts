import api from "./api";
import { PROFILE_GUIDE_DISMISSALS_KEY } from './profileGuideStorage';

// localStorage also holds app state that has nothing to do with the login
// session — most importantly the Zustand-persisted Unified Shop cart
// ('snabbb-unified-shop-cart'). A blanket localStorage.clear() wipes that
// out along with the session, which is why items added to the cart
// disappear the moment the user logs out to log back in. Whitelist the
// keys that must survive a logout, restore them after the clear.
const KEYS_TO_PRESERVE_ON_LOGOUT = [
  PROFILE_GUIDE_DISMISSALS_KEY, // Per-user profile guide dismissals
  'snabbb-unified-shop-cart', // Unified Shop cart (Zustand persist)
];

export const signOut = async () => {
  await api.post('/logout', {});

  const preserved: Record<string, string> = {};
  for (const key of KEYS_TO_PRESERVE_ON_LOGOUT) {
    const value = localStorage.getItem(key);
    if (value !== null) preserved[key] = value;
  }

  localStorage.clear();
  sessionStorage.clear();

  for (const [key, value] of Object.entries(preserved)) {
    localStorage.setItem(key, value);
  }
};

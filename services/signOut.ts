import api from "./api";

export const signOut = async () => {
  try {
    const res = await api.post("/auth/logout");
    return { loggedIn: false, user: null };
  } catch {
    return { loggedIn: false, user: null };
  }
};
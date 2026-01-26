import api from "./api";

export const checkAuth = async () => {
  try {
    const res = await api.get("/protected");
    return { loggedIn: true, user: res.data };
  } catch {
    return { loggedIn: false, user: null };
  }
};
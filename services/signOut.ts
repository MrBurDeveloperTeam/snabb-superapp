import api from "./api";

export const signOut = async () => {
  await api.post('/logout', {});
  localStorage.clear();
  sessionStorage.clear();
};
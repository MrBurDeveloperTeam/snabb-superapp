import api from "./api";

export const signOut = async () => {
  await api.post('/logout', {});
  localStorage.removeItem("pet_stats");
  localStorage.removeItem("odoo_session");
  sessionStorage.clear();
};
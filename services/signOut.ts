import api from "./api";

export const signOut = async () => {
  await api.post('/logout', {});
  localStorage.removeItem("odoo_session");
  sessionStorage.clear();
};
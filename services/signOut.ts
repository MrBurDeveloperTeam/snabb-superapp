import api from "./api";

export const signOut = async () => {
  api.post('/logout', {});
  localStorage.removeItem("odoo_session");
  sessionStorage.clear();
};
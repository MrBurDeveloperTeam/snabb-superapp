export const getSessionInfo = async () => {
  const sessionData = localStorage.getItem("odoo_session");
  if (sessionData) {
    return JSON.parse(sessionData);
  }
  return null;
};
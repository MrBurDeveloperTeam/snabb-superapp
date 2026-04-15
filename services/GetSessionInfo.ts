import api from "./api";

export const getSessionInfo = async () => {
  const response = await api.post('/web/session/get_session_info', {});
  if(response.data.error) {
    throw new Error(response.data.error.message);
  }
  const data = await response.data;
  return data.result;
};

export const getSessionInfoWithRetry = async (retries = 3, delay = 1000): Promise<any> => {
  const res = await fetch("https://app.snabbb.com/api/odoo/session_info", {
  method: "GET",
  credentials: "include",
});

const data = await res.json();
console.log(data);
};
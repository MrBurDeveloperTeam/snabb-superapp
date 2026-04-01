import api from "./api";

export const getSessionInfo = async () => {
  const response = await api.post('/web/session/get_session_info', {});
  if(response.data.error) {
    throw new Error(response.data.error.message);
  }
  const data = await response.data;
  return data.result;
};
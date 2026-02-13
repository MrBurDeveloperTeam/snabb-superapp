import api from "./api";

export const getSessionInfo = async () => {
  const response = await api.post('/web/session/get_session_info', {});
  console.log("Session Info Response: ", response);
  const data = await response.data;
  return data.result;
};
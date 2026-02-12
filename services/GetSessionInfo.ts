import api from "./api";

export const getSessionInfo = async () => {
  console.log('getting this')
  const response = await api.post('/web/session/get_session_info', {});

  const data = await response.data;
  return data.result;
};
import api from "./api";

type LocationResponse = {
  ip?: string;
  country_code?: string;
};


export const getSessionInfo = async () => {
  const response = await api.post('/web/session/get_session_info', {});
  if(response.data.error) {
    throw new Error(response.data.error.message);
  }
  const data = await response.data;
  return data.result;
};

export const getLocationInfo = async (): Promise<LocationResponse> => {
  try {
    const res = await fetch("/api/location", {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to get location: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("location error:", error);
    return { country_code: "MY" };
  }
};
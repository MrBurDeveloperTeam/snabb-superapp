import api from "./api";

export const fetchSomeData = async () => {
  try {
    const response = await api.get("/protected"); 
    return response.data;
  } catch (err: any) {
    console.error("Failed to fetch data:", err);
    throw err;
  }
};
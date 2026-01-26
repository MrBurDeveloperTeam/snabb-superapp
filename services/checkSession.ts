import api from "./api"; // Axios instance with withCredentials: true

export const checkSession = async () => {
  try {
    const response = await api.get("/protected"); // Calls /api/protected
    return { loggedIn: true, user: response.data };
  } catch (err) {
    return { loggedIn: false, user: null };
  }
};
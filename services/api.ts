import axios from "axios";

const api = axios.create({
  baseURL: "/api",       
  withCredentials: true, 
});

// api.interceptors.request.use(
//   async (config) => {
//     try {
//       await api.get("/protected");
//       return config;
//     } catch (err: any) {
//       console.error("JWT invalid or expired, redirect to login");
//       window.location.href = "/login";
//       return Promise.reject(err);
//     }
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

export default api;

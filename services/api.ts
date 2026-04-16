import axios from "axios";

const api = axios.create({
  baseURL: "/api",       
  withCredentials: true, 
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-SSO-API-KEY": "my-sso-secret-123",
  },
});

export const redirection = async (app: string, email: string, name: string) => {
  try {
     const res = await api.post('/v1/sso/app_link', {
                  "jsonrpc": "2.0",
                  "method": "call",
                  "params": {
                    "app_code": app,
                    "email": email,
                    "name": name,
                    "company_id": 2,
                    "portal": true
                  },
                  "id": 1
                });
    return res.data;
  } catch (err: any) {
    console.error("Redirection error:", err);
    return new Error(err.message || "SSO redirection failed");
    //throw new Error(err.message || "SSO redirection failed");
  }
}

export default api;

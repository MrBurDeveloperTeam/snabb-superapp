import axios from "axios";
import api from "./api";

export const loginOdoo = async (email: string, password: string) => {
  const url = "/web/session/authenticate";
  const db = "mrbur-staging-bur-26090883";

  try {
    const response = await api.post(url, {
      "jsonrpc": "2.0",
      "method": "call",
      "params": {
        "db": "mrbur-staging-bur-26090883",
        "login": email,
        "password": password
      },
      "id": 1
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response.data; 
  } catch (err: any) {
    throw new Error(err.message || "Odoo login failed");
  }
};

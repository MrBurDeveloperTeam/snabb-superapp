import axios from "axios";

export const loginOdoo = async (email: string, password: string) => {
  const url = "/api/auth/login";
  const db = "odoodb";

  try {
    const response = await axios.post(url, {
      db: db,
      login: email,
      password: password
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response; 
  } catch (err: any) {
    throw new Error(err.message || "Odoo login failed");
  }
};

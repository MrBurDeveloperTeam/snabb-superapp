import { SignupFormInputs } from "@/features/auth/types/SignUpFormInputs";
import axios from "axios";

export const signupOdoo = async ({login, password, fullName, jobPosition, customJobPosition, phone}: SignupFormInputs) => {
  const url = "/api/auth/signup";
  const db = "odoodb";

  try {
    const response = await axios.post(url, {
      db: db,
      email: login,
      password: password,
      fullName: fullName,
      jobPosition: jobPosition,
      customJobPosition: customJobPosition,
      phone: phone
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response; 
  } catch (err: any) {
    throw new Error(err.message || "Odoo login failed");
  }
};

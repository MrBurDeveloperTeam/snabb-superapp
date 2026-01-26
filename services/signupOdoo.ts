import { SignupFormInputs } from "@/features/auth/types/SignUpFormInputs";
import { odooPublic } from "./public";
import axios from "axios";

export const signupOdoo = async ({login, password, fullName, jobPosition, customJobPosition, phone}: SignupFormInputs) => {
  const url = "/api/auth/signup";
  const db = "odoodb";

  try {
    const response = await await axios.post(
  url,
  {
    email: login,
    fullName,
    phone,
    jobPosition,
    customJobPosition,
    password
  },
  { withCredentials: false, headers: { "Content-Type": "application/json" } }
);

    if (response.data.error) {
      console.log('err res:',response.data.error)
      throw new Error(response.data.error.message);
    }
    return response; 
  } catch (err: any) {
    console.log('err:',err)
    throw new Error(err.message || "Odoo login failed");
  }
};

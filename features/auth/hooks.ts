import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { LoginFormInputs } from "./types/LoginPageProps";
import { getSessionInfo } from "@/services/GetSessionInfo";

export const loginMutation = useMutation({
    mutationFn: async (data: LoginFormInputs) => {
      const loginResult = await loginOdoo(data.email, data.password);
      const sessionInfo = await getSessionInfo(data.email, data.password, loginResult.data);
      return { sessionInfo }; 
    },
    onSuccess: ({ sessionInfo }) => {
      localStorage.setItem('odoo_session', JSON.stringify(sessionInfo));
    },
    onError: (err: any) => {
      console.error("Login failed:", err.message);
      alert(err.message); 
    },
  });
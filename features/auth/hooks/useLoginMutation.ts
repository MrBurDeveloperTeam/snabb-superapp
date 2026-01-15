import { loginOdoo } from "@/services/LoginOdoo";
import { getSessionInfo } from "@/services/GetSessionInfo";
import { useMutation } from "@tanstack/react-query";
import { LoginFormInputs } from "@/features/auth/types/LoginPageProps";

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: async (data: LoginFormInputs) => {
      const loginResult = await loginOdoo(data.email, data.password);
      // const JWT = await issueJWT();
      const sessionInfo = await getSessionInfo(data.email, data.password, loginResult.data); 
      return { sessionInfo };
    },
    onSuccess: ({ sessionInfo }) => {
      localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
    },
    onError: (err: any) => {
      console.error("Login failed:", err.message);
      alert(err.message);
    },
  });
};

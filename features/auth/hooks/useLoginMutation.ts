import { loginOdoo } from "@/services/LoginOdoo";
import { getSessionInfo } from "@/services/GetSessionInfo";
import { useMutation } from "@tanstack/react-query";
import { LoginFormInputs } from "@/features/auth/types/LoginPageProps";

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
    mutationFn: async (data: LoginFormInputs) => {
      const loginResult = await loginOdoo(data.login, data.password);
      console.log('loginResult:', loginResult);
      return { sessionInfo: loginResult.data.result };
    },
    onSuccess: ({ sessionInfo }) => {
      localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
      onAuthSuccess();
    },
    onError: ({ error }: any) => {
      return { error };
    },
  });
};

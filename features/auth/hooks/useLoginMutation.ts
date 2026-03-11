import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { AuthFormInputs } from "../types/AuthFormInputs";

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
    mutationFn: async (data: AuthFormInputs) => {
      const loginResult = await loginOdoo(data.login, data.password);
      return { sessionInfo: loginResult.result };
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

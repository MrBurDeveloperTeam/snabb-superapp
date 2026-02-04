import { useMutation } from "@tanstack/react-query";
import { authOdoo } from "@/services/authOdoo";
import { AuthFormInputs } from "../types/AuthFormInputs";

export const useAuthMutation = () => {
  return useMutation({
    mutationFn: async (data: AuthFormInputs) => {
      const authResult = await authOdoo({...data});
      return authResult.data;
    },
    onSuccess: (authResult: any) => {
      console.log("Auth successful:", authResult);
    },
    onError: (err: any) => {
      console.error("auth failed:", err.message);
    },
  });
};

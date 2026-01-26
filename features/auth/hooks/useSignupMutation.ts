import { loginOdoo } from "@/services/LoginOdoo";
import { getSessionInfo } from "@/services/GetSessionInfo";
import { useMutation } from "@tanstack/react-query";
import { LoginFormInputs } from "@/features/auth/types/LoginPageProps";
import { signupOdoo } from "@/services/signupOdoo";
import { SignupFormInputs } from "../types/SignUpFormInputs";

export const useSignupMutation = () => {
  return useMutation({
    mutationFn: async (data: SignupFormInputs) => {
      const signupResult = await signupOdoo({...data});
      return signupResult;
    },
    onSuccess: () => {
    },
    onError: (err: any) => {
      console.error("Login failed:", err.message);
      alert(err.message);
    },
  });
};

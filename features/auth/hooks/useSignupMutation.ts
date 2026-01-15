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
      console.log('signupResult: ',signupResult);
      // const JWT = await issueJWT();
      //   const sessionInfo = await getSessionInfo(data.email, data.password, loginResult.data); 
      //   return { sessionInfo };
    },
    onSuccess: () => {
    },
    onError: (err: any) => {
      console.error("Login failed:", err.message);
      alert(err.message);
    },
  });
};

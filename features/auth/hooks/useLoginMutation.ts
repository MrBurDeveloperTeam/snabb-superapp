import { loginOdoo } from "@/services/LoginOdoo";
import { useMutation } from "@tanstack/react-query";
import { AuthFormInputs } from "../types/AuthFormInputs";

export const useLoginMutation = (onAuthSuccess: () => void) => {
  return useMutation({
    mutationFn: async (data: AuthFormInputs) => {
      const { data: loginResult } = await loginOdoo(data.login, data.password);
      return {
        sessionInfo: loginResult.result,
        seed_entry_url: loginResult.seed_entry_url ?? null,
      };
    },
    onSuccess: ({ sessionInfo, seed_entry_url }) => {
      localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));

      if (seed_entry_url) {
        // Redirect browser through the seed chain.
        // Chain: mrbur.odoo.com/sso/seed → my.mrbur.shop/sso/seed → app.snabbb.com/home
        // Each hop sets session_id on that domain, then lands back here.
        window.location.href = seed_entry_url;
      } else {
        onAuthSuccess();
      }
    },
    onError: ({ error }: any) => {
      return { error };
    },
  });
};
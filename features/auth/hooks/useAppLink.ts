import { AppLinkResult, jsonRpcCall, odooApi, proxyApi } from "@/features/lib/rpcClient";
import { useMutation } from "@tanstack/react-query";

const client = (import.meta.env.VITE_USE_DIRECT_ODOO === "true") ? odooApi : proxyApi;

export type AppLinkParams = {
  app: string;
  email: string;
  name: string;
  company_id?: number;
  portal?: boolean;
};

export const useAppLink = () => {
  return useMutation<AppLinkResult, Error, AppLinkParams>({
    mutationFn: async (params) => {
      return await jsonRpcCall<AppLinkResult>(
        client,
        "/api/v1/sso/app_link",
        params
      );
    },
  });
};
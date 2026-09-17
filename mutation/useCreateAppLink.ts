import { useMutation } from "@tanstack/react-query";
import api from "../services/api";
import { getActiveCompanyFromOdooSession } from "@/services/getCompanies";

export const useCreateAppLink = () => {
  return useMutation({
    mutationFn: async ({
      app,
      email,
      name,
      redirect,
    }: {
      app: string;
      email: string;
      name: string;
      /**
       * Optional relative path (e.g. "/unified-shop/checkout-handoff?lines=...")
       * to land on after SSO instead of the app's default destination.
       * Forwarded as-is to /v1/sso/app_link's `redirect` param, which
       * /api/v1/odoo/login_link (see mrbur_sso_idp) already supports on the
       * Odoo side. Not every app_code's launch path is confirmed to honor
       * this end-to-end (see checkoutHandoff.ts) — callers that need it
       * should treat it as best-effort.
       */
      redirect?: string;
    }) => {
      const company = getActiveCompanyFromOdooSession();

      if (!company?.companyId) {
        throw new Error(
          "Could not determine your active company from the current session. Please log in again."
        );
      }

      const { data } = await api.post(
        "/v1/sso/app_link",
        {
          jsonrpc: "2.0",
          method: "call",
          params: {
            app_code: app,
            email,
            name,
            company_id: Number(company.companyId),
            portal: true,
            ...(redirect ? { redirect } : {}),
          },
          id: 1,
        },
        {
          headers: {
            "X-Company-Code": company.companyCode,
            "X-Company-Id": company.companyId,
          },
          withCredentials: true,
        }
      );

      return data;
    },
  });
};
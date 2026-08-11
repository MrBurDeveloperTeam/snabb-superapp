import { useMutation } from "@tanstack/react-query";
import api from "../services/api";
import { getActiveCompanyFromOdooSession } from "@/services/getCompanies";

export const useGetUserId = () => {
  return useMutation({
    mutationFn: async ({
      app,
      email,
      name,
    }: {
      app: string;
      email?: string;
      name?: string;
    }) => {
      const company = getActiveCompanyFromOdooSession();
      console.log('the company info is', company);

      if (!company?.companyId) {
        throw new Error(
          "Could not determine your active company from the current session. Please log in again."
        );
      }

      const { data } = await api.post(
        "/v1/sso/userid",
        {
          jsonrpc: "2.0",
          method: "call",
          params: {
            app_code: app,
            email,
            name,
            company_id: Number(company.companyId),
            portal: true,
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
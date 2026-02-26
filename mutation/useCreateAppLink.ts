import { useMutation } from "@tanstack/react-query";
import api from "../services/api";

export const useCreateAppLink = () => {
  return useMutation({
    mutationFn: async ({
      app,
      email,
      name,
    }: {
      app: string;
      email: string;
      name: string;
    }) => {
      const { data } = await api.post("/v1/sso/app_link", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          app_code: app,
          email,
          name,
          company_id: 2,
          portal: true,
        },
        id: 1,
      });

      return data;
    },
  });
};
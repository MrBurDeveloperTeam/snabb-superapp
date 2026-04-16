import { getSessionInfo, getSessionInfoWithRetry } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
            try {
              const response = await getSessionInfo();
              if (!response) {
                throw new Error("No session info found");
              }
          
              const sessionInfo = await getSessionInfoWithRetry();
              const res = { ...response, ...sessionInfo };
          
              // Return the session info without blocking the UI
              return { sessionInfo: res };
            } catch (error) {
              console.error("Error fetching session info:", error);
              // Handle error (e.g., show user-friendly message or fallback)
            }
        },
        onSuccess: (data) => {
            const { sessionInfo } = data;
            localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
            return sessionInfo
        },
        onError: (err: any) => {
            console.error("Failed to get session info:", err.message);
            throw new Error(err.message || "Failed to get session info");
        },
    })
}

export default useGetSessionInfo
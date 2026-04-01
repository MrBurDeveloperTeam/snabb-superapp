import { getSessionInfo } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
            const response = await getSessionInfo()
            console.log("Session Info:", response)
            return {
              sessionInfo: response ?? null,
            };
        },
        onSuccess: (data) => {
            const { sessionInfo } = data;
            console.log("Successfully retrieved session info:", sessionInfo)
            localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
            return sessionInfo
        },
        onError: (err: any) => {
            console.error("Failed to get session info:", err.message);
        },
    })
}

export default useGetSessionInfo
import { getSessionInfo } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
            const response = await getSessionInfo()
            if(!response) {
                throw new Error("No session info found")
            }
            return { sessionInfo: response };
        },
        onSuccess: (data) => {
            const { sessionInfo } = data;
            localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
            return sessionInfo
        },
        onError: (err: any) => {
            console.error("Failed to get session info:", err.message);
        },
    })
}

export default useGetSessionInfo
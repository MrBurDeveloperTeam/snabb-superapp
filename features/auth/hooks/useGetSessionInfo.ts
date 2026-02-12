import { getSessionInfo } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
            const response = await getSessionInfo()
            return response
        },
        onSuccess: (sessionInfo) => {
            console.log("Session info retrieved:", sessionInfo)
            return sessionInfo
        },
        onError: (err: any) => {
            console.error("Failed to get session info:", err.message)
        },
    })
}

export default useGetSessionInfo
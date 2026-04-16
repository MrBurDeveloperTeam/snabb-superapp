import { getSessionInfo, getSessionInfoWithRetry } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
        try {
            // Make sure getSessionInfo returns a valid response.
            const response = await getSessionInfo();
            if (!response) {
                throw new Error("No session info found");
            }

            // If the response is valid, try to get sessionInfo with retry
            const sessionInfo = await getSessionInfoWithRetry();
            if (!sessionInfo) {
                throw new Error("Session info with retry failed");
            }

            // Ensure sessionInfo exists before proceeding
            const res = { ...response, ...sessionInfo };

            // Return the merged session info
            return { sessionInfo: res };
        } catch (error) {
            console.error("Error fetching session info:", error);
            // Handle error (e.g., show user-friendly message or fallback)
            throw error; // rethrow or handle as needed
        }
    },
    onSuccess: (data) => {
        if (!data || !data.sessionInfo) {
            console.error("Session info not found in the response data");
            return;
        }
        const { sessionInfo } = data;
        localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
        return sessionInfo;
    },
    onError: (err: any) => {
        console.error("Failed to get session info:", err.message);
        throw new Error(err.message || "Failed to get session info");
    },
    })
}

export default useGetSessionInfo
import { getSessionInfo, getSessionInfoWithRetry } from "@/services/GetSessionInfo"
import { useMutation } from "@tanstack/react-query"

const useGetSessionInfo = () => {
    return useMutation({
        mutationFn: async () => {
        try {
            // Make sure getSessionInfo returns a valid response.
            const response = await getSessionInfo();
            if (!response) {
                return new Error("No session info found");
            }

            // getSessionInfoWithRetry() hits a supplementary endpoint
            // (/api/odoo/session_info) that only ever *augments* `response`
            // above — which already carries name/username/partner_id, the
            // only fields App.tsx's verifySession() actually reads. Its
            // failure (e.g. unreachable in an environment that doesn't
            // proxy/implement this exact path) must never be treated as
            // "no session at all": that previously caused verifySession()
            // to call clearAuthState() and log an otherwise-successfully-
            // authenticated user straight back out. Isolate its failure so
            // a genuinely valid primary session is never discarded because
            // of a best-effort secondary call.
            let sessionInfo: any = null;
            try {
                sessionInfo = await getSessionInfoWithRetry();
            } catch (retryError) {
                console.warn("Session info retry endpoint unavailable, continuing with primary session info:", retryError);
            }

            const res = sessionInfo ? { ...response, ...sessionInfo } : response;

            // Return the merged (or primary-only) session info
            return { sessionInfo: res };
        } catch (error) {
            console.error("Error fetching session info:", error);
            // Handle error (e.g., show user-friendly message or fallback)
            return error; // rethrow or handle as needed
        }
    },
    onSuccess: (data) => {
        if (!data || !data.sessionInfo) {
            console.error("Session info not found in the response data");
            return null;
        }
        const { sessionInfo } = data;
        localStorage.setItem("odoo_session", JSON.stringify(sessionInfo));
        return sessionInfo;
    },
    onError: (err: any) => {
        console.error("Failed to get session info:", err.message);
        return Promise.reject(err); // or handle error as needed
        // throw new Error(err.message || "Failed to get session info");
    },
    })
}

export default useGetSessionInfo
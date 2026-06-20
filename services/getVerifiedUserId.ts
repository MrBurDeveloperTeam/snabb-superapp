export async function getVerifiedUserId(): Promise<string | null> {
  const res = await fetch("https://app.snabbb.com/api/verify-token", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[getVerifiedUserId] verify-token failed:", data);
    throw new Error(data?.error || "Unable to verify user");
  }

  console.log("[getVerifiedUserId] verify-token response:", data);

  return (
    data?.user?.profiles?.user?.user_id ||
    data?.user?.profile?.user_id ||
    data?.profile?.user_id ||
    data?.user_id ||
    data?.user?.id ||
    null
  );
}
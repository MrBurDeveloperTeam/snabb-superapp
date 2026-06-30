export async function getVerifiedUserId(): Promise<string | null> {
  const res = await fetch("https://app.snabbb.com/api/verify-token", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Unable to verify user");
  }

  const data = await res.json();

  return (
    data?.user?.profiles?.user?.user_id ||
    data?.user_id ||
    data?.user?.id ||
    null
  );
}
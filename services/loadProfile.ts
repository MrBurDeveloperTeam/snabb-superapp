export const loadUserProfile = async () => {
    const res = await fetch("https://account.snabbb.com/api/account/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      return await res.json().catch(() => null);
}
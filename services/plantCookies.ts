export async function plantMrBurCookie(sessionId: string) {
  try {
    // Route through app.snabbb.com Worker which proxies to my.mrbur.shop
    // This avoids CORS since app.snabbb.com is in our Cloudflare zone
    await fetch(
      `https://app.snabbb.com/api/sso/plant-mrbur-cookie?sid=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
  } catch (e) {
    console.warn("plantMrBurCookie failed", e);
  }
}
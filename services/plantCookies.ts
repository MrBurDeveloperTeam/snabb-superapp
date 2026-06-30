export async function plantMrBurCookie(sessionId: string) {
  try {
    await fetch(
      `https://my.mrbur.shop/sso/plant-cookie?sid=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    console.log("[SSO] ✓ Cookie planted on .mrbur.shop");
  } catch (e) {
    console.warn("plantMrBurCookie failed", e);
  }
}
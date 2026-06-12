export async function plantMrBurCookie(sessionId) {
  try {
    await fetch(
      `https://my.mrbur.shop/sso/plant-cookie?sid=${sessionId}`,
      {
        method: "GET",
        credentials: "include", // essential — sends/receives cookies cross-origin
        mode: "cors",
      }
    );
  } catch (e) {
    // non-fatal, user can still browse
    console.warn("plantMrBurCookie failed", e);
  }
}
// src/hooks/useProfileImage.ts
import { useState, useEffect } from "react";
import { isLocalDevelopmentOrigin } from "../utils/localDevOrigin";

export function useProfileImage(isLoggedIn: boolean | null) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return; // ← only fetch when logged in

    // account.snabbb.com is a different origin from the local dev server —
    // `credentials: "include"` cannot carry that origin's auth cookies
    // cross-site, so this request can never succeed in local dev; it only
    // ever produces a benign-but-noisy 401 in the console (see
    // APP-GALLERY-AUTH-REFRESH-LOOP-AND-MOLAR-AI-RUNTIME-FIX). It never
    // affects auth state either way (silently falls back to no profile
    // image below), so skipping it locally changes no behavior other than
    // removing that console noise.
    if (isLocalDevelopmentOrigin()) return;

    fetch("https://account.snabbb.com/api/account/profile", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .catch(() => null)
      .then((data) => {
        if (!data?.ok) return;
        const partnerId = data.partner_id;
        // const imageUrl =
        //   data.image_url ||
        //   (partnerId
        //     ? `https://account.snabbb.com/web/image/res.partner/${partnerId}/image_128?unique=${Date.now()}`
        //     : null);
        const imageUrl = data.partner.has_image
          ? `https://account.snabbb.com/web/image/res.partner/${data.partner_id}/image_128?unique=${Date.now()}`
          : null;
                setProfileImageUrl(imageUrl);
              });
  }, [isLoggedIn]); // ← re-run when login state changes

  return { profileImageUrl };
}
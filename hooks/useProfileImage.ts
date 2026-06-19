// src/hooks/useProfileImage.ts
import { useState, useEffect } from "react";

export function useProfileImage(isLoggedIn: boolean | null) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return; // ← only fetch when logged in

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
        const imageUrl =
          data.image_url ||
          (partnerId
            ? `https://account.snabbb.com/web/image/res.partner/${partnerId}/image_128?unique=${Date.now()}`
            : null);
        setProfileImageUrl(imageUrl);
      });
  }, [isLoggedIn]); // ← re-run when login state changes

  return { profileImageUrl };
}
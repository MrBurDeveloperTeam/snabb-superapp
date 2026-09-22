// src/hooks/useProfileImage.ts
import { useState, useEffect } from "react";
import { isLocalDev } from "@/utils/env";

export function useProfileImage(isLoggedIn: boolean | null) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return; // ← only fetch when logged in

    // account.snabbb.com is a production-only service (no local/dev
    // equivalent, and no session cookie for it exists when testing against
    // a local Odoo backend) — skip it in local dev instead of firing a
    // request that can only ever come back 401, same end result
    // (profileImageUrl stays null) without the console noise.
    if (isLocalDev()) return;

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
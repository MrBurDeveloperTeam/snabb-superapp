# Profile completion guide

The gallery starts this guide for authenticated users whose existing server profile-completion check reports an incomplete profile. Completed profiles do not start the guide. Saving refreshes that same check and the header announcement.

1. Click the profile icon.
2. Click Settings.
3. Upload a valid JPG, PNG or GIF photo (up to 2 MB).
4. Enter street, city, state and postal code, then continue.
5. Save changes. Failed requests leave the guide available for retry. If personal-information validation fails, the guide highlights those fields for correction before retrying.

`data-profile-guide` attributes anchor the highlight to real controls. The overlay blocks unrelated pointer and keyboard interaction; the highlighted controls and instruction card remain usable. Form sections scroll independently on small screens to leave room for instructions.

The instruction card uses border-box sizing, a maximum width of 300 px, and 12 px screen margins. Its actual height determines placement. Height is capped at 42% of the visible viewport (up to 260 px) with internal scrolling, so wrapped text cannot expand it beyond the available space. Visual viewport dimensions and offsets account for the mobile keyboard and zoom. Photo and address sections shrink and scroll as needed to reserve room for the card.

The guide explains coupon eligibility; coupon issuance remains the responsibility of the existing platform reward flow.

Skip saves a dismissal per normalized user email in localStorage (`snabbb-profile-guide-dismissals`). The guide stays dismissed after refresh and logout/login in the same browser. Logout preserves this key. Clearing browser storage or using another browser/device resets this preference. No Supabase schema or login changes are required. If browser storage is unavailable, Skip still dismisses the guide for the current session.

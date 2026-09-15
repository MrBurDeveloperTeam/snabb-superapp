// PHASE APPGALLERY-SHARED-0.6.6-APPLY: stable, non-hashed App Gallery public
// URLs for @mrburdeveloperteam/molar-experience@0.6.6's file-backed static
// assets (Molar logo, Cat spritesheets, Virtual Pet sprites/beds/care
// images).
//
// Vite/production-build tooling cannot statically discover and copy the
// package's own internally-bundled asset references (opaque
// `./<name>-<hash>.<ext>` strings produced by the shared package's
// tsup/esbuild `file` loader), which causes 404s/invisible CSS
// background-images for these assets under a built host — confirmed
// directly against the installed 0.5.0 dist (`ai.js`/`cat.js`/`pet.js`)
// before this phase. 0.6.0+ adds optional override props
// (`logoUrl`/`spriteSheetUrls`/`assetUrls`) specifically so a host can
// supply its own stable, host-served copies instead.
//
// The bytes for every file below already existed in App Gallery's own
// `public/` directory (pre-migration Cat/Pet assets, confirmed present
// before this phase — none copied/created here). `munchkinspritesheet.webp`
// intentionally has no hyphen — that is the real, existing filename, not a
// typo, and matches the shared package's own internal naming for that pet.
//
// These are deterministic constants only — no runtime computation, and no
// package build-hash ever appears here or anywhere else in host source.
import type { SharedCatPetId } from '@mrburdeveloperteam/molar-experience/cat';

export const MOLAR_LOGO_URL = '/icons/ai_logo.png';

export const CAT_SPRITE_SHEET_URLS: Record<SharedCatPetId, string> = {
  mallow: '/pets/mallow-spritesheet.webp',
  silverbelt: '/pets/silverbelt-spritesheet.webp',
  fastrat: '/pets/fastrat-spritesheet.webp',
  gulu: '/pets/gulu-spritesheet.webp',
  munchkin: '/pets/munchkinspritesheet.webp',
  mochi: '/pets/mochi-spritesheet.webp',
};

// `PetAssetUrls` is not currently nameable from the package's published
// `./pet` entrypoint (a known, separate declaration-bundling gap — see
// Content Studio's own equivalent audit) even though the `assetUrls` prop
// itself is fully functional. Left structurally typed rather than
// annotated with an imported name; TypeScript checks `SharedVirtualPet`'s
// prop by shape, not by this type's name, so this has no runtime or
// type-safety effect.
export const PET_ASSET_URLS = {
  spriteSheets: CAT_SPRITE_SHEET_URLS,
  beds: {
    grey: '/pets/grey_bed.png',
    red: '/pets/red_bed.png',
    purple: '/pets/purple_bed.png',
  },
  care: {
    poop: '/pets/poop.png',
    shower: '/pets/shower.png',
    soap: '/pets/soap.png',
  },
};

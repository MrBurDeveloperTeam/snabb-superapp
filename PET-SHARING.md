# Shared pet integration

This host imports `@mrburdeveloperteam/pet-function` at Git tag `v0.12.2`
(`8a1993a66d60087829519c053ee7de0ed3475320`). The npm and pnpm lockfiles
must resolve to that release; build approval is scoped to that commit.
Cat presentation, Molar AI chat presentation, Virtual Pet, pet options and
portable resources come from that package. Meowdoku uses its shared launcher.

`features/petDialogue`, `aiExperience/appGalleryMolarAdapter.ts`, authentication,
navigation and `petExperience/appGalleryPetRepository.ts` remain host-owned.
Their existing cross-app queries, dialogue selection and account boundaries
are unchanged. The shared package receives the existing authenticated identity.

`scripts/prepare-pet.mjs` prepares package-owned non-game resources before dev
and build. The `/molar-experience/` resource URL is a compatibility path, not
an old package dependency. These generated files must not be edited manually.
The shared Vite games plugin serves `/games/` from the installed package in
development and emits those same files into `dist/games` for deployment.
There are no maintained host copies in `public/games`.

Install dependencies using npm 10 (the Cloudflare build environment), run
`npm run build`, then `npm run verify:pet`. With npm 11's script approval
policy, approve this Git dependency's prepare script before installing.
Frontend types can be checked with `npx tsc -p tsconfig.pet-check.json`;
this excludes Deno Edge Functions from the browser TypeScript environment.
Release updates require updating the dependency and lockfile and redeploying
the host; publishing the shared package alone does not update a deployed app.

No new paid service or runtime API has been introduced by the import migration.

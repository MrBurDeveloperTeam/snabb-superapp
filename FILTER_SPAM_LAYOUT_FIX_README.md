# Snabbb Apps Gallery - Filter Spam Layout Fix

Problem: Rapidly clicking category filters caused the apps grid to become visually messy.

Cause: The gallery grid used Framer Motion `layout` plus `AnimatePresence mode="popLayout"`. When filters changed quickly, exiting cards were temporarily removed from normal grid flow while new cards were entering, causing overlapping/misaligned layout states.

Fix applied:
- Removed `AnimatePresence mode="popLayout"` from the filterable app grids.
- Removed `layout` animation from the app card wrapper.
- Added a clean keyed fade transition to the grid container.

Files changed:
- `App.tsx`
- `components/AppCard.tsx`

After deploying, hard refresh `app.snabbb.com` and spam-click All / Shops / Productivity / Value Added to verify the grid stays stable.

# TAG CITY — Locations

Four hand-dressed districts, unlocked by lifetime tags (see `src/world.js` `LOCATIONS`).
Each names its art-bible section; the look ships exactly — no visual downgrade anywhere.

| # | id | name | unlock (tags) | art bible | music hook |
|---|----|------|---------------|-----------|------------|
| 1 | `neon_row` | NEON ROW | 0 (open) | §4 — location-1 sign language | `neon_row`: "Diabolique" — Spotify `2eSyWmIdPzEMyWejLb2LBj` |
| 2 | `the_alleys` | THE ALLEYS | 15 | §4 — alley-sector streets | `the_alleys`: "Zooted Zone" — Spotify `0emH8ktA8x4DkOFLsG5xkW` |
| 3 | `elevated` | ELEVATED / ROOFLINE | 40 | §4 — location-4 cable ribbons | `elevated`: reserved (no ID assigned — do not invent one) |
| 4 | `murals` | THE MURALS DISTRICT | 80 | §4 — pink-lit storefronts; mural walls | `murals`: reserved (no ID assigned — do not invent one) |

## District notes

- **NEON ROW** — Gold-trimmed art-deco marquees. "The city shows off here." Gold-bordered, cyan-tube deco signs; ground bands cyan/magenta/white.
- **THE ALLEYS** — "Street-level sectors. Every wall is canvas." Fire-escape + pipe silhouettes; old tag scars on the walls; magenta-led ground bands.
- **ELEVATED / ROOFLINE** — "Cyan cable ribbons overhead. The industry watches from above." Cable ribbons are elevated set dressing ONLY (never at street level).
- **THE MURALS DISTRICT** — "Storefronts glow pink. The walls already sing — add your verse." Pink-lit storefront windows; faded old murals behind the glass glow.

## Rules

- Unlock thresholds (0 / 15 / 40 / 80) are progression only — locations are never
  sold, never gated behind purchases. There are no purchases, paywalls, wallets,
  or microtransactions anywhere in the game.
- Seeded per district (101 / 202 / 303 / 404) — deterministic bake, same look every boot.
- Location select re-bakes that district's parallax set at menu time (a menu
  transition, never mid-run).
- The location-2 voxel-decay concept is KILLED (see `src/world.js` header) —
  documentary mentions only, never active code.

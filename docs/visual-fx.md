# Image Visual FX

The editor and hosted overlay both render `components/editor/VisualFX.tsx`. The image and its crop remain DOM elements; two pointer-transparent canvas siblings put particles behind and in front of the image. Coordinates use the existing 1920 × 1080 stage, including its viewport scaling.

The eight primary presets are Impact, Smoke, Spark, Electric, Fire, Ice, Magic and Confetti. Each is a one-shot. FX Speed sets total duration; intensity changes particle density, size changes particle size, spread changes travel, and opacity controls both planes. Selecting an effect sets its palette, then both colors remain editable.

Replay FX uses an editor-scoped context/version, independent of project state, undo history and autosave. Other images retain their replay versions. The hosted renderer uses its existing slide/index mount key, so consecutive identical effects replay on each appearance without restarting on unchanged realtime snapshots.

Legacy burst aliases are shared by normalization and validation in `lib/editor/visualFx.ts`. Existing PR #25 values remain valid and round-trip unchanged: comic/shockwave/pixel map to Impact at render time; sparkles/hearts/energy ring map to Magic; glitch maps to Electric. `burstComet` migrates to Spark. Legacy loop values become one-shot Magic. Missing spread defaults to 100; normalization clamps it to 25–200.

## Rendering budget

- At most 102 particles per image, plus up to 21 short-lived electrical arcs.
- Two canvas planes, each capped at 1 million pixels and 1536 pixels on its longest side; device scale capped at 1.5.
- Small cached smoke/light/flame textures are created before playback. Active scenes retain their textures, avoiding cache churn during frames.
- Direct requestAnimationFrame drawing, analytic motion, no per-frame React state updates, and no new runtime dependencies.
- At completion the canvases clear and no further animation frame is scheduled. Cleanup, hidden tabs, and reduced-motion preference changes cancel playback.

## Verification

`npm run typecheck`, `npm run lint`, `npm test` (89 tests), and `npm run build` pass. Lint retains the two existing layout-font/sidebar-image warnings.

Regression coverage includes legacy imports, all supported FX values, control defaults/ranges, JSON round trips, schema acceptance, particle determinism, backing resolution limits, one-shot cleanup, selected-image replay isolation, reduced motion, hidden tabs, and actual hosted slide remounts/realtime refreshes.

Browser review used the shared image and FX rendering plus fixed-phase captures at 15%, 40% and 70%. All eight presets were inspected on a dark background, including front/back overlap and late dissipation; no browser errors were observed. The temporary review route was removed. TikTok Studio performance under a running game has not been measured locally.

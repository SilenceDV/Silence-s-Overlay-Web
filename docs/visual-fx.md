# Image Visual FX

The editor and hosted overlay still use the same `components/editor/VisualFX.tsx`. The render stack is a back canvas, the existing DOM image/crop, and a front canvas. Both canvases cover the image interior and a padded travel region. Neither follows the PNG's alpha mask. Pointer handling, image motion, crop, outline, glow, sidebar controls, and Replay FX are unchanged.

## Effect-specific composition

| Effect | Back | Front |
| --- | --- | --- |
| Impact | Short core flash, expanding warm light, irregular textured pressure lobes | Two asymmetric ejecta fans, a few tumbling dark fragments, delayed fine sparks |
| Spark | Softer particles emerging from a localized contact area | Bright directional sprays originating on the image, tapered luminous trails and a delayed fine spray |
| Electric | Occasional edge arcs | Most trunks cross the image interior, with traveling leaders, changing fractal paths, two branches, flicker and layered bloom |
| Fire | All main flames and heat mass, rising past the top and side edges | Only small sparks/embers |
| Smoke | Soft overlapping drifting volumes | Lower-opacity clouds crossing portions of the image |
| Ice | A few softer fragments | Most faceted rotating shards and small glints |
| Magic | Soft light dots | Staggered glints and curved drifting particles across the image surface |
| Confetti | Some lower-contrast pieces | Most fluttering rectangles/ribbons, including pieces traveling across the image |

No shared elliptical emitter remains. Presets use localized jets, interior scatter, rear flame sources, or cross-image electrical paths. Seeded randomness varies position, speed, lifespan, brightness, trail length, delay, size and rotation. Motion uses an analytic drag/gravity solution with elapsed effect time, independent of each particle's lifespan. Opacity has a fast attack, bright peak and nonlinear dissipation.

Small pre-rendered bitmaps provide tapered spark trails, flame detail, soft light, and multi-scale noise volumes. Smoke and hot explosion clouds have different density/lighting profiles. Active scenes retain these textures; drawing frames do not recreate them. Electrical geometry is preallocated in several changing shapes and interpolated during playback.

## Compatibility and performance

All controls and the existing legacy FX normalization/validation remain unchanged. Replay FX is still editor-local and does not modify project data or history. The hosted slide/index key still restarts each appearance, including consecutive identical image IDs/FX; unchanged realtime refreshes do not restart playback.

At intensity 100, presets use 12–56 particles; Electric also has 12 short-lived arcs. At maximum intensity, Impact has 84 particles. Each canvas remains capped at one million pixels and 1536 pixels on its longest side, with device scale capped at 1.5. Particle travel and every electrical branch/glow contribute to padding. The bounded texture cache holds 32 small sprites. No runtime dependency was added.

Completed effects clear both planes and stop requesting animation frames. Unmounting, hidden tabs and reduced-motion changes retain their existing cancellation behavior.

## Verification

`npm run typecheck`, `npm run lint`, `npm test` (117 tests), and `npm run build` pass. Lint retains the two existing layout-font/sidebar-image warnings.

The regression suite covers normalization, legacy JSON, schema defaults, selected-image replay, hosted remounts/realtime refreshes, cleanup, canvas bounds, front-of-image particle coverage, rear-only main flames, cross-image electrical trunks, asymmetric spark emission, staged impact timing, drag/gravity, and texture reuse. No existing tests were removed or weakened.

Browser review used the actual shared renderer over an opaque PNG test badge, with live playback at the default 0.82-second speed and fixed phases. Foreground sparks/electrical paths were visibly drawn over the badge; main fire was occluded by it. Smoke, ice, magic and confetti were also reviewed over the image. Light and dark backgrounds and completed blank FX canvases were checked, with no browser errors observed. The temporary review route was removed before the production build. Performance under TikTok Studio plus a running game has not been measured here.

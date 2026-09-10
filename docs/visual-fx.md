# Image Visual FX

The editor and hosted overlay use the same `components/editor/VisualFX.tsx`. The render stack is a back canvas, the existing DOM image/crop, and a front canvas. Both canvases cover the image interior and a padded travel region; neither follows the PNG alpha mask. Image motion, crop, outline, glow and Replay FX remain independent.

## Composition

A seeded emitter sampler provides center, perimeter, surface, full-area, bottom-edge and multi-point strategies. Six irregular surface regions distribute Impact and Spark across the gift without evenly spaced radial wheels.

| Effect | Back | Front |
| --- | --- | --- |
| Impact | Local ignition blooms, warm textured pressure clouds, subtle expanding shockwave | Multiple surface sparks, tumbling fragments, delayed fine sparks |
| Spark | Softer outward perimeter jets | Multiple contact sprays crossing the PNG, tapered trails following curved trajectories |
| Electric | Occasional edge arcs | Diagonal, horizontal and vertical trunks with traveling leaders, branches, flicker and layered bloom |
| Fire | All main flames and heat, rising from bottom and lower-side sources | Only small sparks/embers |
| Smoke | Overlapping drifting volumes around the sides | Lower-opacity clouds crossing the image |
| Ice | Softer fragments | Faceted rotating shards and glints across the image |
| Magic | Soft light dots | Staggered glints and curved particles across the surface |
| Confetti | Lower-contrast pieces | Fluttering rectangles/ribbons crossing the image |

Legacy Shockwave remains a rear expanding pressure wave with faint motes, without an explosion spray. Seeded randomness varies position, velocity, lifespan, brightness, trail length, delay, size and rotation. Motion uses an analytic drag/gravity solution with elapsed effect time, independent of lifespan. Opacity has fast attack and nonlinear dissipation.

Small pre-rendered bitmaps provide tapered spark trails, flame detail, soft light and multi-scale noise volumes. Smoke and hot explosion clouds have different density/lighting profiles. Active scenes retain textures; frames do not recreate them. Electrical geometry is preallocated and interpolated during playback.

## Compatibility and performance

Existing legacy normalization and schema validation remain intact. No persisted fields or dependencies were added. Replay FX is editor-local and does not modify project data or history. The hosted slide/index key still restarts each appearance, including consecutive identical image IDs/FX; unchanged realtime refreshes do not restart playback.

Both canvas DOM nodes are retained through None. Disabled effects hide them and release backing buffers to 1x1. Active changes clear and draw in a layout effect before paint. Textures are prepared offscreen, and canvas dimensions are assigned only when the required resolution changes. Stable seeded geometry lets replay/color/opacity/speed changes reuse backing buffers. The PNG remains in its existing DOM image element.

At intensity 100, presets use 12-59 particles; Electric also has 12 short-lived arcs. At maximum intensity, Impact has 89 particles. Each canvas is capped at one million pixels and 1536 pixels on its longest side, with device scale capped at 1.5. Particle travel and electrical branch/glow bounds contribute to padding. The bounded texture cache holds 32 small sprites. Completed effects clear both planes and stop requesting frames. Unmounting, hidden tabs and reduced-motion changes retain cancellation behavior.

## Verification

`npm run typecheck`, `npm run lint`, `npm test` (139 tests), and `npm run build` pass. Lint retains the two existing layout-font/sidebar-image warnings.

Regression tests cover normalization, legacy JSON, defaults, selected-image replay, hosted remounts/realtime refreshes, cleanup, canvas bounds, front particle coverage, rear-only flames, cross-image electrical trunks, multi-source emission, staged impact timing, drag/gravity, texture reuse, switching without canvas replacement, and buffer reuse on replay/settings changes. No existing tests were removed or weakened.

A temporary browser fixture used the real image controls through None, Electric, Fire, Spark, Impact and back to None, plus Replay FX, speed/intensity changes and a palette change. An animation-frame audit recorded over 3,200 frames with zero canvas replacements, zero hidden/unloaded PNG frames and zero broad opaque-white canvas fills. Fixed-phase review covered all eight effects over an opaque PNG. The temporary route was removed before the production build.

This audit does not prove the absence of every transient browser/native-menu artifact. The originally reported white flash was not reproduced or conclusively traced. Performance under TikTok Studio plus a running game has not been measured.

## Reference-informed depth pass

The supplied `ScreenRecording_06-07-2026 13-25-10_1.mp4` was inspected across the clip, including half-second samples of the game area. At roughly 9-16 seconds, shaded orange objects and pink fish grow toward the camera, overlap the character, and retain readable silhouettes with localized glow. The user confirmed that the overall depth, glow and object motion are the benchmark. This is a style adaptation to the existing FX presets, not a recreation of that game's objects or 3D scene.

Foreground particles now use bounded perspective growth and increasing travel anchored to their individual emitter sites. Distant particles recede and remain smaller. A subset of nearby fragments, confetti and Magic beads is larger; solid pieces retain opacity later in their lifetime so the approach is visible. Ice and debris have turning shaded faces, Magic has rounded luminous beads, and overlapping rear flames use normal alpha compositing to retain colored detail. Electric's crossing paths and all main fire's rear placement are preserved.

Depth is derived runtime state, never persisted to project JSON. Projected motion and full glow radii are included in allocation bounds, with the existing pixel/resolution limits unchanged. Nine new tests cover foreground growth, distant recession, emitter anchoring, and projected bounds at extreme size/spread over multiple aspect ratios. All prior tests remain intact.

Browser review checked early, middle and late phases across all eight presets, plus live replay. The switching audit was repeated after these changes with zero canvas replacements, hidden/unloaded PNG frames or broad white canvas fills. The temporary route was removed before the production build. Final artistic judgment remains subjective; these observations do not claim exact visual equivalence to the reference's 3D scene.

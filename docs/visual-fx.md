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

`npm run typecheck`, `npm run lint`, `npm test` (145 tests), and `npm run build` pass. Lint retains the two existing layout-font/sidebar-image warnings.

Regression tests cover normalization, legacy JSON, defaults, selected-image replay, hosted remounts/realtime refreshes, cleanup, canvas bounds, front particle coverage, rear-only flames, cross-image electrical trunks, multi-source emission, staged impact timing, drag/gravity, texture reuse, switching without canvas replacement, and buffer reuse on replay/settings changes. No existing tests were removed or weakened.

A temporary browser fixture used the real image controls through None, Electric, Fire, Spark, Impact and back to None, plus Replay FX, speed/intensity changes and a palette change. An animation-frame audit recorded over 3,200 frames with zero canvas replacements, zero hidden/unloaded PNG frames and zero broad opaque-white canvas fills. Fixed-phase review covered all eight effects over an opaque PNG. The temporary route was removed before the production build.

The earlier canvas audit did not test native-menu painting. The subsequent `IMG_9014.mov` recording localizes the reported flash to the native Visual FX dropdown, including a pale menu rectangle around 11 seconds. The dropdown fix below addresses that distinct rendering path. Performance under TikTok Studio plus a running game has not been measured.

## Reference-informed depth pass

The supplied `ScreenRecording_06-07-2026 13-25-10_1.mp4` was inspected across the clip, including half-second samples of the game area. At roughly 9-16 seconds, shaded orange objects and pink fish grow toward the camera, overlap the character, and retain readable silhouettes with localized glow. The user confirmed that the overall depth, glow and object motion are the benchmark. This is a style adaptation to the existing FX presets, not a recreation of that game's objects or 3D scene.

Foreground particles now use bounded perspective growth and increasing travel anchored to their individual emitter sites. Distant particles recede and remain smaller. A subset of nearby fragments, confetti and Magic beads is larger; solid pieces retain opacity later in their lifetime so the approach is visible. Ice and debris have turning shaded faces, Magic has rounded luminous beads, and overlapping rear flames use normal alpha compositing to retain colored detail. Electric's crossing paths and all main fire's rear placement are preserved.

Depth is derived runtime state, never persisted to project JSON. Projected motion and full glow radii are included in allocation bounds, with the existing pixel/resolution limits unchanged. Nine new tests cover foreground growth, distant recession, emitter anchoring, and projected bounds at extreme size/spread over multiple aspect ratios. All prior tests remain intact.

Browser review checked early, middle and late phases across all eight presets, plus live replay. The switching audit was repeated after these changes with zero canvas replacements, hidden/unloaded PNG frames or broad white canvas fills. The temporary route was removed before the production build. Final artistic judgment remains subjective; these observations do not claim exact visual equivalence to the reference's 3D scene.


## Visual FX dropdown correction

Only the Visual FX native select is replaced by `VisualFXSelect`, a small DOM listbox with a button matching the existing dark closed control. The menu is portaled outside the scrolling sidebar to avoid clipping, positioned before mounting, and given an opaque dark inline background on its first render. It has no opening transition or native OS popup. Image Animation and other editor selects are unchanged; no UI dependency was added.

Selection is marked with a check and color. Arrow keys, Home/End, Enter/Space and typeahead navigate/select; Escape, Tab, focus departure and outside pointer clicks dismiss. Scrolling the sidebar or resizing the window dismisses the menu; internal menu scrolling remains available. All supported FX values, including legacy values, are selectable. Existing palette application and Replay FX remain intact.

Browser review repeated the effect-switching sequence, replay, reopening and outside dismissal. A mutation observer checked the menu's computed background/opacity immediately upon mounting: every observed mount was opaque dark. Screenshots showed dark menu surfaces and selected marks, with no browser errors. This removes the native dropdown painting path identified in the recording.

Spatial follow-up fixes foreground smoke's repeating index stride so all six emitter regions are used, and routes the rear electrical arcs collectively across all four image sides. Existing multi-origin Impact/Spark, rear flames/front embers, and distributed Ice/Magic/Confetti remain covered by tests. New regressions cover these spatial corrections and custom dropdown selection, keyboard navigation, dismissal, dark initial styling, portal cleanup and legacy values.

## Focused Electric / Confetti refinement (September 12)

This pass uses the newly supplied 19.58-second MOV recording of the gift overlay itself. It supersedes the Electric and Confetti descriptions in the historical pass notes above. The reference's compact, short electrical flashes informed the restraint, bright core, colored glow, and restrike timing; this is an adaptation to arbitrary transparent PNGs, not an exact recreation of the recorded assets.

Electric now has two simultaneous foreground trunks at ordinary intensity, capped at three above 100%, with at most one short branch per group. Three brief groups restrike during the one-shot. Four precomputed variants per trunk switch sharply instead of morphing into rubbery lines. A thin white-hot core sits inside the primary-color rim and secondary-color glow. Fewer, smaller material-anchored motes support the bolts. Spread does not move or expand the electrical paths; Size has a restrained thickness cap.

Contacts are selected from actual visible alpha samples, scoring opposed directions through the visible mass using dimensions relative to its alpha-weighted centroid. Paths snap to material. A scene-local adjacency graph routes segments around transparent holes and concave gaps, rather than connecting snapped endpoints straight across empty space. Disconnected material is never joined across a gap. This graph and all variants are prepared before playback; no graph search or alpha scan happens per frame.

Confetti has a dedicated bottom-silhouette sampler, separate from the existing Fire bottom-region sampler. Sixteen horizontal bins collect the lowest visible sample in each bin, after contain/zoom/translation/cropping. Stratified selection spreads the launch across that lower envelope, including sparse and asymmetric PNGs. At ordinary intensity 52 pieces release within the first 2.8% of the effect. Immediate fan velocity, some inward crossing trajectories, and a spread-independent upward impulse fill the lower image area before continuing outward. Drag, gravity, flutter, varied rectangles/ribbons, and two-thirds foreground placement retain depth and readable motion. Spread changes lateral travel without relocating origins or delaying the opening.

The existing cached 96-pixel source analysis, alpha-weighted centroid, visible dimensions, DOM image, shared editor/hosted renderer, canvas caps, one-shot cancellation, Replay FX, dark selector, and all persisted settings remain intact. No new effects or dependencies were added. Other presets retain their previous implementation.

Validation: all 168 tests pass, including 12 new cases covering lower-envelope origins after crop translation, immediate launch width, early spread response, restrained material contacts, and complete electrical segments around holes/concavities. The full typecheck, lint, and production build pass; lint retains the two existing font/image warnings. No existing tests were weakened or removed.

A temporary local review route exercised actual transparent round, tall, wide, and irregular PNGs through the shared renderer at early and later fixed phases, normal/max settings, and live one-shot playback. It exposed a stem-gap bridge that was corrected with material routing. Smoke, Impact, Spark, Fire, Ice, and Magic were also inspected without obvious regressions. The custom selector was visually dark (computed opaque rgb(36,36,45)); Escape and outside dismissal worked. At maximum intensity, measured scene preparation in this fixture was 4.6–11.3ms for Electric and 0.4–0.5ms for Confetti; single-plane draw submission measured 0–0.2ms. These are local spot measurements, not GPU timings or a full streaming workload benchmark. The temporary route was removed before the production build.

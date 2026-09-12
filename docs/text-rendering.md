# Shared text painting and letter motion

## Root cause

The legacy renderer painted gradients on `.layerText`, then moved inline-block child letters away from that parent paint. The subsequent CSS fix put an identical 300%-sized rainbow on every child. Each child sampled the same small portion of the spectrum, rather than its position in a continuous word. Movement and paint also competed for animation properties. Shimmer was an empty, unmasked layer-wide pseudo-element and therefore swept a white rectangle across transparent space.

## Rendering contract

`TextContent.tsx` is shared by CanvasStage and the hosted OverlayClient through CanvasStage's existing export. Every grapheme uses an outer `.flowChar` for motion/opacity and an inner `.textGlyph` for fill/stroke. The layout parent owns neither gradients nor outlines nor shimmer. Breathing remains on the whole text layout while paint animations run on glyphs. No persisted values, editor controls, or image VFX changed.

Layout measurements record each glyph's untransformed offset, rendered line width, and line height. Font readiness/loading completion and ResizeObserver update these values; there is no animation-frame measurement or React state loop. Static text retains word wrapping and explicit blank lines; each wrapped row receives its own field. Letter-motion modes retain their previous explicit-line layout. Grapheme segmentation keeps combining marks and joined emoji together.

Rainbow uses two identical full-spectrum periods in a background twice the measured line width. Every glyph has that same background size, offset by its original line position. Identical three-second animations move the field by exactly one line width, giving a continuous, seamless flow independent of each movement wrapper's stagger. Custom/legacy gradients and the other fills use the same coordinate system. Aurora keeps its separate four-second flow. A conservative coordinated estimate provides initial paint before hydration; actual font/layout metrics replace it.

Shimmer is an `::after` copy of each glyph's own text, positioned inside that glyph, with transparent fill, no stroke, and `background-clip: text`. The shared line coordinates move one highlight across the letters. Its duration uses the existing Shimmer Speed setting. The base glyph owns the sole outline, so both outline and shimmer travel with the letter without ghost paint.

## Verification

Automated coverage includes all eight persisted fill values with Wave; glyph-only shimmer on solid/rainbow/custom/aurora; layout/resize geometry; geometry persistence across color/shimmer changes; wrapped-row coordinates; grapheme/space/blank-line preservation; all seven current animation controls; and identical hosted/shared markup. CSS contract checks prevent parent gradient/stroke paint and rectangular shimmer from returning.

A temporary local review page used the real TextLayerControls and shared renderer. Visual review covered all fills, independent Wave/Bounce motion, multiple rainbow/shimmer phases, live playback, and static wrapped/multiline text. Rainbow spans the full spectrum, moving letters stay filled, the outline follows them, and shimmer is confined to glyphs. The real Shimmer Speed control changed computed glyph shimmer duration from 2.2s to 0.7s. Parent background and pseudo-element content both computed to none. The temporary review route was removed before the production build.

No heavy library or text canvas is introduced. Complex-script shaping across separate graphemes still follows the browser's inline-box behavior; full contextual shaping across individually animated glyphs is not implemented. Browser visual acceptance was checked in Chromium, not every browser/streaming application.

Validation: npm run typecheck, npm run lint, npm test (193 tests, including 25 new text-rendering cases), and npm run build all pass. Lint retains the two existing font/image warnings. No tests were weakened or removed.

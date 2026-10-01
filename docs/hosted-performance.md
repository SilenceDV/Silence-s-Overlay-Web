# Hosted overlay performance pass

Baseline: upstream `5ee0e7f792fbc1261b10c16b06bfb1ad6f621de5`. The local renderer used for the comparison is byte-equivalent to that upstream renderer. The newer upstream transparency and color-picker fixes are preserved. No deployment or merge is part of this change.

## Findings and changes

- Every status response previously replaced all layer objects, rendering every active layer again even when the saved project was unchanged. Reconciliation now preserves unchanged project, slide, layer, settings, and nested animation identities. Memoized hosted layers skip these renders; changed layers still update immediately.
- A broadcast arriving during a status fetch was discarded. One coalesced follow-up request now fetches the latest save immediately after the outstanding request. Requests abort on unmount; existing reconnect, visibility, pageshow and 15-second fallback refreshes remain.
- Each VFX instance previously scheduled a separate RAF callback. Hosted effects now share one RAF per overlay. There is no frame-rate cap and no React state update per frame. The loop stops when all bursts complete, except the explicitly enabled diagnostics sampler.
- Debris/ice rebuilt a linear gradient and polygon geometry on every visible particle frame. Hosted scenes now prepare bounded fragment face bitmaps, reusable bevel/edge paths and fully revealed lightning paths once per burst. Dynamic bevel shading, reflections, motion and particle counts remain.
- Front/back rendering previously scanned all particles twice. Preparation now partitions the same depth-sorted particles into two lists. Shockwave trigonometry and confetti color strings are precomputed. Existing cached smoke, flame, glow and streak textures remain in use; their shared cache stays bounded at 32 entries.
- Hosted shockwaves skip their unused front canvas. Completed/hidden/unmounted hosted bursts unregister and release displayed backing buffers to 1x1. Scene-owned fragment assets are not placed in a permanent global cache.
- Only the current slide is mounted, as before. Fully transparent layers are now omitted, preventing their CSS and canvas animations. Disabling the overlay also stops its slide timer. Slide removal clamps the active index before rendering.
- Text layout already measures outside animation frames and batches reads before writes. Its spacing, rainbow, typewriter, wave and shimmer code and CSS are preserved. Identity reconciliation avoids rebuilding unchanged glyph trees. Existing text regression coverage remains intact.

## Hosted quality policy

The editor retains its original resolution, five-sample spark trails, four lightning strokes and vector fragment renderer. Hosted mode starts at **high**, with the same resolution limits, particle counts, trail samples and strokes, plus cached drawing assets.

| Hosted tier | Backing dimension multiplier | Spark trail samples | Lightning strokes |
| --- | ---: | ---: | ---: |
| High | 1.00 | 5 | 4 |
| Balanced | 0.85 | 4 | 3 |
| Economy | 0.70 | 3 | 3 |

Every 1.5 seconds of valid sampled animation time, more than 35% slow samples moves down one tier. A slow sample is a frame interval over 22 ms or combined VFX callback cost over 10 ms. Intervals over 100 ms are excluded as suspension/debugger outliers. Recovery requires five consecutive healthy windows (under 5% slow samples), then moves up one tier. Tiers are bounded. Trail/stroke changes apply without restarting the burst; backing resolution is selected for the next burst to avoid reallocating a live canvas. Particle counts are never reduced.

## Diagnostics

Open the modern hosted route with `?perf=1`. Every five seconds, the console reports `[overlay perf]` with average frame interval, estimated RAF FPS, average VFX callback cost, currently active particle/canvas counts, current tier, slide count and visible active-layer count. No visible debug UI is added. Diagnostics deliberately sample idle frames; normal overlays stop RAF entirely when VFX ends. Hidden documents stop sampling until visible again. FPS is a RAF estimate and callback cost excludes asynchronous GPU/compositor work. Counts are instantaneous at the report, so a finished burst correctly reports zero.

## Measured evidence

Chrome 154 headless on Windows, DPR 1, deterministic default-size 100%-intensity effects, both canvas planes, unchanged particle count and high hosted quality. Each variant renders five batches of 60 time samples; the table reports the median per-frame time including a raster-completion readback. Canvas contexts use `willReadFrequently` to keep the measurement on a consistent software raster path. Timings are a microbenchmark, **not TikTok Studio FPS**, and small differences are within normal run variance. See `hosted-performance-benchmark.json` for all samples.

| Effect | Before ms/frame | After ms/frame |
| --- | ---: | ---: |
| Impact | 1.228 | 1.167 |
| Spark | 0.888 | 0.900 |
| Magic | 0.857 | 0.837 |
| Confetti | 0.200 | 0.220 |
| Electric | 0.807 | 0.810 |
| Smoke | 0.710 | 0.700 |
| Fire | 0.872 | 0.845 |
| Ice shatter | 1.590 | 1.468 |
| Shockwave | 0.913 | 0.923 |

Across 60 frames, impact linear-gradient creation falls **368 -> 0**, and its path commands **8,464 -> 0**. Ice gradients fall **1,195 -> 0**, and path commands **27,923 -> 438**. Electric path commands fall **3,873 -> 210**. Cached face bitmaps trade gradient/path work for one image draw per fragment; this is not free raster work. Six effects produce identical sampled RGBA pixels at times 0.1, 0.3 and 0.6 in this fixture. Mean absolute channel differences on the 0-255 scale are 0.00520 for impact, 0.01687 for ice and 0.000013 for shockwave. Local edge differences exist; this metric is not a claim of exact visual equivalence for every shape/size. Side-by-side samples were visually inspected.

Regression tests also establish zero extra hosted VFX component renders on unchanged JSON refreshes, one shared pending RAF for multiple hosted bursts, no pending frames after completion, 1x1 released surfaces, and no accumulated callbacks after 1,000 repeated bursts.

## Reproduce

From a checkout containing the baseline commit and with Chrome installed:

```sh
npm install --no-save --package-lock=false playwright
node scripts/benchmark-vfx.mjs
```

Outputs are written under `work/performance`. Optional environment variables: `PERF_BASE` (baseline commit), `PERF_BROWSER` (Playwright browser channel), `PERF_OUTPUT` (output directory), `PLAYWRIGHT_MODULE` (an existing Playwright package directory). The script bundles actual baseline/current rendering modules and captures a PNG contact sheet plus JSON results. It requires no hosted account or project data.

## Validation and limits

- `npm run typecheck`: passed.
- `npm run lint`: passed, with two pre-existing font/image warnings.
- `npm test`: passed; added targeted scheduler, cleanup, reconciliation, broadcast, active-slide, transparency and cached-rendering coverage.
- `npm run build`: passed with CI placeholder environment variables; no live credentials required.
- Existing text layout, animation, image-alpha geometry, depth/composition, editor and save tests remain enabled.

Actual TikTok Studio hardware, long-running GPU memory, an authenticated production realtime session and the legacy iframe renderer have not been profiled here. The changes apply to modern project rendering at `/o/[publicId]`; the legacy renderer remains unchanged. Large translucent smoke/fire fills, SVG outlines/glow, large animated text surfaces, image decoding and first-use texture preparation can still be costly. Cold texture setup reached tens of milliseconds in the benchmark; its before/after order is JIT-sensitive, so no cold-start speedup is claimed. Hosted adaptive resolution helps subsequent expensive bursts but is not a substitute for a real Studio soak test. Preserve the separate branch/PR and validate representative overlays in Studio before merging.

## Files

Runtime changes: `app/o/[publicId]/OverlayClient.tsx`, `components/editor/VisualFX.tsx`, `lib/overlays/performance.ts`, `lib/overlays/reconcileProject.ts`, `lib/editor/visualFxCanvas.ts`, `lib/editor/visualFxParticles.ts`, `lib/editor/visualFxTextures.ts`.

Verification: `tests/hostedPerformance.test.ts`, `tests/hostedFxPlayback.test.tsx`, `tests/visualFxPlayback.test.tsx`, `tests/visualFxRendering.test.ts`, `scripts/benchmark-vfx.mjs`, this report and `docs/hosted-performance-benchmark.json`.

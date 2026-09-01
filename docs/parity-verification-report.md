# Legacy parity verification report

## Result

Exact parity has **not yet been achieved**, so PR #17 must remain a draft. Direct browser comparison is now available, and the previously listed implementation gaps have been addressed, but authenticated Supabase runtime verification is blocked by missing local project configuration/session and the matching-viewport pixel comparison still reports a meaningful residual difference.

## Matching-viewport visual evidence

Both editors were loaded in the same Chromium browser at an explicit **1440×900 CSS viewport** in their default selected-text state:

- [Legacy editor](parity-screenshots/legacy-editor-1440x900.png)
- [Modern React editor](parity-screenshots/modern-editor-1440x900.png)
- [3× contrast pixel difference](parity-screenshots/editor-pixel-diff-1440x900.png)

ImageMagick-style absolute RGB comparison (Pillow `ImageChops.difference`) after aligning viewport and control typography:

- mean absolute channel difference: **4.0852 / 255**
- pixels with any channel difference greater than 8: **8.9810%**
- channel RMSE: **20.0272**

The initial comparison was 14.8335% changed pixels. Correcting the inherited React form-control font size brought the panel/card geometry into direct alignment. The remaining difference is concentrated in text/control rasterization and the selected canvas text layer/viewport edge. Because exact parity is the acceptance rule, this remains a blocker rather than being dismissed as cosmetic.

## Resolved mismatches from the previous report

1. Added same-browser, same-viewport legacy/React screenshots and a pixel-difference artifact.
2. Wired exact legacy drag guides: X 0/5/10/25/50/75/90/95/100, Y 0/6.5/10/25/50/75/90/93.5/100, 0.8 threshold, Shift bypass, and 3px cyan guide lines.
3. Added one checkpoint on the first pointer/direct-edit mutation and live mutations thereafter, avoiding a history record for every pointer event.
4. Restored the cloud preset selector plus in-editor selection, rename/autosave, manual save, create, delete-and-replace, and current-project continuity flows.
5. Non-current slide T+ and image+ now select/add to the requested slide in one action.
6. Slide duplication now deep-clones fresh slide/layer IDs, appends ` Duplicate`, inserts immediately after the source, selects the copy and its first layer; final-slide deletion uses the legacy alert.
7. Rotation now uses the legacy timeout sequence, fades out, swaps after exactly 180ms, fades in, and schedules the next slide after the configured interval.
8. Added the legacy particle span renderer, deterministic counts/positions/sizes/delays/durations/colors, and exact particle class mapping.
9. Added all six exact global-theme image/text drop-shadow filters.
10. Added the fixed 1920×1080 logical stage with legacy scale/centering math.
11. Restored blank preset defaults, default text animation speed, and version-7 legacy export envelope/field names/filename sanitization.
12. Added exact final-layer/final-slide alert strings, unclamped legacy arrow nudges, fresh duplicate IDs, and copied-layer selection.
13. Added a development-only, explicitly environment-gated parity harness. Production authentication remains unchanged.

## Automated verification

- TypeScript typecheck: passed.
- Tests: **8 files, 38 tests passed**.
- ESLint: passed with 0 errors and 2 advisories (`no-page-custom-font`, `no-img-element`).
- Production build: passed; all 26 routes compiled/generated.

## Authenticated runtime-test status

Not completed. This checkout has only `.env.example`; it has no configured `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service-role key, or authenticated browser session. The available GitHub Pages deployment is the archived static editor, not the authenticated Next/Supabase application. The local `gh` executable also reports that its stored token is invalid despite the earlier external authentication status report.

Therefore the following required authenticated checks remain unverified: project creation/loading, autosave, manual save, refresh persistence, import/export persistence, hosted publishing/rendering, free-plan restrictions, and Pro animation restrictions.

## Remaining blockers

1. Reduce the 1440×900 residual pixel difference until no meaningful visual mismatch remains, then repeat stable, hover, pressed, selected, disabled, dialog, direct-edit, crop, animation and responsive state captures.
2. Supply/configure the intended Supabase environment and an authenticated Free and Pro test session, then complete and record the full persistence/publishing/entitlement matrix.
3. Re-run the full browser matrix after authenticated data hydration and hosted overlay publication.

Until these blockers are complete, PR #17 must remain draft and must not be described as exact parity.

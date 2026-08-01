# Legacy parity verification report

## Result

Exact parity has **not yet been achieved**. This branch restores the legacy editor structure and a large portion of its controls/data behavior, but direct legacy-versus-modern browser verification could not be performed because the required browser-control runtime was unavailable in this session. No screenshots are included, so this branch must not be represented as acceptance-complete.

## Restored features

- 430px legacy left panel, 58px grouped toolbar, 1920×1080/16:9 stage presentation, desktop and 900px responsive split.
- Legacy Preset and Overlay card layout, labels, button order, theme choices, preview buttons, rotation controls, help and shortcut copy.
- Nested slide cards with names, thumbnails, mini toolbars, entrance-animation list, nested reversed layer lists, drag handles and inline active-layer controls.
- Legacy text styles: solid, custom gradient, rainbow, aurora, fire, ice and gold; gradient angle; palette dropdowns; animation/speed/delay; shimmer; size; outline; opacity.
- Legacy image animation and burst selectors, speeds, outline/glow palettes, opacity, crop zoom and Reset Crop semantics.
- Eight canvas handles; normal text/image resize; Alt handle crop-resize; Alt image-body crop movement; double-click canvas text editing.
- Legacy keyboard values and commands: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+D, delete/backspace, .35% arrow nudge and 2% Shift+Arrow nudge.
- Plain UUID project creation via `crypto.randomUUID()`.
- Loss-preserving legacy normalization for text/image animation, shimmer, burst, particle, crop/inner dimensions, background-box fields, top-level legacy slide data and unknown properties.
- Server enforcement for legacy premium animation fields on create, save, duplicate and publish.
- Hosted overlay rendering through the same React canvas renderer as the editor.

## Restored visual details

- Legacy black/blue/orange panel gradients, translucent section cards, borders, radii, shadows, custom scrollbar, title and Pro Studio badge.
- Exact toolbar labels and icon-button grouping, selected/locked outlines, handles, preview checker/black/green/clear backgrounds, guide geometry, slide/layer card styling and color palette layout.
- Luckiest Guy stage typography and Inter UI typography loaded from the same font source.
- Legacy entrance, per-letter text, image motion, shimmer and burst CSS/keyframes restored for the exposed controls.

## Restored interactions

- Cloud manual save/autosave, import/export, new cloud project, hosted publish/copy, overlay-only toggle and rotation start/stop.
- Slide/layer selection, naming, duplication, deletion and drag reorder paths.
- Layer add, z-order, duplicate, lock, delete, X/Y centering, undo and redo.
- Image upload/replace and direct text editing.
- Server-side ownership, optimistic concurrency, one-slide entitlement and premium-animation entitlement paths retained.

## Automated verification

- `npm ci`: passed using a repository-local npm cache after the user-level cache was sandbox-denied.
- `npm run typecheck`: passed.
- `npm run lint`: passed with three warnings and no errors.
- `npm test`: 8 files, 35 tests passed.
- `npm run build`: passed; all 26 routes compiled/generated.
- `git diff --check`: passed.

## Exact remaining mismatches / unverified items

These items mean exact parity is not complete:

1. No matching-viewport legacy and modern screenshots or pixel-difference artifacts were produced because browser control was unavailable.
2. Hover, pressed, active, disabled, modal, empty, direct-edit, crop and animation visual states have not been inspected side-by-side at runtime.
3. Snap-to-guide behavior and visible snap lines are not yet wired into the React drag path; Shift bypass therefore remains unverified.
4. Pointer updates currently create React history entries more frequently than the legacy first-movement snapshot boundary.
5. Escape closes direct text editing but does not restore the pre-edit text value; the legacy implementation also mutates live, but exact undo/cancel timing remains unverified.
6. The legacy in-editor IndexedDB preset selector/delete workflow is represented by cloud project/dashboard navigation. Backend persistence requires an internal change, but exact user-facing continuity still needs direct review.
7. Add Text/Add Image inside a non-current slide requires a second click after selection; legacy performs selection and addition in one click.
8. Slide duplicate selection/restart timing and slide-delete alert wording are not yet exact.
9. Start Rotation uses a React interval and does not yet reproduce the legacy 180ms opacity swap exactly.
10. Legacy particle data is preserved and entitlement-checked, but the final React renderer does not yet draw particle spans.
11. Legacy global theme filters are selectable and persisted, but exact per-theme image/text drop-shadow rendering remains incomplete.
12. Free/Pro upgrade modal presentation is not positioned/styled as an approved legacy element because it is a required subscription exception; it still needs visual review for minimal intrusion.
13. Cloud project load/delete actions remain on the dashboard rather than matching the legacy preset controls in-place.
14. Direct manual verification of save/reload, hosted publishing, entitlement expiry and authenticated ownership was not possible without configured Supabase/Stripe runtime credentials.

## Required follow-up gate

Do not mark this work acceptance-complete until every item above is resolved and the complete matrix in `docs/legacy-parity-checklist.md` has matching legacy/modern screenshots and recorded behavior outcomes.

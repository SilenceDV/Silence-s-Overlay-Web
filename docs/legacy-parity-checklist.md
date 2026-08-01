# Legacy editor parity audit

Source of truth: `archive/Overlay4-legacy.html` (complete 2,161-line file inspected before implementation). Modern baseline: `app/editor/page.tsx`, every file in `components/editor`, `hooks`, `lib/editor`, `styles`, editor types and project API routes at commit `cb7f948`.

Status vocabulary: **matching**, **visually different**, **behaviorally different**, **missing**, or **backend-only exception**. Any item not marked matching must be treated as a parity defect until verified directly in both implementations.

## Page regions, sizing, and responsive behavior

| Legacy item | Exact legacy contract | Modern baseline | Audit status |
|---|---|---|---|
| App shell | 100vw × 100vh, hidden overflow, 430px left panel + remaining design area, `#08080a` background | 360px sidebar and generic navy application theme | **visually different** |
| Left panel | Full-height scrolling panel, 14px padding, 2px border, layered blue/orange/dark gradients, 10px custom scrollbar | Generic sidebar, 1rem padding, solid `#0d1120`, 1px border | **visually different** |
| Title | “Silence's Overlay Maker”, 24px/900, Pro Studio pill on same row | 1.25rem title; no badge | **visually different / missing** |
| Section cards | Exact translucent gradients, 18px radius, borders, spacing, shadows, title dot | Generic headings/sections without legacy cards | **visually different** |
| Design region | 58px toolbar + remaining canvas | Auto-height toolbar | **visually different** |
| Toolbar | Exact five grouped regions, labels, separators/cards, icon buttons, order and titles | Text buttons split into generic groups; project actions added here | **visually and structurally different** |
| Canvas area | Centered with 18px padding; exact preview classes | 2rem padding and different colors/checker | **visually different** |
| Stage viewport | `width:min(100%, calc((100vh - 94px)*16/9))`, 16:9, 16px radius and exact shadows | Different height calculation and no exact shadow/radius | **visually different** |
| Logical stage | Fixed 1920×1080 scaled and centered inside viewport | Percentage stage without explicit logical pixel surface | **behaviorally different** |
| Mobile ≤900px | One column; left 46vh, design 54vh; border relocation | Breakpoints at 1050/720 with different stacking, sizes and sticky toolbar | **visually/behaviorally different** |
| Overlay-only | Hides left/toolbar; full viewport transparent stage; no handles/guides/outlines | Separate hosted overlay route; editor lacks legacy toggle | **missing in editor**; hosted route is **backend-only exception** |

## Preset/project and overlay section

| Legacy control/flow | Exact contract | Modern baseline | Audit status |
|---|---|---|---|
| Preset Name | Label, placeholder “Example: Rocket League Gifts”, typing/blur status rules | “Project name”, no placeholder or matching statuses | **different** |
| Save | Green button; create/update current named preset | Toolbar “Save now”, cloud record | **visually different**; persistence is **backend-only exception** |
| New Preset | Dark button; exact confirmation and reset defaults | Red toolbar “New”, creates another cloud project | **visually different**; cloud creation is **backend-only exception** |
| Load Preset | Select with “Select preset...” and sorted names | Dashboard selection outside editor | **missing in editor**; dashboard is **backend-only exception** |
| Export/Import JSON | Yellow paired buttons in this order; exact file inputs, naming and status behavior | Toolbar Import then Export; different filename conversion and messages | **different** |
| Delete Current Preset | Full-width red button and exact confirmation/reset | Dashboard-only delete | **missing in editor** |
| Save status | Exact ready/name/unsaved/saved/failed messages in dark status box | Small colored status plus transient notice | **different** |
| Start/Stop Rotation | Paired buttons | No editor controls | **missing** |
| Seconds Per Slide | 1–60 slider, default 5, live value; running timer reschedules | Settings exists but no matching control/rotation | **missing/different** |
| Global Theme | Exact six choices and classes | Three unrelated values, no equivalent rendering | **missing/different** |
| Preview Background | Four buttons: Checker/Clear then Black/Green | Select with renamed options | **different** |
| Copy URL/Test URL | Paired buttons and legacy URL-size/status behavior | Publishing is dashboard-only hosted URL | **missing in editor**; hosted publishing is **backend-only exception** |
| Help/pro tip | Exact Alt crop paragraph and shortcut paragraph | Not present | **missing** |

## Top toolbar

| Group | Exact order and controls | Modern baseline | Audit status |
|---|---|---|---|
| Add | label; T+ icon; image+ icon; exact titles | Text-labeled buttons | **visually different** |
| Layer | Forward, Backward, Duplicate, Lock, Delete icon buttons | Same core operations as text buttons | **visually different**; behavior partly matching |
| Align | Center X, Center Y | No controls | **missing** |
| Edit | Undo, Redo icon buttons | Text buttons | **visually different** |
| View | Center Guides, Safe Area, Overlay Only | Guide checkboxes in sidebar; overlay-only absent | **different/missing** |
| Disabled states | Legacy actions silently no-op when unavailable; visual buttons are not generically disabled | Modern buttons disable | **behaviorally/visually different** |
| Hover/active/pressed | Exact brightness, scale, glow, active outline | Generic global hover/disabled styles | **visually different** |
| Tooltips | Exact `title` strings | Some titles renamed/absent | **different** |

## Slides and layers

| Legacy item | Exact contract | Modern baseline | Audit status |
|---|---|---|---|
| Slide card | 18px card, active/hover states, drag handle, name input | Compact article with slide number and whole-card draggable | **different** |
| Thumbnail | 100px image thumbnail with exact checker | Absent | **missing** |
| Mini toolbar | T+, image+, Duplicate, Delete in 2×2 grid | Only Duplicate/Delete | **missing/different** |
| Entrance animation | None, Fade, Pop In, Bounce, Spin, Shake, Slide Up, Fire Pulse, Electric Flicker, Zoom Punch, Glitch, Soft Float | None, Fade, Slide left/right, Zoom | **missing/different** |
| Layer list | Nested inside each slide; reversed visual order; drag handle/type icon/title/lock | Separate current-slide list; arrow reorder | **structurally and behaviorally different** |
| Empty layer state | Exact dashed “No layers yet...” state (though normal rules retain one layer) | None | **missing** |
| Add slide | Full-width bottom button, selects/restarts and smooth-scrolls to button | Generic sidebar button | **different** |
| Slide select | Card click except interactive descendants; name focus can select without rebuild | Generic article click | **different** |
| Slide reorder | HTML drag/drop handle, splice at target, selects first target layer | No functional drag/drop implementation | **missing** |
| Duplicate slide | Deep clone, new slide/layer IDs, “ Duplicate”, inserts after source, selects it and restarts entrance | Clone exists but does not select copy | **behaviorally different** |
| Delete slide | Alert when only one; otherwise selection/reset rules | Silent no-op at one; selection rules differ | **behaviorally different** |
| Rename slide | Live update, current slide follows, no menu rebuild/autosave debounce | Updates but full React history mutation each keystroke | **behaviorally different** |
| Layer reorder | Drag/drop within same slide and toolbar ±1 | Only arrow buttons/toolbar; no drag/drop | **missing** |
| Layer select | Selects its owning slide; renders inline controls inside active layer item | Current-slide-only list and separate controls section | **different** |
| Lock display | Lock glyph appended to title; selected outline becomes amber | Prefix glyph; canvas does not add locked class | **different** |

## Active text controls (exact order)

| Control | Legacy contract/default/range | Modern baseline | Audit status |
|---|---|---|---|
| Text | Auto-growing 42–140px textarea; stops canvas/key propagation; default “New Text” | Generic textarea | **different** |
| Style | Solid, Custom Gradient, Rainbow, Aurora, Fire Text, Ice Text, Gold Text | Solid/Gradient only | **missing** |
| Solid Color | Dropdown: preview, 29 default colors, 14 stream colors, native custom picker | Native color + text input | **missing/different** |
| Gradient colors | Same exact dropdowns for Gradient 1/2 | Native color controls | **different** |
| Gradient Angle | 0–360 slider, default 90, live degree label | Absent | **missing** |
| Text Animation | None, Wave Letters, Bounce Letters, Typewriter, Glitch Letters, Flicker Letters, Breathing | Generic continuous animation vocabulary | **missing/different** |
| Text Animation Speed | .2–5, .05 step, default 1.15s | .2–8, .1 step and different model | **different** |
| Letter Flow Delay | 0–.25, .005 step, default .055s | Generic delay 0–3 | **different** |
| Light Shimmer | Off/On; conditional speed control | Absent | **missing** |
| Shimmer Speed | .4–6, .05 step, default 2.2s | Absent | **missing** |
| Font Size | 10–220, default 72, live px label | Present | **matching values; placement/style different** |
| Outline | 0–14, .5 step, default 3, black stroke | Present | **matching values; placement/style different** |
| Opacity | 0–100, default 100, live % label | Separate parent controls | **different placement** |
| Background-box legacy fields | Normalizer preserves boxEnabled/color/opacity/radius/pad; no visible control in approved final markup | Discarded by modern model | **compatibility missing** |

## Active image controls (exact order)

| Control | Legacy contract/default/range | Modern baseline | Audit status |
|---|---|---|---|
| Replace / Reset Crop | Paired dark buttons; reset fit, crop, zoom and inner dimensions | Paired controls; reset omits fit/inner dimensions | **behaviorally different** |
| Image Animation | None; Pop + Burst; Impact Drop; Rocket In; Spin Slam; Float; Pulse; Wiggle; Slow Zoom; Hover Bounce | Generic shared options | **missing/different** |
| Image Animation Speed | .2–8, .05 step, default 1.4s | .2–8, .1 via generic animation | **different** |
| Burst Effect | None; Impact Burst; Ring; Star; Comet; Shockwave; Looping | Absent | **missing** |
| Burst Speed | Conditional .25–4, .05, default .82s | Absent | **missing** |
| Image Outline | 0–24px and label | Present but rendered as rectangular CSS outline, not legacy drop-shadow expansion | **behaviorally/visually different** |
| Outline Color | Full legacy dropdown palette | Native color + text input | **different** |
| Image Glow | 0–60px and label | Present | **placement/rendering different** |
| Glow Color | Full legacy dropdown palette | Native color + text input | **different** |
| Opacity | 0–100 | Separate parent control | **different placement** |
| Crop Zoom | 20–300, default 100 | Present | **matching range; placement different** |
| Alt-crop help | Exact paragraph | Absent | **missing** |
| Fit selector | Not exposed; fit changes through crop/reset behavior | Exposed Contain/Crop select | **extra user-visible defect** |

## Canvas rendering and pointer interactions

| Legacy behavior | Exact contract | Modern baseline | Audit status |
|---|---|---|---|
| Selection outline | 3px solid blue + 6px halo; amber locked variant | 2px aqua, no halo/locked variant | **visually different** |
| Resize handles | Eight 22px circular gradient handles at all compass points with exact cursors | One 14px southeast handle | **missing/different** |
| Normal drag | Percentage movement on 1920×1080 logical stage; snap unless Shift | Incremental percentage drag, clamps 0–100, no snap | **different** |
| Snap guides | X: 0,5,10,25,50,75,90,95,100; Y: 0,6.5,10,25,50,75,90,93.5,100; threshold .8; cyan 3px guides | Helper only knows 0,25,50,75,100 and is not used by canvas | **missing/different** |
| Shift drag | Disables snapping | No equivalent | **missing** |
| Normal resize | Every handle; edge/corner math; max 160%; images preserve/scale crop; text scales font according to dominant axis | SE only; max 100%; changes w/h only | **behaviorally different** |
| Alt + handle | Crop-resize: changes box without scaling content; image becomes cover and retains inner image | No equivalent | **missing** |
| Alt + image body | Moves image in crop window using logical pixels | No equivalent | **missing** |
| Reset crop | Restores contain, zero offsets, 100 zoom and inner dimensions equal box | Partial reset | **different** |
| Locked layer | Can select; cannot drag/edit/resize; amber outline | Click handler selection works, pointer down returns; visual locked state missing | **partly matching / visually different** |
| Clear selection | Click exact stage/animation/content background | Slide content click; event boundaries differ | **behaviorally different** |
| Double-click text | Native and manual two-click <420ms paths; selects without rebuild then enters overlay textarea | No direct canvas text editing | **missing** |
| Direct edit confirm | Ctrl/Cmd+Enter or blur commits | No canvas editor | **missing** |
| Direct edit cancel | Escape removes editor; live input has already changed text/history | No canvas editor | **missing** |
| Pointer capture | Layer/handle capture; global move/up complete edit | Per-element capture, no global finalization semantics | **different** |
| Guides | Exact center opacity/crosshair and safe inset 70px 120px with 4px dashed white | Different colors/insets/borders | **visually different** |
| Preview backgrounds | Exact dark 40px checker, transparent, #000, #00b140 | Light 24px checker and #0f0 green | **visually different** |

## Visual effects and animations

| Legacy system | Modern baseline | Audit status |
|---|---|---|
| Six global themes with exact multi-drop-shadow filters | Theme not applied to canvas | **missing** |
| Seven text fills including animated rainbow/aurora and three fixed gradients | Solid/custom gradient only | **missing** |
| Exact stroke/paint order and Luckiest Guy typography, Inter UI | Generic 800-weight text, no font import parity | **visually different** |
| Per-letter span rendering preserving newlines and NBSP spaces | Character spans only for two modern modes | **different** |
| Wave, bounce, typewriter, glitch, flicker, breathe keyframes/delays | Different vocabulary/keyframes | **different** |
| Text shimmer sweep | Absent | **missing** |
| Image impact/rocket/spin/float/pulse/wiggle/zoom/hover keyframes | Different shared animations | **different** |
| Six burst effects with exact conic/radial masks and keyframes | Absent | **missing** |
| Legacy particle renderer/CSS and preserved particle fields (not exposed in approved final controls) | Fields discarded | **compatibility missing** |
| Twelve entrance animations, restart by class removal/reflow | Five unrelated entrance names | **missing/different** |
| Slide fade transition | Opacity .45s; 180ms swap then next schedule | Hosted renderer differs; editor preview absent | **missing/different** |

## Keyboard, mouse, errors, and state rules

| Item | Legacy contract | Modern baseline | Audit status |
|---|---|---|---|
| Ctrl/Cmd+Z | Undo globally, including when typing due shortcut ordering | Ignored in editable controls | **different** |
| Ctrl/Cmd+Y | Redo | Missing (only Shift+Ctrl/Cmd+Z) | **missing** |
| Ctrl/Cmd+D | Duplicate selected when not typing | Missing | **missing** |
| Backspace/Delete | Delete selected when not typing; alert if final layer | Present but silent at final layer | **different** |
| Arrow nudge | .35%; Shift 2%; unlocked only | .1%; Shift 1%; clamps | **different** |
| Mobile keyboard behavior | Typing detection based on active element tag; text controls stop propagation | Generic editable-target early return | **different** |
| Undo history | Serialized slides, current index, selection, settings; max 80; push-on-first-drag/input patterns | Project-only immutable snapshot on every mutation; selection/settings timing differs | **different** |
| Redo invalidation | Cleared by new history push | Present | **matching core rule** |
| Final layer delete | Alert “A slide needs at least one layer.” | Silent no-op | **different** |
| Final slide delete | Alert “You need at least one slide.” | Silent no-op | **different** |
| Import errors | “Invalid preset JSON.” / “Import failed.” alerts | Generic notice | **different** |
| Overlay decode error | Exact alert and console error | Legacy URL unsupported | **missing** |
| Autosave failure | Exact status text | Generic save failure/notice | **different** |

## Defaults and compatibility mapping

| Property | Legacy default | Modern baseline | Audit status |
|---|---:|---:|---|
| Project/preset name | blank until save; default slide only | “Untitled Overlay” | **different** |
| Project ID | Legacy has no DB UUID | `project_<uuid>` | **defect: must use plain `crypto.randomUUID()`** |
| Default text x/y | New project 50/82; added text 50/50 | 50/50 universally | **different** |
| Text fields | effect, color, two gradients, angle, stroke, opacity, lock, textAnimation/speed/delay, shimmer/speed, box fields | Collapses to effect + generic animation; discards unknown legacy properties | **compatibility defect** |
| Image fields | image/fileName, x/y/w/h, imgW/imgH, fit, cropX/Y/zoom, outline/glow, imageAnimation/speed, burst/speed, particle/speed | Retains basic geometry/crop/outline/glow; collapses animation and discards burst/particle | **compatibility defect** |
| Slide fields | id, giftName, animation, duration, ordered layers | Renames fields; supports only five entrance values | **compatibility defect** |
| Settings | speed 5, themeNone, previewChecker | speed 5, none, checker plus guide booleans | **mapping incomplete** |
| Unknown properties | `Object.assign(default, legacy)` retains them | Typed normalization reconstructs and discards them | **compatibility defect** |
| Legacy top-level slide | Migrates image/imageX/Y and text/textX/Y | Creates default text only when no layers | **compatibility defect** |
| Export envelope | name, version 7, settings, slides, exportedAt | schemaVersion 2 Project | **compatibility defect** |
| Replacement import ID | Legacy name-keyed; modern must normalize to current UUID | Sets imported id to route project ID | **matching intent; test required** |

## Backend-only exceptions that must remain visually unobtrusive

| Requirement | Baseline | Audit status |
|---|---|---|
| Supabase authentication/ownership | Editor loader and project APIs scope by authenticated owner | **matching architecture** |
| Cloud load/save/autosave | Project row load, 700ms autosave, optimistic coordinator | **matching architecture; regression tests required** |
| Optimistic concurrency | Versioned PUT/409 coordination | **matching architecture** |
| Free one-slide rule | Client add/duplicate modal plus server save/create enforcement | **matching architecture; exact editor placement must not drift** |
| Pro animations | Publish derives premium from modern animation only | **incomplete for legacy animation/burst/shimmer fields** |
| Hosted overlays | Secure owned publish and public ID route | **matching architecture; legacy visual renderer parity unverified** |
| Entitlement expiry | Central entitlement logic/status endpoint | **matching architecture; deactivation verification required** |
| UUID project creation | API inserts `defaultProject().id`, currently prefixed | **defect** |

## Required verification matrix

Each row must be exercised in the legacy file and React editor at the same viewport, with screenshots for stable states and direct result comparison for behavior:

- Default load; preset/project naming; save; autosave; manual save; reload; new; delete; import; export; replacement import ID.
- Add/edit/confirm/cancel text; every fill, palette, angle, outline, opacity, text animation, speed, delay and shimmer state.
- Add/upload/replace image; every animation, burst, outline/glow color and amount, opacity, crop zoom, Reset Crop.
- Select/clear/lock/duplicate/delete/reorder layers; toolbar z-order and X/Y center; drag snapping and Shift bypass.
- All eight resize handles in normal and Alt modes; Alt body crop movement; resize already-cropped images; text scaling.
- Add/select/rename/duplicate/delete/reorder slides; all entrance animations; rotation start/stop/speed/fade.
- Undo/redo boundaries for controls, typing, drag and resize; every shortcut; typing exclusions; locked-layer behavior.
- Checker/clear/black/green previews; center/safe guides; overlay-only editor toggle; hosted browser-source publication and entitlement loss.
- 430px desktop layout and ≤900px mobile layout; toolbar/sidebar/canvas; selected/hover/active/disabled/empty/edit/crop/animation states.

## Audit conclusion before implementation

The baseline is not at parity. Exact parity has **not** been achieved. The implementation phase must restore every defect above while preserving the backend-only exceptions. Direct screenshot and workflow verification is mandatory before any completion claim.

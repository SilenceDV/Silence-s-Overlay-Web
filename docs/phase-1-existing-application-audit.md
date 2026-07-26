# Phase 1: Existing Application Audit and Migration Plan

## Scope and source inspected

This audit is based on the repository's complete legacy application, `Overlay4.html`
(2,161 lines, approximately 115 KB). The requested filename
`Overlay4 (1)(2).html` is not present in the repository; `Overlay4.html` is the only
application source currently checked in.

This phase deliberately makes no runtime changes. The legacy file remains the
behavioral reference while the subscription application is introduced in small,
reviewable phases.

## Current architecture

The application is a dependency-free, single-page HTML document containing all CSS,
markup, editor state, persistence, rendering, and browser-source behavior. It uses
inline event attributes plus DOM-building functions rather than a component system.
The editable stage is fixed at 1920x1080 and is scaled into a responsive 16:9
viewport.

Global mutable state includes `slides`, `currentIndex`, `selectedId`, edit/drag state,
an 80-entry undo history, a redo stack, rotation timers, and IndexedDB autosave state.
Re-rendering is imperative: `renderSlides()` rebuilds the left panel and
`renderStage()` rebuilds the stage.

## Current data model

### Preset/project envelope

Persisted and exported presets currently resemble:

```text
{
  name,
  version: 7,
  settings: { speed, theme, preview },
  slides: Slide[],
  savedAt | exportedAt
}
```

There are no users, ownership fields, project IDs, optimistic-concurrency versions,
subscriptions, or hosted overlay records.

### Slide

A slide contains `id`, `giftName`, entrance `animation`, `duration`, and an ordered
`layers` array. Array order is both slide order and layer order. Older slide-shaped
objects with top-level image/text properties are partially migrated by `normSlide()`.

### Shared layer geometry

Layers use percentage-based `x`, `y`, `w`, and `h` against the 1920x1080 stage, plus
`id`, `type`, `name`, `opacity`, `locked`, animation values, and type-specific fields.
Layer array position determines stacking order.

### Text layer

Recognized text data includes content, font size, solid/gradient/effect colors,
gradient angle, stroke, optional background-box styling, opacity, continuous text
animation, animation speed, per-letter delay, and shimmer settings.

### Image layer

Recognized image data includes a data URL in `image`, original filename, crop box and
inner-image dimensions, fit, crop offsets/zoom, outline/glow settings, continuous image
animation, burst effect, particles, and their speeds.

### Normalization

`normLayer()` and `normSlide()` merge defaults into legacy objects and retain unknown
properties through `Object.assign`. They preserve array ordering and embedded image
data. There are duplicate legacy assignments and aliases, and numeric normalization
often uses `value || default`, which incorrectly replaces valid zero values in some
fields. There is no explicit schema version migration pipeline or validation boundary.

## Existing editor behavior inventory

- Add, edit, duplicate, delete, lock, select, reorder, and keyboard-nudge layers.
- Add, rename, duplicate, delete, select, drag-reorder, and automatically rotate
  slides.
- Add and replace PNG/JPEG/WebP images via `FileReader` data URLs.
- Drag and resize layers with eight handles; snap to predefined guides.
- Hold Alt while dragging an image or handle to move/resize its crop window.
- Direct text editing, text-area controls, gradient/effect controls, stroke, opacity,
  image outline/glow, preview backgrounds, safe-area and center guides.
- Undo/redo snapshots stored as serialized editor state, capped at 80 snapshots.
- Entrance animations on the slide wrapper plus continuous text/image animations,
  burst effects, and particles. The file already contains multiple generations of
  overlapping animation CSS and renderer functions.
- True character spans for several text modes are generated at render time without
  changing stored text. Newlines become line wrappers and spaces become non-breaking
  spaces. Accessibility semantics are not explicitly provided.
- Overlay-only mode, timed slide rotation, and transparent/checker/black/green preview
  backgrounds.

## Current persistence

IndexedDB database `SILENCE_OVERLAY_MAKER_DB_V7`, object store `presets`, is the
authoritative store. Records are keyed by the user-entered preset name. A 700 ms
debounced autosave only updates a preset after it has first been explicitly saved or
loaded. `localStorage` stores the last preset name. JSON import performs only parsing
and an `Array.isArray(slides)` check; JSON export includes the complete normalized
project, including base64 image data.

There is no server persistence, authentication, quota, payload limit, conflict
detection, retry strategy, ownership check, or untrusted-input schema validation.

## Current overlay URL system

`overlayURL()` normalizes and serializes all settings/slides, UTF-8 base64-encodes the
JSON, and places it in `a query-and-fragment embedded payload`. Initialization decodes the URL fragment
entirely in the browser and starts rotation. This makes every link self-contained,
potentially extremely large, impossible to revoke, and independent of future account
or subscription state. It can also expose all published content to anyone holding the
URL.

This mechanism must remain available only as a legacy migration reference. Production
publishing must instead persist a sanitized snapshot and issue a cryptographically
random `/o/{publicId}` URL whose server response is entitlement checked and sent with
`Cache-Control: no-store`.

## Current animation system

Slide entrance animation is a CSS class on `animWrap`, restarted by removing/re-adding
the class. Separate wrappers/classes implement continuous layer movement, image loops,
text loops, per-character wave/bounce/glitch/flicker/typewriter effects, shimmer,
particles, and image bursts. Speed and letter delay are CSS custom properties.

The animation implementation is feature-rich but duplicated: earlier and later CSS
rules and two `renderAnimatedText()` declarations overlap, with the later declaration
winning. During migration, visual regression fixtures must be captured before
deduplicating these rules.

## Security and production gaps

- No authentication, authorization, tenancy, RLS, or server-side plan enforcement.
- IDs use `Math.random()` plus a timestamp and are unsuitable as public identifiers.
- Imported JSON is untrusted but has no schema, depth, count, or payload-size limits.
- Images are accepted based on the file picker and browser-reported type, then embedded
  as unbounded data URLs; there is no magic-byte, dimension, or quota validation.
- Browser URLs are irrevocable self-contained exports and bypass all entitlements.
- Inline HTML generation is widespread. Some interpolated text is escaped, but safe
  React text rendering and validated style enumerations are required before accepting
  cloud data.
- Autosave has no request sequencing or revision comparison and cannot prevent stale
  writes from multiple tabs.
- Client state controls every capability, so it cannot be reused as an authorization
  decision.

## Migration risks and safeguards

1. **Behavior loss during componentization.** Preserve the legacy file unchanged as a
   reference, build typed migration fixtures, and port state transitions before
   restyling UI.
2. **Image loss.** Legacy data URLs must survive normalization. A later explicit asset
   migration uploads them to private, user-scoped storage and replaces them only after
   successful upload; failed conversions retain the source project unchanged.
3. **Ordering regressions.** Preserve slide/layer array order and add tests before
   implementing drag-and-drop in React.
4. **Crop/geometry drift.** Keep percentage geometry and inner-image crop fields
   losslessly; test representative contained and cropped images at 1920x1080.
5. **Animation naming conflicts.** Define a compatibility map from all legacy class
   names to typed animation IDs. Never discard an unknown value during migration.
6. **Gradient wave rendering.** Character wrappers need inherited/compatible gradient
   styling, `aria-label` text on the parent, hidden decorative spans where appropriate,
   and a plain text editing surface.
7. **Oversized database records.** Upload data-URL images before cloud persistence and
   reject oversized imports server-side without mutating the original local preset.
8. **Entitlement bypass.** Put ownership, schema, slide-count, premium-feature, and
   storage checks in shared server services called by every mutation; UI locks are only
   explanatory.
9. **Subscription races.** Derive access centrally from Stripe-synchronized status,
   paid-period end, failed-payment grace end, and trusted server time. Publishing and
   every public revalidation use the same function.
10. **Cached paid access.** Serve entitlement-sensitive HTML/status without storage,
    revalidate approximately every five minutes, and clear already-rendered content
    when inactive.

## Phased implementation plan

### Phase 2 - typed application shell and editor migration

Create Next.js/TypeScript tooling, shared editor types, a versioned pure migration
function, reducer/store, canvas and controls components, and legacy fixtures. Port
features in small vertical slices while preserving the current visual layout. Keep the
legacy HTML during parity work. Establish Vitest and Playwright smoke/regression tests.

**Exit gate:** build, TypeScript, lint, unit tests, and editor smoke tests pass; legacy
fixtures preserve slide/layer ordering, images, crop values, entrance animations, and
undoable operations.

### Phase 3 - authentication and cloud projects

Add Supabase SSR authentication flows and middleware, profiles/projects schema with
RLS, private image storage policies, server-only ownership services, validated upload
and import endpoints, optimistic project revisions, and sequenced debounced autosave.
IndexedDB becomes only an offline/import source for signed-in users.

**Exit gate:** auth flows and ownership tests pass; one user's resources cannot be
accessed by another; uploads are content/dimension/quota checked; conflicts cannot be
silently overwritten.

### Phase 4 - Stripe and centralized entitlements

Add server-only Stripe Checkout/Portal routes, the centralized entitlement function,
configurable three-day payment grace, webhook signature verification, transactional
idempotency records, and synchronization for checkout, subscription, invoice, refund,
and dispute events. Add server mutation guards and upgrade UI.

**Exit gate:** entitlement and webhook test matrices pass, including cancellation
access through paid period end, grace expiry, recovery, duplicate delivery, and invalid
signatures.

### Phase 5 - hosted overlay delivery

Add overlays schema/RLS and secure publish/unpublish/regenerate services. Render only a
sanitized published snapshot from `/o/{publicId}` after owner/project/enabled/
entitlement checks. Add a small status endpoint and five-minute client revalidation,
transparent inactive state, recovery, rate limiting, and no-store headers.

**Exit gate:** active/free/expired/disabled/restored/regenerated overlay tests pass and
public responses never expose draft or account data.

### Phase 6 - continuous animation product controls

Consolidate existing animation implementations behind typed per-layer settings
(`loopAnimation`, speed, intensity, delay), compatibility aliases, reduced-motion
behavior, and premium metadata. Retain character-by-character text rendering with
accessible plain text semantics and non-destructive editing.

**Exit gate:** premium checks run on both project save/import and overlay publish;
dragging, resizing, editing, gradients, outlines, undo/redo, and entrance animations
pass regression tests with continuous animation enabled.

### Phase 7 - hardening, account lifecycle, and deployment

Add endpoint-specific rate limits and audit events, session/account management,
recent-auth account deletion workflow and retention documentation, operational cleanup
jobs, complete E2E/security coverage, `.env.example`, setup/troubleshooting docs,
Vercel configuration, and deployment checklist.

**Exit gate:** every completion requirement is verified in CI and a staging deployment;
manual Stripe, Supabase, DNS, retention-policy, and webhook actions are documented.

## Decisions to carry into implementation

- PostgreSQL/Supabase is authoritative; browser storage never grants entitlements.
- Unknown legacy fields are retained in migration output, but only recognized,
  validated fields may affect rendering or authorization.
- Public IDs use a cryptographically secure random generator and are independently
  regenerable from internal UUID primary keys.
- Published overlays are immutable sanitized snapshots until explicitly republished;
  projects remain intact when plans expire.
- `profiles.plan` is display/denormalized state only. Access comes from centralized
  server entitlement calculation and trusted timestamps.
- All mutations resolve the authenticated user on the server, fetch owned records by
  both resource ID and user ID, validate normalized data, and enforce entitlements in
  the same transaction/service boundary.

# Classroom — Magic Park 2.2 / AnaTema2 Redesign

## Status

Approved design direction: **C — deep component refactor**. Implementation has not started; this document is the user-review gate before the implementation plan.

Date: 11 August 2026

## Goals

Magic Park 2.2 will replace the current Magic Park artwork with `public/assets/AnaTema2.png` and rebuild the eight live card interiors so their hierarchy, spacing, materials, typography, portraits, status surfaces and responsive behavior are designed specifically for the new artwork.

This is not a cosmetic CSS reskin. The card-internal DOM structure may be refactored where needed, while preserving the current data sources, behavior contracts, accessibility, schedule/noise/slideshow/role functionality and the multi-theme package architecture.

The result must look intentional at 3840×2160 first, then remain visually balanced at 2560×1440 and 1920×1080 without clipping, overflow or fallback regressions.

## User Decisions

1. `AnaTema2.png` becomes the Magic Park artwork.
2. Magic Park remains the registry default and fallback theme.
3. Existing browsers that still contain an old valid `school-garden` or `school-science` preference must be migrated **once** to Magic Park.
4. After that one-time migration, any explicit theme selection made by the user must persist normally across reloads.
5. The redesign approach is **C**: card internals may be substantially refactored instead of preserving the current Magic Park card markup merely for convenience.
6. The visible headings embedded in the artwork remain the visible headings for Magic Park. Semantic heading text stays in the DOM for accessibility and cross-theme reuse but is visually suppressed only under the Magic Park package.

## Root Cause of the Default-Theme Bug

The registry already declares:

- `defaultThemeId = magic-park`
- `fallbackThemeId = magic-park`

However, the runtime intentionally gives a valid stored `localStorage['classroom_kiosk_theme']` preference priority over the registry default. Existing browsers therefore continue to open `school-garden` or `school-science` when such a value was saved before Magic Park became the desired first-open default.

The fix is a **versioned one-time preference migration**, not a permanent override of user choice.

## Theme Preference Migration Design

The theme runtime will gain a small migration version contract, for example:

- preference key: `classroom_kiosk_theme`
- migration key: `classroom_kiosk_theme_migration`
- current migration version: a fixed version string owned by `kiosk-theme.js`

The exact migration-key spelling/version token is an implementation detail, but the one-time semantics above are mandatory.

On startup:

1. Read the migration marker.
2. If the current migration has not run yet:
   - if the stored theme is `school-garden` or `school-science`, replace it with `magic-park`;
   - if storage is absent, leave it absent and allow registry default to resolve to Magic Park;
   - if storage already contains `magic-park`, keep it;
   - if storage contains an invalid value, preserve the existing corrupt-value fallback path;
   - then write the migration marker.
3. On all later startups, use the existing persistence behavior unchanged.

This gives the current rollout one clean reset while preserving future explicit choices.

If localStorage access is denied, startup must remain safe and continue using the registry default without throwing.

## Artwork Source of Truth

Magic Park 2.2 artwork:

- `public/assets/AnaTema2.png`
- dimensions: `2730×1536`
- aspect ratio: effectively 16:9

The artwork contains eight visual destination panels. Their approximate measured image-space regions are:

| Region | Approximate artwork bounds |
| --- | --- |
| Clock | x 190–580, y 110–475 |
| Class statistics | x 135–655, y 650–1005 |
| Lesson flow | x 120–685, y 1100–1455 |
| Noise | x 910–1910, y 100–520 |
| Slideshow | x 860–1915, y 695–1285 |
| President | x 2180–2570, y 150–505 |
| Duty | x 2150–2605, y 675–1040 |
| Stars | x 2130–2635, y 1130–1475 |

These measurements are design inputs, not hard-coded pixel constraints. Final runtime layout will use normalized percentages/container units and verified inner safe areas.

## Visual Language

`AnaTema2.png` uses a more neutral stone/paper interior with strongly differentiated colored frames. The content layer should therefore avoid competing full-card colored surfaces. Instead, card interiors should feel inset into the artwork.

### Shared principles

- Use the artwork itself as the dominant material layer.
- Prefer translucent parchment/ivory/neutral inset surfaces over opaque saturated card backgrounds.
- Use the surrounding frame color as the accent source for each region.
- Reduce redundant decorative borders where the artwork already provides a strong physical frame.
- Use soft local shadows and small depth cues rather than large floating glass cards.
- Use Fredoka for hero values/names where appropriate and Nunito for supporting copy.
- Keep contrast high enough for classroom distance viewing.
- Avoid corporate-dashboard density; preserve the playful premium classroom character.

### Region accents

The eight regions should derive their accent treatment from the artwork instead of reusing one generic component palette:

- Clock: warm wood/gold accent.
- Class statistics: warm wood/cream with restrained attendance-state color.
- Lesson flow: purple/lilac accent.
- Noise: blue/steel/aqua accent.
- Slideshow: warm red/brown theatre accent.
- President: warm wood/gold accent.
- Duty: aqua/blue accent.
- Stars: berry/pink/gold accent.

## Component Architecture

The current single large Magic Park stylesheet and mixed card markup will no longer be treated as the ideal internal structure.

Magic Park 2.2 should establish clearer component boundaries while preserving public IDs/classes required by existing JavaScript where practical.

Recommended component structure:

1. **Clock scene**
   - date cluster
   - hero digital time
   - weekend state badge

2. **Attendance scene**
   - present/total hero summary
   - gender summary
   - attendance state
   - paged absent roster

3. **Lesson-flow scene**
   - before-school mode
   - active class/break mode
   - after-school/weekend mode
   - current/next lesson context

4. **Noise instrument scene**
   - full-width level meter
   - full-width equalizer
   - compact listening/status copy
   - retry action
   - no mascot artwork inside this top panel

5. **Class TV / broadcast scene**
   - rotating information programmes
   - Atatürk image + quote programmes
   - class attendance/statistics programmes
   - absent-student programmes with portraits
   - vice-president programmes with portraits
   - announcement/poster programmes
   - student-photo celebration programmes
   - Lavunu mascot picture-in-picture interventions
   - high-noise full-screen mascot takeover
   - CRT/television presentation layer

6. **President scene**
   - president hero only
   - no vice-presidents in this panel
   - empty/fallback state

7. **Duty scene**
   - four duty students
   - empty/fallback state

8. **Stars scene**
   - hero student portrait
   - name plate
   - pagination/transition indicators
   - empty/fallback state

Where current DOM structure makes the new artwork-specific hierarchy awkward or fragile, markup may be replaced with clearer wrappers. Existing JavaScript should be updated to target stable semantic hooks rather than relying on presentation-only nesting.

## CSS Ownership

Magic Park package ownership remains isolated from Garden and Science.

The redesign may split Magic Park styling into focused files if that makes the package substantially easier to reason about, for example:

```text
public/themes/magic-park/
  theme.json
  theme.css
  magic-layout.css
  magic-components.css
  magic-states.css
```

The exact file split is an implementation decision. The important constraint is that the new Magic Park-specific layout and component rules must not leak into `school-garden` or `school-science`.

Shared application logic must not be moved into theme CSS.

## Responsive Geometry

The stage remains 16:9 and centered.

Magic Park 2.2 must derive its layout from the measured `AnaTema2.png` panel regions rather than blindly retaining the old `%27 / %47.5 / %25.5` geometry.

Each region will receive:

- artwork-aligned outer bounds;
- a separately measured inner safe area;
- region-specific padding;
- region-specific content alignment;
- responsive clamp/container-unit typography.

The implementation must validate that dynamic content remains inside the **inner artwork opening**, not merely inside the broader DOM card rectangle.

## Content Redesign by Region

### Clock

The time becomes the dominant visual. Date is a quiet top cluster; weekend countdown becomes a compact bottom badge. No extra opaque panel should cover the artwork unnecessarily.

### Class statistics

The narrow class-statistics panel becomes a **mini rotating information screen** rather than carrying the entire attendance hierarchy at once. It may cycle through a small number of compact views such as present/total, girl/boy split, attendance state and a concise absent summary. The larger, portrait-rich versions of these stories belong on Class TV. The mini screen must feel lively without becoming visually noisy or unreadable from classroom distance.

### Lesson flow

The active state must be readable from several metres away. Countdown/remaining time is hero content, current/next course context is secondary. Before-school and after-school modes must share the same visual grammar instead of looking like unrelated mini-pages.

### Noise

The top noise panel is now a dedicated **listening instrument**. Lavunu is removed from this panel completely. The level meter, equalizer and compact status/retry UI use the full available opening and visually read as one playful instrument rather than several small cards. Idle/requesting/unavailable/low/medium/high states remain designed states, not accidental blanks.

### Class TV / former slideshow panel

The large centre panel becomes the **primary classroom information and announcement screen**, not a conventional photo slideshow. Existing slideshow media remains one programme family inside a broader broadcast scheduler.

Class TV cycles through cheerful, highly visual programmes such as:

- Atatürk artwork and short quote cards;
- present/total attendance stories;
- girl/boy class-composition stories;
- absent students with student portraits when available;
- the two vice-presidents with portraits and names;
- classroom announcements/posters;
- student-photo celebration/highlight scenes;
- existing uploaded media/text slides and curated fallbacks.

The presentation should evoke a colourful child-friendly television, including restrained CRT traits such as slight glass curvature, scanline/beam texture, edge glow, phosphor-like bloom and transition wipes. These effects must remain subtle enough that text and faces stay sharp.

Class TV owns a **broadcast director** rather than a simple sequential slideshow timer. The director chooses the next eligible programme, prevents immediate repetition of the same programme family and allows priority interventions without destroying the underlying programme state.

#### Lavunu broadcast behaviour

Lavunu moves from the top noise panel into Class TV and is driven by the existing noise state machine.

- **Normal/quiet:** Lavunu appears only occasionally as a short picture-in-picture/sticker-style guest. It must not pause or cover the main information programme for long.
- **Rising/attention:** the shushing/attention mascot appears more frequently and more prominently, but still as a bounded overlay so the underlying programme remains readable.
- **Very loud/high:** Class TV performs a short full-screen takeover with the loud/angry mascot, stronger CRT shake/pulse treatment and a clear quiet-down message. This takeover lasts only a few seconds, then restores the programme that was interrupted.

The director must apply cooldowns and coalescing so continuous microphone sampling cannot permanently monopolise Class TV. Repeated high-noise samples during an active takeover extend/refresh only within a bounded limit instead of restarting animation every frame.

### President

The president panel shows **only the class president** with a clear portrait/name hierarchy. Vice-presidents move to Class TV where the larger screen can present them with appropriate portraits and typography. Empty and transient-failure states must still feel intentionally designed.

### Duty

Four students should form a balanced 2×2 presentation aligned to the panel proportions, with portrait/name emphasis and robust long-name handling.

### Stars

One featured student at a time remains the preferred composition. The portrait and name should harmonize with the berry/gold frame. Pagination indicators remain subtle and never compete with the student.

## Accessibility

- Embedded artwork headings do not replace semantic labels.
- The eight semantic card heading texts stay present in the DOM.
- Under Magic Park they are visually hidden without using `display:none` if doing so would remove useful accessibility semantics.
- Garden and Science continue rendering their visible DOM headings.
- Existing ARIA live regions, meter/progress semantics, buttons and state announcements remain intact.
- Decorative artwork and generated decoration remain non-interactive.

## Data and Behavior Preservation

The redesign must not change backend contracts.

Preserve:

- `/api/stats`
- `/api/roles`
- `/api/slides/active`
- normalized schedule loading
- time simulator presets
- role fallback/empty behavior
- absent roster pagination
- noise meter states
- slideshow fallback and long-text behavior
- star transitions
- theme selector registry/manifest behavior

DOM refactoring is allowed only with corresponding JavaScript updates and regression coverage.

## Broadcast Data Flow

Class TV is a presentation coordinator over existing data sources; it does not introduce a new backend API.

Inputs:

- `/api/stats` for present/total, girl/boy and attendance information;
- the existing absent-student state already derived by the dashboard;
- `/api/roles` for vice-presidents and other role-driven stories;
- `/api/slides/active` plus curated Atatürk fallback media;
- existing noise-meter state/score for Lavunu interventions.

The dashboard should maintain a small serialisable **broadcast snapshot** containing the latest eligible content. Class TV renders from that snapshot and keeps schedule/timer ownership inside one module/bounded set of functions rather than scattering timers across attendance, roles and noise code.

Noise integration should use a stable event/hook boundary (for example a custom DOM event carrying semantic state plus normalized score) instead of the broadcast layer polling the microphone implementation directly. This keeps `noise-meter.js` responsible for sensing/classification and keeps Class TV responsible for presentation priority.

When data is temporarily unavailable, the director skips unavailable programme families and keeps rotating through valid content. A transient API failure must not blank the screen or erase the last valid broadcast snapshot.

## Testing Strategy

Implementation follows TDD and must preserve the existing dirty checkout without resetting unrelated work.

### Theme migration tests

Cover at minimum:

- old stored `school-garden` → one-time Magic Park migration;
- old stored `school-science` → one-time Magic Park migration;
- existing Magic Park remains Magic Park;
- missing storage uses registry default;
- migration marker prevents later user selections being overwritten;
- after migration, explicit Garden/Science selection survives reload;
- corrupt storage still follows safe fallback behavior;
- denied storage does not throw.

### Artwork contract tests

Cover:

- `AnaTema2.png` exists and is valid PNG;
- dimensions remain high resolution and near 16:9;
- index preload points to `AnaTema2.png`;
- Magic Park manifest background/preview point to `AnaTema2.png`;
- active Magic Park CSS requests `AnaTema2.png`;
- old Magic Park artwork is not requested by the active runtime.

### Component contract tests

New or updated tests should lock the stable semantic hooks needed by JavaScript after DOM refactoring, without overfitting to incidental wrapper nesting.

### Class TV / noise integration tests

Cover at minimum:

- the top noise panel contains meter/equalizer/status controls but no `noise-character-img` mascot;
- the president panel renders the president only;
- vice-presidents remain available to the Class TV programme generator;
- Class TV programme generation can include attendance, gender split, absent roster, Atatürk and vice-president stories;
- normal noise produces only a bounded occasional mascot overlay;
- attention noise can increase intervention frequency without replacing every normal programme;
- high noise triggers a full-screen takeover;
- takeover has a bounded duration/cooldown and restores the interrupted programme;
- repeated microphone samples do not spawn overlapping takeover timers/animations;
- Class TV remains usable when one programme data source is absent or stale.

### Browser acceptance

Both Playwright and Chrome DevTools are mandatory for final acceptance.

Validate at:

- 3840×2160
- 2560×1440
- 1920×1080

For Magic Park, inspect all eight regions in representative states:

- normal clock/statistics;
- long absence roster;
- before-school;
- active class;
- break;
- after-school;
- weekend;
- noise idle/requesting/unavailable/low/medium/high;
- Class TV attendance/gender/absence/vice-president/Atatürk/media programmes;
- Class TV normal Lavunu picture-in-picture, attention intervention and high-noise takeover;
- broadcast no-slide fallback, broken-media fallback and long story text;
- president/duty/stars populated;
- long names;
- empty roles;
- multi-star transition.

Acceptance requires:

- no visible content crossing the measured artwork safe area;
- no document overflow;
- no unexpected clipping;
- no duplicate visible artwork/DOM headings;
- no console error/warn attributable to the redesign;
- no failed or unexpected HTTP requests;
- Garden and Science remain functional after the shared DOM changes.

## Non-Goals

- No backend/API redesign.
- No removal of Garden or Science.
- No permanent “always reset to Magic Park on every load” behavior.
- No reduction of visual quality for performance convenience.
- No replacement of dynamic DOM content with baked-in artwork.
- No unrelated admin-panel refactor.

## Completion Definition

Magic Park 2.2 is complete only when:

1. the one-time theme migration fixes existing installations without breaking future persistence;
2. `AnaTema2.png` is the sole active Magic Park shell artwork;
3. all eight Magic Park card interiors have been deliberately redesigned for the new artwork geometry and visual language;
4. the centre panel operates as Class TV with multiple data-driven programme families and bounded Lavunu noise interventions;
5. the top noise panel is a dedicated meter/equalizer instrument with no resident mascot;
6. the president panel contains only the president and vice-presidents are presented through Class TV;
7. necessary DOM/JS refactoring is covered by regression tests;
5. Garden and Science still work;
6. Playwright + Chrome DevTools acceptance is clean at 4K, 1440p and 1080p;
7. project-wide regression and documentation gates pass;
8. the living visual inventory and handoff documents are updated with the final evidence.

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

4. **Noise scene**
   - mascot/status cluster
   - level meter
   - equalizer state
   - retry action

5. **Slideshow scene**
   - media stage
   - caption plate
   - text-only story state
   - media fallback state

6. **President scene**
   - president hero
   - two vice-presidents
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

Attendance becomes a clearer information hierarchy rather than several equal-weight boxes. Present/total count is the hero. Gender counts become compact supporting chips. Attendance status and absent roster occupy a lower structured zone.

### Lesson flow

The active state must be readable from several metres away. Countdown/remaining time is hero content, current/next course context is secondary. Before-school and after-school modes must share the same visual grammar instead of looking like unrelated mini-pages.

### Noise

The mascot should remain recognizable without dominating the entire panel. Status copy, meter and equalizer must visually read as one instrument rather than separate cards. Idle/requesting/unavailable states remain designed states, not accidental blanks.

### Slideshow

The panel should feel like a framed exhibit. Media gets maximum useful area. Captions use an artwork-compatible plate rather than a large generic overlay. Long story text remains a valid first-class state.

### President

The president gets a clear portrait/name hierarchy. Vice-presidents remain visible as secondary roles without making the panel feel like a list. Empty and transient-failure states must still feel intentionally designed.

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
- slideshow normal, no-slide fallback, broken-media fallback, long story text;
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
4. necessary DOM/JS refactoring is covered by regression tests;
5. Garden and Science still work;
6. Playwright + Chrome DevTools acceptance is clean at 4K, 1440p and 1080p;
7. project-wide regression and documentation gates pass;
8. the living visual inventory and handoff documents are updated with the final evidence.

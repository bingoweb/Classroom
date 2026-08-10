# Classroom Magic Park 2.2 / AnaTema2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Magic Park the correct one-time migrated default, switch its artwork to `AnaTema2.png`, and rebuild all eight card interiors as artwork-aligned premium classroom components without breaking Garden, Science, dynamic kiosk behavior, or accessibility.

**Architecture:** Keep the existing theme registry/manifest contract and the stable dynamic element IDs used by `script.js`, `noise-meter.js`, and `kiosk-motion.js`. Add a versioned one-time localStorage migration in `kiosk-theme.js`, then refactor Magic Park's presentation DOM into explicit scene wrappers while preserving behavioral hooks. Split Magic Park styling into layout/components/state files imported by the theme package so the new `AnaTema2.png` geometry and visual language stay isolated from Garden and Science.

**Tech Stack:** Static HTML, CSS container units, vanilla JavaScript, Three.js `0.185.1`, pinned GSAP `3.15.0`, Node `node:test`, existing kiosk runtime, Playwright MCP, Chrome DevTools MCP.

## Global Constraints

- DevSpace is the source of truth for files, Git, tests, and project commands.
- Preserve the existing dirty checkout; no reset/clean/revert of unrelated work.
- `AnaTema2.png` is the sole active Magic Park shell artwork.
- Magic Park remains registry default and fallback.
- Existing stored Garden/Science preferences migrate to Magic Park exactly once; later explicit user theme selections persist.
- Garden and Science must remain functional and must continue showing their DOM headings.
- Magic Park artwork headings are visible; semantic DOM headings remain accessible but are visually suppressed only in Magic Park.
- Backend/API contracts do not change.
- Visual quality is prioritized; do not simplify the design merely for performance convenience.
- Browser acceptance requires Playwright and Chrome DevTools at 3840×2160, 2560×1440, and 1920×1080.
- 3D motion is automatic and mouse-independent; pointer/cursor position must never be required for the intended kiosk experience.
- The shared Three.js renderer is Magic-Park-only and must suspend/teardown cleanly when Garden or Science is selected.

---

### Task 1: Versioned one-time theme preference migration

**Files:**
- Modify: `public/js/kiosk-theme.js`
- Modify: `tests/kiosk-theme-system.test.js`

**Interfaces:**
- Consumes: `localStorage['classroom_kiosk_theme']`, registry `defaultThemeId` / `fallbackThemeId`.
- Produces: exported `MIGRATION_KEY`, `MIGRATION_VERSION`; startup migration that runs once and never overwrites later explicit choices.

- [ ] **Step 1: Add failing migration contract tests**

Extend the theme-system harness so storage can be pre-seeded and inspected. Cover:

```js
assert.equal(await bootWithStorage({ classroom_kiosk_theme: 'school-garden' }).activeTheme, 'magic-park');
assert.equal(await bootWithStorage({ classroom_kiosk_theme: 'school-science' }).activeTheme, 'magic-park');
assert.equal(await bootWithStorage({ classroom_kiosk_theme: 'magic-park' }).activeTheme, 'magic-park');

const migrated = await bootWithStorage({
    classroom_kiosk_theme: 'school-garden',
    classroom_kiosk_theme_migration: CURRENT_MIGRATION
});
assert.equal(migrated.activeTheme, 'school-garden');
```

Also cover missing storage, corrupt storage, denied storage, and an explicit post-migration Garden/Science selection surviving a simulated reload.

- [ ] **Step 2: Run RED**

Run:

```bash
npm run test:kiosk-theme-system
```

Expected: new migration tests fail because no migration key/version exists and a valid stored Garden/Science preference still wins.

- [ ] **Step 3: Implement minimal migration**

In `kiosk-theme.js`, add constants and storage helpers:

```js
const MIGRATION_KEY = 'classroom_kiosk_theme_migration';
const MIGRATION_VERSION = 'magic-park-2.2-default-v1';

function readStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
}

function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* optional persistence */ }
}
```

Before choosing `targetId` in `initTheme()`, run a migration function that converts only legacy valid `school-garden` / `school-science` values to `magic-park` when the current migration marker is absent, then records the marker. Do not permanently force Magic Park after the marker is present.

- [ ] **Step 4: Run GREEN**

Run:

```bash
npm run test:kiosk-theme-system
```

Expected: all theme-system tests pass.

- [ ] **Step 5: Commit only migration files if a clean isolated commit is safe**

Stage exact paths only; if either file already contains unrelated uncommitted work that cannot be safely isolated, leave the task uncommitted and continue without disturbing it.

---

### Task 2: Switch Magic Park package to AnaTema2 and lock the artwork contract

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/kiosk-magic-park.css`
- Modify: `public/themes/magic-park/theme.json`
- Modify: `public/themes/magic-park/theme.css`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- Consumes: `public/assets/AnaTema2.png` (`2730×1536`, SHA-256 `aa255eb5cb5b3f75f61ba55b4b13686ffc6454f19823d2794b512eeac6c46899`).
- Produces: preload, manifest and active background all pointing to `AnaTema2.png`; no active Magic Park runtime reference to `AnaTema.png` or the older WebP shell.

- [ ] **Step 1: Write failing artwork tests**

Update the Magic Park package test to assert:

```js
assert.match(html, /assets\/AnaTema2\.png/);
assert.equal(manifest.backgroundAsset, 'assets/AnaTema2.png');
assert.equal(manifest.previewAsset, 'assets/AnaTema2.png');
assert.match(css, /AnaTema2\.png/);
assert.doesNotMatch(activeMagicSource, /AnaTema\.png|kiosk-magic-park-shell\.webp/);
```

Retain PNG signature, dimensions >=2700×1500 and near-16:9 checks against `AnaTema2.png`.

- [ ] **Step 2: Run RED**

```bash
npm run test:kiosk-magic-park
```

Expected: current preload/manifest/background still reference `AnaTema.png`.

- [ ] **Step 3: Apply artwork change**

Change the preload, manifest version/description, preview/background assets, and Magic Park background URL to `AnaTema2.png`. Keep the stage at 16:9.

- [ ] **Step 4: Run GREEN**

```bash
npm run test:kiosk-magic-park
```

Expected: package artwork contract passes.

---

### Task 3: Establish Magic Park 2.2 scene DOM while preserving behavioral hooks

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/script.js` only where presentation-nesting assumptions must be replaced by semantic hooks.
- Modify: `public/js/noise-meter.js` only if selectors need stable `data-*` hooks.
- Modify: `public/js/kiosk-motion.js` only where wrapper names change.
- Modify: `tests/student-name-dom-safety.test.js`
- Modify: `tests/noise-meter-state.test.js`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- Preserve IDs: `day-name`, `date`, `clock`, `weekend-widget`, `weekend-counter`, `present-students`, `total-students`, `girl-students`, `boy-students`, `attendance-stat`, `today-attendance`, `absent-container`, `absent-list`, `countdown-card`, `before-school-mode`, `countdown-mode`, `goodbye-mode`, `countdown`, `countdown-bar`, `noise-meter-card`, `noise-character-img`, `noise-status-text`, `noise-level-meter`, `noise-meter-fill`, `equalizer-container`, `mic-start-btn`, `slideshow-container`, `president-container`, `duty-container`, `stars-container`.
- Produce stable scene classes: `magic-scene`, `magic-scene__surface`, and card-specific `*-scene` wrappers.

- [ ] **Step 1: Add failing semantic-hook tests**

Require each card to expose an explicit scene root while preserving the IDs above. Example expectations:

```js
assert.match(html, /class="[^"]*clock-scene[^"]*"/);
assert.match(html, /class="[^"]*attendance-scene[^"]*"/);
assert.match(html, /class="[^"]*lesson-flow-scene[^"]*"/);
assert.match(html, /class="[^"]*noise-scene[^"]*"/);
assert.match(html, /class="[^"]*slideshow-scene[^"]*"/);
assert.match(html, /class="[^"]*president-scene[^"]*"/);
assert.match(html, /class="[^"]*duty-scene[^"]*"/);
assert.match(html, /class="[^"]*stars-scene[^"]*"/);
```

Add regression assertions that the existing dynamic IDs remain present exactly once.

- [ ] **Step 2: Run RED**

```bash
npm run test:kiosk-magic-park && npm run test:student-name-dom-safety && npm run test:noise-meter-state
```

Expected: scene wrapper contract fails before markup refactor.

- [ ] **Step 3: Refactor card interiors**

Restructure the HTML into explicit scene wrappers without removing semantic headings or behavioral IDs. Prefer markup such as:

```html
<div class="clock-content-wrapper magic-scene clock-scene">
    <div class="magic-scene__surface clock-scene__surface">
        ...existing dynamic IDs...
    </div>
</div>
```

For injected president/duty/star/slideshow content, keep their existing container IDs as the dynamic mount surfaces and wrap them in the scene shell rather than adding presentation assumptions to JS.

- [ ] **Step 4: Update JS only for broken presentation selectors**

If a runtime query depends on old nesting, replace it with an ID or `data-role` selector. Do not change API data shapes or business logic.

- [ ] **Step 5: Run GREEN**

Run the three targeted suites above and confirm existing role/noise DOM safety remains green.

---

### Task 4: Split Magic Park 2.2 styling into artwork geometry, components and states

**Files:**
- Create: `public/themes/magic-park/magic-layout.css`
- Create: `public/themes/magic-park/magic-components.css`
- Create: `public/themes/magic-park/magic-states.css`
- Modify: `public/themes/magic-park/theme.css`
- Modify: `public/css/kiosk-magic-park.css`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- `theme.css` imports the base compatibility stylesheet plus the three Magic Park 2.2 focused files.
- `magic-layout.css` owns normalized artwork regions/safe areas only.
- `magic-components.css` owns typography/materials/card-internal composition.
- `magic-states.css` owns runtime state modifiers (attendance, lesson-flow, noise, slideshow/roles fallbacks).

- [ ] **Step 1: Add failing package-boundary tests**

Require `theme.css` imports for the three files and ensure selectors are scoped by `.theme-magic-park`. Reject unscoped rules that could leak to Garden/Science.

- [ ] **Step 2: Run RED**

```bash
npm run test:kiosk-magic-park
```

- [ ] **Step 3: Create normalized artwork geometry**

Use the measured AnaTema2 panel bounds as the outer-region basis:

```css
body.theme-magic-park {
    --magic-stage-w: 2730;
    --magic-stage-h: 1536;
}
```

Map the eight cards to normalized positions derived from:

- Clock: x 190–580, y 110–475
- Attendance: x 135–655, y 650–1005
- Lesson flow: x 120–685, y 1100–1455
- Noise: x 910–1910, y 100–520
- Slideshow: x 860–1915, y 695–1285
- President: x 2180–2570, y 150–505
- Duty: x 2150–2605, y 675–1040
- Stars: x 2130–2635, y 1130–1475

Do not hard-code these image pixels directly as viewport pixels; convert them to percentages/container geometry and then tune inner safe-zone insets visually.

- [ ] **Step 4: Replace old generic card decoration with artwork-inset surfaces**

The new component layer must use neutral translucent parchment/ivory inset surfaces, localized frame-color accents, restrained shadows, large Fredoka hero values, and Nunito support copy. Avoid full-card saturated glass panels that fight the artwork.

- [ ] **Step 5: Run package tests**

```bash
npm run test:kiosk-magic-park
```

Expected: package/style ownership tests pass.

---

### Task 5: Redesign left-column scenes — clock, attendance, lesson flow

**Files:**
- Modify: `public/themes/magic-park/magic-components.css`
- Modify: `public/themes/magic-park/magic-states.css`
- Modify: `public/js/script.js` if additional state classes/data attributes are needed.
- Modify: `tests/kiosk-magic-park.test.js`
- Modify: `tests/student-name-dom-safety.test.js` only for attendance roster structure regressions.

**Interfaces:**
- Clock: date support cluster + hero time + compact weekend badge.
- Attendance: present/total hero + compact gender chips + attendance status + paged absent roster.
- Lesson flow: shared visual grammar for before-school/in-class/in-break/after-school/weekend.

- [ ] **Step 1: Write visual-structure/state contract tests**

Assert the left scenes expose stable scene classes and that lesson-flow state selectors key from `#countdown-card[data-flow-state]` rather than forcing visible modes with unconditional `display` rules.

- [ ] **Step 2: Run RED**

Run Magic Park plus schedule-related targeted tests.

- [ ] **Step 3: Implement clock composition**

Make `#clock` the dominant element, date secondary, weekend pill compact; keep all content within the measured clock opening.

- [ ] **Step 4: Implement attendance composition**

Use a primary present/total composition, compact gender chips, and a lower status/absent zone. Long absent names must fit without horizontal marquee escaping the safe area.

- [ ] **Step 5: Implement lesson-flow states**

Use one scene shell with state-specific accent treatments. Countdown is hero; current/next context is secondary. Preserve existing hidden inline-state semantics and progressbar accessibility.

- [ ] **Step 6: Run GREEN**

Run Magic Park, schedule/flow tests, and student-name safety.

---

### Task 6: Build the dedicated noise instrument and Class TV broadcast shell

**Files:**
- Create: `public/js/class-tv.js`
- Modify: `public/themes/magic-park/magic-components.css`
- Modify: `public/themes/magic-park/magic-states.css`
- Modify: `public/index.html`
- Modify: `public/js/noise-meter.js`
- Modify: `public/js/script.js`
- Modify: `package.json`
- Create: `tests/class-tv.test.js`
- Modify: `tests/noise-meter-state.test.js`
- Modify: `tests/noise-state-assets.test.js`
- Modify: `tests/slideshow-transition-lock.test.js`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- The top noise panel contains only status, level meter, equalizer and retry UI. `#noise-character-img` is removed from that panel.
- `noise-meter.js` emits `classroom:noise-state` with `{ level, score, micState }`; it does not know how Class TV renders Lavunu.
- `#slideshow-container` remains the existing slideshow/media mount.
- A sibling `#class-tv-layer` inside the same artwork opening owns programme overlays, CRT presentation and mascot interventions without destroying slideshow state.
- `window.ClassTV` owns one broadcast snapshot plus one programme timer and one bounded mascot intervention timer.

- [ ] **Step 1: Write failing structure and event-contract tests**

Require all of the following before product code changes:

```js
assert.doesNotMatch(html, /id="noise-character-img"/);
assert.match(html, /id="class-tv-layer"/);
assert.match(html, /js\/class-tv\.js/);
assert.match(noiseSource, /classroom:noise-state/);
```

In `tests/class-tv.test.js`, load the real module in a small DOM/timer harness and assert that a normal programme can be restored after a high-noise takeover and that repeated high samples cannot create overlapping takeover timers.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test tests/class-tv.test.js
node --test tests/noise-meter-state.test.js tests/noise-state-assets.test.js
npm run test:kiosk-magic-park
npm run test:slideshow-transition-lock
```

Expected: missing Class TV module/layer/event contract and resident mascot assumptions fail.

- [ ] **Step 3: Remove the resident mascot from the top noise panel**

Remove the mascot image/ripple wrapper from `index.html`, stop `noise-meter.js` from mutating mascot image sources, and let the meter/equalizer/status cluster occupy the complete opening. Keep low/medium/high, idle/requesting/unavailable, meter ARIA and retry behavior intact.

- [ ] **Step 4: Add semantic noise events**

Add a tiny dispatch helper in `noise-meter.js`:

```js
dispatchNoiseState(level, score, micState) {
    window.dispatchEvent(new CustomEvent('classroom:noise-state', {
        detail: { level, score, micState }
    }));
}
```

Dispatch only when semantic state changes or the normalized score changes enough to matter; do not emit on every animation frame merely for presentation.

- [ ] **Step 5: Add the Class TV shell without replacing the current slideshow**

Inside the centre card, keep `#slideshow-container` untouched as the base programme and add:

```html
<div id="class-tv-layer" class="class-tv" aria-live="polite" aria-atomic="true">
    <div class="class-tv__programme" id="class-tv-programme"></div>
    <div class="class-tv__mascot-pip" id="class-tv-mascot-pip" hidden></div>
    <div class="class-tv__takeover" id="class-tv-takeover" hidden></div>
</div>
```

Style the opening as a colourful CRT-like television using subtle scanlines, vignette/glass edge, bloom and transition wipes while preserving face/text sharpness and respecting `prefers-reduced-motion`.

- [ ] **Step 6: Implement a bounded Class TV director**

Create `public/js/class-tv.js` with one public controller:

```js
window.ClassTV = {
    updateStats(stats),
    updateRoles(roles),
    handleNoise(detail),
    showNextProgramme(),
    destroy()
};
```

The director owns the current programme family, last programme family, latest valid data snapshot, PIP cooldown, high-noise takeover cooldown and timer IDs. A high takeover saves the interrupted programme DOM/state, renders for about 3–4 seconds, then restores it. Repeated high events during takeover are coalesced; they do not spawn/restart overlapping animations forever.

- [ ] **Step 7: Run GREEN**

Run the four targeted commands from Step 2 and keep existing slideshow transition behavior green.

---

### Task 7: Feed Class TV programmes and rebalance the narrow side panels

**Files:**
- Modify: `public/js/class-tv.js`
- Modify: `public/themes/magic-park/magic-components.css`
- Modify: `public/themes/magic-park/magic-states.css`
- Modify: `public/index.html`
- Modify: `public/js/script.js`
- Modify: `tests/class-tv.test.js`
- Modify: `tests/student-name-dom-safety.test.js`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- `#president-container` renders the president only.
- Vice-presidents, detailed attendance, absent students and a larger duty-student story remain available to Class TV through `updateRoles()` / `updateStats()`.
- The small attendance panel becomes a rotating mini-screen using existing stable IDs and a bounded local slide timer/class toggle.
- `#duty-container` and `#stars-container` stay dynamic mount points with safe text rendering and existing fallbacks.

- [ ] **Step 1: Write failing programme/role tests**

Require:

```js
assert.doesNotMatch(scriptSource, /vice-presidents-container/);
assert.match(classTvSource, /vice-presidents/);
assert.match(classTvSource, /attendance/);
assert.match(classTvSource, /absent/);
assert.match(classTvSource, /ataturk/);
assert.match(classTvSource, /duty/);
```

Add behavior tests that programme selection skips unavailable families and does not immediately repeat the same family.

- [ ] **Step 2: Run RED**

Run Class TV, student-name safety and Magic Park package tests.

- [ ] **Step 3: Render president only in the president panel**

Remove vice-president markup from `#president-container`. Preserve president fallback/face-focus behavior. Pass the complete roles array to Class TV before the `hasDataChanged('roles')` early return so the broadcast snapshot stays current even when side-panel DOM does not need rebuilding.

- [ ] **Step 4: Feed Class TV the latest stats and roles**

After validation, call `window.ClassTV?.updateStats(stats)` and `window.ClassTV?.updateRoles(roles)`. Keep last valid Class TV data when a transient API refresh fails.

- [ ] **Step 5: Implement programme families**

Class TV must rotate through eligible families with vivid child-friendly compositions:

- `attendance`: present/total hero;
- `gender`: girl/boy split;
- `absent`: absent-student portraits/names when attendance data provides them;
- `vice-presidents`: two vice-president portraits/names;
- `duty`: larger portrait-rich duty-student story;
- `stars`: student-photo celebration when available;
- `ataturk`: cycle the repository-owned `ataturk-1.webp` … `ataturk-7.webp` with short curated quote copy;
- `base-media`: hide the Class TV programme overlay briefly so the existing slideshow/announcement/poster programme is visible.

Use a 6–9 second programme dwell with immediate-family repetition prevention. Do not request new backend APIs.

- [ ] **Step 6: Convert the narrow attendance card into a mini rotating screen**

Reuse its existing values but group the content into three mini pages (present/total, girl/boy, attendance/absence). Only one mini page is visually active at a time; pause/disable unnecessary animation under reduced motion. Do not remove the stable attendance IDs.

- [ ] **Step 7: Implement Lavunu intervention cadence**

Use repository assets:

- quiet → `assets/noise-states/quiet.webp` as an occasional small PIP guest;
- medium → `assets/noise-states/attention.webp` with shorter PIP cooldown;
- high → `assets/noise-states/loud.webp` as the short full-screen takeover.

Quiet/medium PIP must leave most of the current programme readable. High takeover may cover the centre screen for a few seconds with GSAP shake/pulse and a clear quiet-down message, then restore the interrupted programme.

- [ ] **Step 8: Run GREEN**

Run role and Magic Park targeted tests.

---

### Task 7A: Build the shared Three.js Magic Park scene system

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `backend/server.js`
- Create: `public/js/magic-3d-scene.js`
- Modify: `public/index.html`
- Modify: `public/js/kiosk-theme.js`
- Modify: `public/themes/magic-park/magic-layout.css`
- Modify: `public/themes/magic-park/magic-components.css`
- Create: `tests/magic-3d-scene.test.js`
- Modify: `tests/kiosk-theme-system.test.js`
- Modify: `tests/kiosk-magic-park.test.js`

**Interfaces:**
- Exact dependency: `three@0.185.1`.
- Backend exposes only the required Three.js build directory under a narrow local `/vendor/three/` static route; do not expose the whole `node_modules` tree.
- `#magic-3d-stage` is a transparent, pointer-inert WebGL layer beneath live DOM content and above the base ambience.
- `window.Magic3DScene` exposes `start()`, `stop()`, `resize()`, `setNoiseState(detail)` and `destroy()`.
- `kiosk-theme.js` emits a stable semantic `classroom:theme-change` event with the active theme id after a theme has actually been applied.

- [ ] **Step 1: Write RED package/lifecycle tests**

Require exact Three.js dependency, the narrow local vendor route, one unique `magic-3d-stage` mount, local module loading, no pointer-driven motion selectors/listeners, and one theme-change event boundary. Add a small VM harness proving repeated `start()` calls do not create duplicate RAF loops and `stop()` cancels the active loop.

- [ ] **Step 2: Run RED**

```bash
node --test tests/magic-3d-scene.test.js
npm run test:kiosk-theme-system
npm run test:kiosk-magic-park
```

Expected: Three.js package/mount/runtime/event contracts are absent.

- [ ] **Step 3: Install exact Three.js dependency**

Use DevSpace:

```bash
npm install --save-exact three@0.185.1
```

Keep the dependency local to the project; do not use a runtime CDN.

- [ ] **Step 4: Expose only the local Three.js build**

Add a narrowly scoped Express static route before the public static middleware:

```js
app.use('/vendor/three', express.static(path.join(__dirname, '../node_modules/three/build')));
```

Do not expose all of `node_modules`.

- [ ] **Step 5: Add the shared transparent WebGL stage**

Place a single `<canvas id="magic-3d-stage" ...>` inside `.bento-grid`, below the live cards and below the AnaTema2 foreground frame. `magic-layout.css` owns its absolute geometry/z-index and `pointer-events: none` contract.

- [ ] **Step 6: Implement one shared Three.js renderer**

Create `magic-3d-scene.js` as an ES module importing `/vendor/three/three.module.min.js`. Use one transparent `WebGLRenderer`, one perspective camera and one scene. Build eight artwork-aligned panel groups/meshes corresponding to Clock, Attendance, Lesson Flow, Noise, Class TV, President, Duty and Stars. The meshes provide dimensional recess/surface lighting and animated accents behind the semantic DOM, not duplicate text.

Use bounded automatic choreography only:

- slow sinusoidal camera drift;
- very small per-panel z/rotation breathing;
- moving key/rim lights;
- lightweight particles for Class TV/Stars/Noise only;
- no `pointermove`, `mousemove`, drag or hover ownership.

- [ ] **Step 7: Add Magic-Park-only lifecycle control**

Emit `classroom:theme-change` from `kiosk-theme.js` after a manifest/safe theme is applied. `magic-3d-scene.js` starts only for `magic-park`, stops RAF/GPU updates for Garden/Science and resumes idempotently when Magic Park returns. Pagehide/beforeunload destroys the renderer cleanly.

- [ ] **Step 8: Give Class TV a stronger television treatment**

Use its Three.js panel group for deeper screen recess, soft glass/specular movement and subtle broadcast particles. Keep CRT scanline/chromatic/vignette effects restrained and keep text/faces in DOM. Do not convert programme DOM to canvas textures.

- [ ] **Step 9: Apply the shared 3D language to the seven supporting panels**

Tune mesh depth/light/ambient motion by hierarchy:

- Noise: strongest supporting panel, reactive light/equalizer ambience.
- Attendance/President/Duty/Stars: clear dimensional surfaces and portrait depth.
- Clock/Lesson flow: minimal depth and slow motion for maximum readability.

All meshes stay behind the AnaTema2 foreground frame.

- [ ] **Step 10: Run GREEN and leak guards**

```bash
node --test tests/magic-3d-scene.test.js
npm run test:kiosk-theme-system
npm run test:kiosk-magic-park
```

Verify no duplicate RAF loop on repeated Magic Park activation and no active loop after switching to Garden/Science.

---

### Task 8: Cross-theme regression and browser acceptance

**Files:**
- Modify: `tests/kiosk-theme-system.test.js` if shared-DOM compatibility assertions are needed.
- Modify product files only for issues found by acceptance.

**Interfaces:**
- Garden/Science remain selectable after migration and retain visible DOM headings.
- Magic Park hides duplicate DOM headings visually but keeps semantic text.

- [ ] **Step 1: Run targeted automated regression**

```bash
npm run test:kiosk-magic-park
npm run test:kiosk-theme-system
npm run test:noise-meter-state
npm run test:student-name-dom-safety
npm run test:slideshow-transition-lock
```

- [ ] **Step 2: Playwright acceptance at three resolutions**

For 3840×2160, 2560×1440, 1920×1080:

- clear/seed storage to verify migration once;
- verify subsequent explicit Garden/Science selection persists;
- switch back to Magic Park;
- inspect all eight panel safe areas, document overflow, duplicate headings, console errors, failed requests;
- exercise representative schedule/noise/slideshow/roles states using existing dev/runtime controls.

- [ ] **Step 3: Chrome DevTools independent acceptance**

Repeat 4K acceptance in an isolated browser context. Verify `AnaTema2.png` network request, no active `AnaTema.png` request, correct theme class/stylesheet, 8 hidden Magic Park DOM headings with text intact, clean console/network, and exact viewport/document sizing.

- [ ] **Step 4: Verify Garden and Science after shared DOM refactor**

At minimum inspect each alternate theme at 4K: title opacity/visibility, layout continuity, dynamic role mounts, schedule/noise/slideshow content, and no console/network regression.

- [ ] **Step 5: Fix acceptance defects with fresh RED tests where practical**

For each real regression found, add the smallest reproducible test before the fix, then repeat the affected browser acceptance.

---

### Task 9: Full regression, living documentation and completion evidence

**Files:**
- Modify: `Classroom Projesi/01 - Güncel Belgeler/Classroom Projesi — Öğrenci Ana Sayfası 4K Görsel ve Teknik İnceleme Envanteri — 10 Ağustos 2026.md`
- Modify: `Classroom Projesi/02 - Devir ve Oturum Notları/Classroom Projesi — Yeni Sohbet Devir Belgesi — 10 Ağustos 2026 — Magic Park 2.0 Kozmetik Geliştirme Öncesi.md`
- Modify: `public/themes/README.md` if package guidance changed.
- Modify: approved spec only if final implementation details materially differ from an implementation-detail choice, never to rewrite user decisions.

**Interfaces:**
- Produces durable source-of-truth evidence for the next session.

- [ ] **Step 1: Run full automated gates**

```bash
npm run test:documentation-current-state
npm run test:core
git diff --check
```

Expected: zero failures and clean whitespace check.

- [ ] **Step 2: Record exact final evidence**

Document:

- final artwork dimensions/hash;
- migration key/version and verified one-time behavior;
- final file/component architecture;
- targeted/full test counts;
- Playwright results at all three resolutions;
- Chrome DevTools 4K console/network/layout evidence;
- Garden/Science compatibility outcome;
- remaining intentional dirty-tree state and exact HEAD/origin/main.

- [ ] **Step 3: Final Git safety review**

Use `git status`, `git diff --check`, and exact-path diffs. Do not stage or commit unrelated pre-existing dirty work.

- [ ] **Step 4: Completion report**

Report only verified results; do not call the work complete until both browser tools and full automated regression are green.

# Magic Park Attendance Box Implementation Plan

> **Completion record (12 August 2026):** Implemented and accepted. The final design moved from the early dark/toy-heavy storyboard to a bright sky/mint/cream surface with no duplicate interior toys. Gender scenes use left-anchored, unflipped children and reveal `character → label → number` while travelling left-to-right. Live data was verified as 30 total, 21 girls, and 9 boys. Automated tests were skipped for the final push at the user's explicit request; the user supplied the acceptance decision.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Rebuild the Magic Park Sınıf Mevcudu opening as an exact implementation of the approved three-state 3D toy concept, showing only total, girl, and boy counts in a continuous readable sequence.

**Architecture:** Keep /api/stats and the stable count IDs as the data source, but move every Magic Park attendance presentation rule into a self-owned box package. DOM/CSS owns readable labels and values, GSAP owns the three-scene timeline, and a theme-scoped Three.js layer owns decorative toy depth; Class TV remains the visual owner of attendance and absence details.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js 22, node:test, GSAP 3.15.0, Three.js 0.185.1, Image Gen, ImageMagick/OpenImageIO, Browser/IAB with Playwright fallback only after a Browser invocation failure.

## Global Constraints

- Production fidelity target is docs/superpowers/specs/concepts/2026-08-11-attendance-box-three-state-concept.png; it is binding, not inspirational.
- Storyboard arrows are not live UI; every other visible composition decision must match the approved concept.
- Visible copy is exactly SINIF MEVCUDU, KIZ ÖĞRENCİ, ERKEK ÖĞRENCİ and their API values.
- Daily attendance and absence information must not paint inside this opening.
- Each scene lasts 6000 ms in an 18000 ms loop: entry 700 ms, readable hold through 5200 ms, cross-scene overlap 450 ms.
- The box owns attendance.css, attendance.json, attendance.js, README.md, and box-local production assets.
- Class TV keeps attendance and absence; its redundant gender programme leaves the rotation.
- Garden and Science retain their current attendance behavior.
- Do not simplify colour, depth, decoration, or motion for performance.
- Validate at 3840×2160, then 2560×1440, then 1920×1080.
- Do not modify Clock or any unrelated box.
- Keep every design, concept, development-note, evidence, and roadmap artifact under the local project root /Users/bingoweb/Projeler/Classroom-ilk-surum; do not upload project artifacts to Google Drive or any other remote document/server target.
- Do not commit or push until the user explicitly authorizes it. Commit commands below are prepared checkpoints only.

---

## File Structure

Create:

- public/themes/magic-park/boxes/attendance/attendance.css — sole Magic Park attendance visual owner.
- public/themes/magic-park/boxes/attendance/attendance.json — scene, timing, palette, capability, and asset contract.
- public/themes/magic-park/boxes/attendance/attendance.js — manifest validation, lifecycle, GSAP, Three.js, and value-settle behavior.
- public/themes/magic-park/boxes/attendance/README.md — binding decisions and acceptance criteria.
- public/themes/magic-park/boxes/attendance/assets/attendance-girl.png — concept-matched waving girl.
- public/themes/magic-park/boxes/attendance/assets/attendance-boy.png — concept-matched waving boy.
- tests/magic-attendance.test.js — package, model, lifecycle, Class TV separation, and binary contracts.

Modify:

- public/index.html:58-119,286-300 — three scene wrappers and runtime load.
- public/themes/magic-park/theme.css:1-7 — import attendance.css.
- public/themes/magic-park/magic-components.css:31-281 — remove old attendance visual ownership.
- public/themes/magic-park/magic-states.css:33-35 — remove retired pending-state presentation.
- public/js/script.js:1630-1715 — preserve data writes and publish one stats event.
- public/js/class-tv.js:145-157,210-237 — remove the duplicate gender programme only.
- backend/server.js:67-123 — expose pinned Three.js module files only.
- package.json and package-lock.json — exact Three.js dependency and focused test script.
- tests/kiosk-magic-park.test.js:189-225,740-880 — replace old mini-channel expectations.
- tests/student-name-dom-safety.test.js:160-215 — retain correct data semantics.
- tests/class-tv.test.js — lock centre-screen ownership.

---

### Task 1: Lock the independent package and manifest contract

**Files:**

- Create: tests/magic-attendance.test.js
- Create: public/themes/magic-park/boxes/attendance/attendance.json
- Create: public/themes/magic-park/boxes/attendance/attendance.css
- Create: public/themes/magic-park/boxes/attendance/attendance.js
- Create: public/themes/magic-park/boxes/attendance/README.md
- Modify: public/themes/magic-park/theme.css:1-7
- Modify: package.json

**Interfaces:**

- Consumes: approved design spec and concept.
- Produces: buildAttendanceSceneModel(stats) and the manifest consumed by later tasks. Runtime manifest validation is produced by Task 6, where its malformed-input behavior is tested.

- [ ] **Step 1: Write the failing package and scene-model tests**

Add this real contract to tests/magic-attendance.test.js:

    'use strict';

    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const path = require('node:path');
    const test = require('node:test');

    const root = path.resolve(__dirname, '..');
    const boxRoot = path.join(root, 'public/themes/magic-park/boxes/attendance');

    test('attendance box owns a valid manifest and entrypoints', () => {
        for (const name of ['attendance.css', 'attendance.json', 'attendance.js', 'README.md']) {
            assert.ok(fs.statSync(path.join(boxRoot, name)).size > 0);
        }
        const manifest = JSON.parse(fs.readFileSync(path.join(boxRoot, 'attendance.json'), 'utf8'));
        assert.deepEqual(manifest.visibleFields, ['total', 'girls', 'boys']);
        assert.deepEqual(manifest.sceneOrder, ['total', 'girls', 'boys']);
        assert.deepEqual(manifest.timingMs, {
            scene: 6000, enter: 700, holdUntil: 5200, overlap: 450, numberSettle: 650
        });
    });

    test('scene model exposes only approved labels and values', () => {
        const { buildAttendanceSceneModel } =
            require('../public/themes/magic-park/boxes/attendance/attendance.js');
        assert.deepEqual(buildAttendanceSceneModel({ total: 24, girls: 12, boys: 12 }), [
            { id: 'total', label: 'SINIF MEVCUDU', value: 24 },
            { id: 'girls', label: 'KIZ ÖĞRENCİ', value: 12 },
            { id: 'boys', label: 'ERKEK ÖĞRENCİ', value: 12 }
        ]);
    });

- [ ] **Step 2: Run the test and verify RED**

Run: node --test tests/magic-attendance.test.js

Expected: FAIL because the box package and exported scene builder do not exist.

- [ ] **Step 3: Create the exact manifest**

attendance.json must contain:

    {
      "schemaVersion": 1,
      "id": "magic-park-attendance",
      "version": "1.0.0",
      "theme": "magic-park",
      "css": "attendance.css",
      "script": "attendance.js",
      "visibleFields": ["total", "girls", "boys"],
      "sceneOrder": ["total", "girls", "boys"],
      "timingMs": {
        "scene": 6000,
        "enter": 700,
        "holdUntil": 5200,
        "overlap": 450,
        "numberSettle": 650
      },
      "capabilities": {
        "three": true,
        "gsap": true,
        "cssFallback": true,
        "reducedMotion": true
      },
      "assets": {
        "girl": "assets/attendance-girl.png",
        "boy": "assets/attendance-boy.png"
      }
    }

- [ ] **Step 4: Implement the minimal pure scene model**

attendance.js starts with safe integer normalization and exports:

    function safeCount(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
    }

    function buildAttendanceSceneModel(stats = {}) {
        return [
            { id: 'total', label: 'SINIF MEVCUDU', value: safeCount(stats.total) },
            { id: 'girls', label: 'KIZ ÖĞRENCİ', value: safeCount(stats.girls) },
            { id: 'boys', label: 'ERKEK ÖĞRENCİ', value: safeCount(stats.boys) }
        ];
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { buildAttendanceSceneModel };
    }

Add the attendance CSS import to theme.css. Add npm script test:magic-attendance with command node --test tests/magic-attendance.test.js. Write README.md with the copy whitelist, 18-second timing, concept path, Class TV ownership, and storyboard-arrow exclusion.

- [ ] **Step 5: Run and verify GREEN**

Run: npm run test:magic-attendance

Expected: all Task 1 subtests PASS.

- [ ] **Step 6: Review; commit only if authorized**

Inspect: git diff -- public/themes/magic-park/boxes/attendance public/themes/magic-park/theme.css package.json tests/magic-attendance.test.js

Prepared commit command: git add public/themes/magic-park/boxes/attendance/README.md public/themes/magic-park/boxes/attendance/attendance.css public/themes/magic-park/boxes/attendance/attendance.json public/themes/magic-park/boxes/attendance/attendance.js public/themes/magic-park/theme.css package.json tests/magic-attendance.test.js && git commit -m "feat(attendance): establish independent box package"

### Task 2: Produce concept-matched character assets

**Files:**

- Modify: tests/magic-attendance.test.js
- Create: public/themes/magic-park/boxes/attendance/assets/attendance-girl.png
- Create: public/themes/magic-park/boxes/attendance/assets/attendance-boy.png

**Interfaces:**

- Consumes: approved concept and manifest asset paths.
- Produces: alpha PNGs at least 1024×1024 with the approved waving upper-body poses.

- [ ] **Step 1: Add failing PNG contract tests**

Add a literal PNG IHDR reader:

    function readPngContract(filePath) {
        const bytes = fs.readFileSync(filePath);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        return {
            width: bytes.readUInt32BE(16),
            height: bytes.readUInt32BE(20),
            colorType: bytes[25],
            size: bytes.length
        };
    }

    test('attendance characters are high-resolution alpha PNGs', () => {
        for (const name of ['attendance-girl.png', 'attendance-boy.png']) {
            const asset = readPngContract(path.join(boxRoot, 'assets', name));
            assert.ok(asset.width >= 1024 && asset.height >= 1024);
            assert.equal(asset.colorType, 6);
            assert.ok(asset.size > 100000);
        }
    });

- [ ] **Step 2: Run and verify RED**

Run: npm run test:magic-attendance

Expected: FAIL with ENOENT for the first missing asset.

- [ ] **Step 3: Generate the girl asset**

Use built-in Image Gen with the approved concept as the reference and this exact brief:

    Create a high-resolution standalone character matching the GIRL in the centre
    concept panel: same friendly face, brown side ponytail with pink bow,
    pink/coral school outfit, turquoise backpack strap, waving hand, glossy premium
    3D toy/storybook material, same camera angle and proportions. Upper body and
    waving hand fully visible. Perfectly flat #00ff00 chroma-key background; no
    shadow, gradient, floor, reflection, text, flower, block, number, arrow, or
    extra object. Do not use #00ff00 in the character.

Run the installed imagegen chroma-removal helper with auto-key border, soft matte, and despill. Retry once with edge-contract 1 only if a fringe remains. Save the RGBA result to the manifest path.

- [ ] **Step 4: Generate the boy asset**

Use this exact brief:

    Create a high-resolution standalone character matching the BOY in the right
    concept panel: same friendly face, swept brown hair, blue/turquoise school
    jacket, green backpack strap, waving hand, glossy premium 3D toy/storybook
    material, same camera angle and proportions. Upper body and waving hand fully
    visible. Perfectly flat #ff00ff chroma-key background; no shadow, gradient,
    floor, reflection, text, flower, block, number, arrow, or extra object.
    Do not use #ff00ff in the character.

Remove the key and save the RGBA result to the manifest path.

- [ ] **Step 5: Validate assets and verify GREEN**

Run: identify -verbose public/themes/magic-park/boxes/attendance/assets/attendance-girl.png
Run: identify -verbose public/themes/magic-park/boxes/attendance/assets/attendance-boy.png
Run: npm run test:magic-attendance

Use view_image on the approved concept and both assets together. Regenerate any asset whose pose, face, outfit colour, matte edge, or optical scale drifts.

- [ ] **Step 6: Commit only if authorized**

Prepared command: git add public/themes/magic-park/boxes/attendance/assets/attendance-girl.png public/themes/magic-park/boxes/attendance/assets/attendance-boy.png tests/magic-attendance.test.js && git commit -m "feat(attendance): add concept-matched student characters"

### Task 3: Restructure markup and publish count updates

**Files:**

- Modify: tests/magic-attendance.test.js
- Modify: public/index.html:58-119,286-300
- Modify: public/js/script.js:1630-1715
- Modify: tests/student-name-dom-safety.test.js:160-215

**Interfaces:**

- Consumes: stable IDs total-students, girl-students, boy-students.
- Produces: three data-attendance-scene roots and classroom:stats-updated events.

- [ ] **Step 1: Add failing behavior tests**

Extend the existing VM stats test with a CustomEvent recorder and assert that updateStats writes 24/12/12, calls ClassTV with the full stats object, and dispatches exactly one classroom:stats-updated event with literal values. Add a structural test that each stable ID occurs once and the three scene IDs are total, girls, boys.

- [ ] **Step 2: Run and verify RED**

Run: node --test tests/magic-attendance.test.js tests/student-name-dom-safety.test.js

Expected: FAIL because the new scene roots and event do not exist.

- [ ] **Step 3: Add the three scene roots**

Use this exact visible anatomy inside attendance-scene:

    <section class="attendance-stage attendance-stage--total"
             data-attendance-scene="total" aria-label="Sınıf mevcudu">
        <span class="attendance-stage__label">SINIF MEVCUDU</span>
        <strong class="attendance-stage__value" id="total-students">--</strong>
        <div class="attendance-stage__abacus" aria-hidden="true"></div>
    </section>

    <section class="attendance-stage attendance-stage--girls"
             data-attendance-scene="girls" aria-label="Kız öğrenci sayısı">
        <img class="attendance-stage__character"
             src="themes/magic-park/boxes/attendance/assets/attendance-girl.png"
             alt="" aria-hidden="true">
        <span class="attendance-stage__label">KIZ ÖĞRENCİ</span>
        <strong class="attendance-stage__value" id="girl-students">--</strong>
    </section>

    <section class="attendance-stage attendance-stage--boys"
             data-attendance-scene="boys" aria-label="Erkek öğrenci sayısı">
        <img class="attendance-stage__character"
             src="themes/magic-park/boxes/attendance/assets/attendance-boy.png"
             alt="" aria-hidden="true">
        <span class="attendance-stage__label">ERKEK ÖĞRENCİ</span>
        <strong class="attendance-stage__value" id="boy-students">--</strong>
    </section>

Keep the legacy present/attendance/absence elements inside attendance-legacy-details for non-Magic themes. Load attendance.js once after GSAP and theme dependencies.

- [ ] **Step 4: Publish the stats event after DOM writes**

Dispatch one CustomEvent with total, girls, boys, todayPresent, todayAbsent, and absentStudents. Keep legacy updates guarded by element existence so other themes still work.

- [ ] **Step 5: Run and verify GREEN**

Run: node --test tests/magic-attendance.test.js tests/student-name-dom-safety.test.js tests/kiosk-theme-system.test.js

Expected: all tests PASS and no duplicate ID assertion fails.

- [ ] **Step 6: Commit only if authorized**

Prepared command: git add public/index.html public/js/script.js tests/magic-attendance.test.js tests/student-name-dom-safety.test.js && git commit -m "refactor(attendance): separate count stages from attendance details"

### Task 4: Remove Class TV gender duplication

**Files:**

- Modify: tests/class-tv.test.js
- Modify: tests/magic-attendance.test.js
- Modify: public/js/class-tv.js:145-157,210-237

**Interfaces:**

- Consumes: complete ClassTV stats snapshots.
- Produces: programme families containing attendance and conditional absent, never gender.

- [ ] **Step 1: Write the failing behavior test**

Using the existing real ClassTVDirector VM loader:

    director.updateStats({
        total: 24,
        girls: 12,
        boys: 12,
        todayPresent: 22,
        todayAbsent: 2,
        absentStudents: [{ id: 1, name: 'Ada' }]
    });
    const families = director.getProgrammeFamilies();
    assert.ok(families.includes('attendance'));
    assert.ok(families.includes('absent'));
    assert.ok(!families.includes('gender'));
    assert.match(director.renderProgramme('attendance'), /22/);
    assert.match(director.renderProgramme('absent'), /Ada/);
    assert.equal(director.renderProgramme('gender'), '');

- [ ] **Step 2: Run and verify RED**

Run: node --test tests/class-tv.test.js tests/magic-attendance.test.js

Expected: FAIL because gender is still scheduled and rendered.

- [ ] **Step 3: Remove only the gender family and renderer**

Set the stats branch to families.push('attendance'), keep conditional absent, and delete only case gender. Preserve attendance, absent, roles, Atatürk, base-media, PIP, and takeover behavior.

- [ ] **Step 4: Run and verify GREEN**

Run: node --test tests/class-tv.test.js tests/magic-attendance.test.js

Expected: all tests PASS.

- [ ] **Step 5: Commit only if authorized**

Prepared command: git add public/js/class-tv.js tests/class-tv.test.js tests/magic-attendance.test.js && git commit -m "refactor(class-tv): keep attendance details in centre screen"

### Task 5: Implement exact concept CSS and remove shared ownership

**Files:**

- Modify: tests/magic-attendance.test.js
- Modify: public/themes/magic-park/boxes/attendance/attendance.css
- Modify: public/themes/magic-park/magic-components.css:31-281
- Modify: public/themes/magic-park/magic-states.css:33-35
- Modify: tests/kiosk-magic-park.test.js:189-225,740-880

**Interfaces:**

- Consumes: three attendance-stage nodes and approved palette/assets.
- Produces: one full-opening scene with exact total/girls/boys variants and a CSS fallback.

- [ ] **Step 1: Add failing ownership and visibility tests**

Lock these contracts: attendance.css owns the three variants; legacy details hide only under Magic Park; all three values share one type-scale declaration; shared component/state CSS no longer owns attendance-mini-page or magic-attendance-channel; the exact concept palette tokens exist.

Run: node --test tests/magic-attendance.test.js tests/kiosk-magic-park.test.js

Expected: FAIL against the existing generic mini-channel CSS.

- [ ] **Step 2: Build the full-opening canvas**

Start with these exact root tokens and geometry:

    body.magic-park-theme.theme-magic-park .attendance-scene {
        --attendance-ink: #03040d;
        --attendance-yellow: #c8b53c;
        --attendance-cream: #ccccb5;
        --attendance-red: #ab4121;
        --attendance-blue: #1d63af;
        --attendance-orange: #dd5c19;
        --attendance-cyan: #47a2c7;
        --attendance-leaf: #1f5f0b;
        --attendance-green: #579d12;
        --attendance-flower: #bf54b6;
        position: absolute !important;
        inset: 0 !important;
        overflow: hidden;
        isolation: isolate;
        background: radial-gradient(circle at 50% 42%, #10152c 0%, var(--attendance-ink) 72%);
        perspective: 1100px;
    }

Add canvas, gold orbit, three absolute stages, bottom green shelf, DOM abacus, flowers, ABC cubes, and concept-safe margins. No secondary card may sit behind a value.

- [ ] **Step 3: Match each concept state**

- Total: centred yellow/orange number at roughly 45% opening height; label above; abacus and blocks below.
- Girls: character in left third; pink number in right half; label above; flowers and blocks along the shelf.
- Boys: equal visual weight; character in left third; blue number in right half; matching shelf density.
- Use one shared value type scale. Vary only scene material colours.
- Apply cream edge, dark outer stroke, inset highlight, and short depth shadow matching the concept.

- [ ] **Step 4: Preserve other themes and reduced motion**

Outside Magic Park, scene wrappers use display: contents or the computed-style equivalent needed to preserve current Garden/Science layout. Under reduced motion, replace deep rotation with opacity sequencing while retaining the same 18-second three-scene order.

- [ ] **Step 5: Delete retired Magic Park attendance rules**

Remove the old attendance block from magic-components.css and its pending state from magic-states.css. Replace old mini-page expectations in kiosk-magic-park.test.js with the independent package contract.

- [ ] **Step 6: Run and verify GREEN**

Run: npm run test:magic-attendance
Run: npm run test:kiosk-magic-park
Run: node --test tests/kiosk-theme-system.test.js
Run: git diff --check

Expected: all tests PASS; diff check has no output.

- [ ] **Step 7: Commit only if authorized**

Prepared command: git add public/themes/magic-park/boxes/attendance/attendance.css public/themes/magic-park/magic-components.css public/themes/magic-park/magic-states.css tests/magic-attendance.test.js tests/kiosk-magic-park.test.js && git commit -m "feat(attendance): recreate approved three-scene toy design"

### Task 6: Add lifecycle-safe Three.js and GSAP motion

**Files:**

- Modify: tests/magic-attendance.test.js
- Modify: public/themes/magic-park/boxes/attendance/attendance.js
- Modify: public/themes/magic-park/boxes/attendance/attendance.css
- Modify: backend/server.js:67-123
- Modify: package.json and package-lock.json

**Interfaces:**

- Consumes: validated manifest, classroom:theme-change, classroom:stats-updated, GSAP, and dynamically imported Three.js.
- Produces: AttendanceExperience with activate(), deactivate(), destroy(), one renderer, one timeline, and CSS fallback.

- [ ] **Step 1: Write failing validation and lifecycle tests**

Inject a fake renderer, RAF, and GSAP timeline into a real AttendanceExperience. Call activate twice, then deactivate. Assert one renderer, one timeline, one cancel, one renderer disposal, and one timeline kill. Add malformed manifest cases for wrong visibleFields, scene order, and non-positive timing.

- [ ] **Step 2: Run and verify RED**

Run: npm run test:magic-attendance

Expected: FAIL because validation and AttendanceExperience do not exist.

- [ ] **Step 3: Pin and expose only required Three.js files**

Run: npm install --save-exact three@0.185.1

In backend/server.js resolve and expose only three.module.min.js and three.core.min.js at /vendor/three/0.185.1/. Use immutable cache headers. Do not mount node_modules and do not add GLTF routes.

- [ ] **Step 4: Implement manifest and theme lifecycle**

The runtime must fetch attendance.json once, validate it, use a built-in safe timing fallback on failure, activate only for Magic Park, import the pinned module only on activation, create one renderer/RAF/listener/timeline, release everything on theme change and pagehide, and set data-renderer="css" if import or WebGL fails.

- [ ] **Step 5: Build the exact decorative Three.js layer**

Use shallow perspective and procedural rounded blocks, two abacus rods with coloured beads, five-point stars, jewel cubes, and gold orbit paths. Do not render text or characters in WebGL. No object may cross the DOM number safe-zone. Overlap outgoing and incoming scenes by 450 ms so the opening never goes blank.

- [ ] **Step 6: Implement data settle and accessibility motion**

On classroom:stats-updated animate only changed values for 650 ms; final textContent equals the integer API value. Reduced motion skips camera rotation and overshoot but keeps the three-state sequence.

- [ ] **Step 7: Run and verify GREEN**

Run: npm run test:magic-attendance
Run: node --test tests/dependency-security-baseline.test.js tests/system-smoke-script.test.js
Run: npm run test:kiosk-magic-park

Expected: all tests PASS and no CDN reference exists.

- [ ] **Step 8: Commit only if authorized**

Prepared command: git add backend/server.js package.json package-lock.json public/themes/magic-park/boxes/attendance/attendance.js public/themes/magic-park/boxes/attendance/attendance.css tests/magic-attendance.test.js && git commit -m "feat(attendance): add lifecycle-safe 3D toy transitions"

### Task 7: Browser fidelity and regression acceptance

**Files:**

- Modify only attendance package files and directly affected tests when findings require it.
- Keep temporary screenshots and fidelity ledger outside the repository.

**Interfaces:**

- Consumes: completed implementation and approved concept.
- Produces: three states at three resolutions, clean console/network evidence, and a zero-gap fidelity ledger.

- [ ] **Step 1: Run the full automated gate**

Run: npm run test:magic-attendance
Run: npm run test:kiosk-magic-park
Run: npm run test:system-smoke
Run: npm run test:core
Run: git diff --check
Run: git status --short --branch

Expected: every command exits 0. Record fresh pass/fail counts.

- [ ] **Step 2: Start the real app and define the flow**

Start npm start on port 3000.

Flow: http://127.0.0.1:3000/ → Magic Park total → girls → boys → total, with live values and no blank frame or runtime error.

- [ ] **Step 3: Use Browser/IAB first**

Read browser:control-in-app-browser, name one session, acquire one tab, navigate to the kiosk, and retain that binding. Record the exact Browser failure before any Playwright fallback.

- [ ] **Step 4: Verify all states at 3840×2160**

Inject deterministic stats total 24, girls 12, boys 12, todayPresent 22, todayAbsent 2 through the real page boundary. Capture each state and inspect exact copy, value scale/material, character pose/scale, toy/flower/shelf density, black-opening blend, no arrows, and no occlusion.

- [ ] **Step 5: Verify 2560×1440 and 1920×1080**

Repeat the cycle. Confirm equal scene weight, no wrapping, no clipped hands/faces/numbers, no overflow, and readable labels.

- [ ] **Step 6: Verify motion, data, and lifecycle**

Wait through one 18-second loop. Change stats to total 31, girls 16, boys 15. Switch Magic Park → Garden → Magic Park and confirm one canvas/timeline. Simulate WebGL failure and confirm CSS sequencing. Confirm centre Class TV shows attendance/absence but never gender. Inspect console warnings/errors and network 4xx/5xx.

- [ ] **Step 7: Perform concept-to-render comparison**

Use view_image on the concept and latest 4K total/girls/boys captures together. The fidelity ledger must cover:

1. copy and hierarchy;
2. number scale and enamel material;
3. character identity, pose, and scale;
4. palette and black-opening blend;
5. block, abacus, flower, shelf, star, and orbit density;
6. safe-zone geometry;
7. transition depth and non-empty overlap;
8. responsive typography and crop.

Any fixable mismatch fails the gate. Patch the attendance package, reload, recapture, and compare again until no material mismatch remains.

- [ ] **Step 8: Confirm scope and final Git state**

Run: git diff --name-status
Run: git diff --check
Run: git status --short --branch

Clock and unrelated boxes must not appear. Do not stage, commit, push, or drop a stash without explicit authorization.

- [ ] **Step 9: Prepare final commit only if authorized**

Use exact-path staging for backend/server.js, package.json, package-lock.json, public/index.html, public/js/script.js, public/js/class-tv.js, the three Magic Park package CSS files, every attendance package file/asset, the four affected test files, the design spec, concept image, and this plan. Run git diff --cached --check and git diff --cached --stat before:

    git commit -m "feat(attendance): deliver approved Magic Park count experience"

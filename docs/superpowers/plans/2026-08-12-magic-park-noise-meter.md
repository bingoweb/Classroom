# Magic Park Sınıfın Ses Dengesi Implementation Plan

> **For agentic workers:** This plan was executed inline in the real `main` checkout. The user later explicitly requested documentation + commit + push, so the final repository integration step is now authorized.

**Goal:** Move Magic Park noise presentation into an independent box package and redesign the opening as one child-friendly, distant-readable listening instrument without changing the real microphone pipeline.

**Architecture:** `public/js/noise-meter.js` remains the sole owner of Web Audio, calibration, smoothing, hysteresis, microphone lifecycle, retry, ARIA meter updates, and `classroom:noise-state`. The Magic Park package contributes only declarative presentation (`noise-meter.css`, `noise-meter.json`, `README.md`) and consumes the existing DOM classes/states.

**Tech Stack:** Existing static HTML/CSS/JavaScript, Node test runner, local Fredoka/Nunito fonts, existing 128-band DOM equalizer, GIMP 3.2/Python-Fu, DevSpace, Playwright, Chrome DevTools.

## Global Constraints

- Work in `/Users/bingoweb/Projeler/Classroom-ilk-surum` using DevSpace as source of truth.
- Preserve the existing `public/js/noise-meter.js` Web Audio pipeline and Class TV event contract.
- Do not add a second microphone, AudioContext, timer, RAF loop, WebGL context, or runtime CDN.
- Do not add Lavunu/mascot artwork to the upper noise box.
- Keep other themes functional; Magic Park-only selectors live in the Magic Park box package.
- Keep `backend/classroom.db` untouched.
- Commit/push is authorized only after the user's final explicit request in this session.

---

### Task 1: Lock package ownership with tests

**Files:**
- Modify: `tests/kiosk-magic-park.test.js`

- [x] Add assertions that `theme.css` imports `boxes/noise-meter/noise-meter.css`.
- [x] Assert `magic-components.css` no longer owns `.noise-scene`, `.noise-status`, `.noise-meter-*`, or `.equalizer-*` visual rules.
- [x] Assert `magic-states.css` no longer owns noise visual states.
- [x] Run the focused test and confirm it fails because the package does not exist yet.

### Task 2: Create the independent box package

**Files:**
- Create: `public/themes/magic-park/boxes/noise-meter/noise-meter.css`
- Create: `public/themes/magic-park/boxes/noise-meter/noise-meter.json`
- Create: `public/themes/magic-park/boxes/noise-meter/README.md`
- Modify: `public/themes/magic-park/theme.css`
- Modify: `public/themes/magic-park/magic-components.css`
- Modify: `public/themes/magic-park/magic-states.css`

- [x] Move Magic Park noise presentation ownership out of common Magic Park CSS.
- [x] Import the box-local CSS from the theme entrypoint.
- [x] Define manifest palette, semantic states, ownership contract, and reduced-motion capability.
- [x] Keep the existing HTML/runtime hooks unchanged.
- [x] Re-run focused package/theme tests until green.

### Task 3: Build the listening instrument visual system

**Files:**
- Modify: `public/themes/magic-park/boxes/noise-meter/noise-meter.css`

- [x] Fit the scene to the real opening with safe foreground bleed.
- [x] Replace the rejected dark acoustic-panel direction with a cheerful child-electronics / mini car-stereo palette and raster hardware.
- [x] Keep all 128 real equalizer bands inside the exact dark LCD opening of the rendered console.
- [x] Make the level rail a thick glass/energy channel with visible warning/danger threshold markers.
- [x] Make `low`, `medium`, and `high` differ by color, glow, motion, and shape emphasis, not color alone.
- [x] Keep `idle`, `requesting`, and `unavailable` visually alive without a manual retry control.
- [x] Add reduced-motion fallbacks and avoid continuous JavaScript animation.
- [x] Reopen the rejected Blender/CSS direction after user review and replace it with a from-scratch GIMP 3.2 layered XCF faceplate.
- [x] Produce the chassis, side cheeks, smoked LCD, brushed-metal bezel, encoder controls, LED arcs, physical preset shelf, fasteners, gloss and all four button assets through the GIMP pipeline.
- [x] Remove the superseded Blender hardware/knob runtime assets and Blender build scripts from this worktree.

### Task 4: Functional regression and browser acceptance

**Files:**
- Test: `tests/noise-meter-state.test.js`
- Test: `tests/noise-state-assets.test.js`
- Test: `tests/class-tv.test.js`
- Test: `tests/kiosk-magic-park.test.js`

- [x] Run focused Node tests for noise state, Class TV event coupling, assets, and Magic Park package ownership.
- [x] Verify 3840×2160 first and 1920×1080 second; Chrome DevTools provided the exact live geometry because the Playwright MCP resize/run-code path intermittently attached to `about:blank`.
- [x] Visually rehearse `idle`, `requesting`, `unavailable`, `low`, `medium`, `high` without treating simulated states as microphone acceptance; simulated DOM states are QA only.
- [x] Check overflow/clipping, foreground z-order, retry, ARIA meter, and visible copy.
- [x] Independently inspect Console, Issues, Network, computed styles, z-index, event/runtime state, and resource lifecycle in Chrome DevTools.

### Task 4B: Final runtime refinements requested during visual acceptance

**Files:**
- Modify: `public/js/noise-meter.js`
- Modify: `public/index.html`
- Modify: `public/themes/magic-park/boxes/noise-meter/noise-meter.css`
- Modify: `tests/noise-meter-state.test.js`
- Modify: `tests/kiosk-magic-park.test.js`

- [x] Lock the final supplied-panel geometry to `100.55% auto`, `scaleY(1.018)`, and control shelf `top: 74.0%`.
- [x] Remove `mic-start-btn / Tekrar Dene` from DOM and Magic Park CSS.
- [x] Add `devicechange`-driven automatic microphone reconnect; real analyser immediately owns the UI when available.
- [x] Keep 128-band natural demo equalizer active only while real analyser is unavailable.
- [x] Animate the lower progress fill in demo mode without publishing fake ARIA/semantic meter values.
- [x] Remove old 5% equalizer quantization, preserve low-energy response, and add smoother attack/release behaviour.
- [x] Retune equalizer/progress colors to the Magic Park cyan/mint/yellow/pink/violet palette.
- [x] Add high-clarity font smoothing, geometric precision, subtle text stroke, and layered shadows to status/control text.
- [x] Re-verify 1920×1080 and 3840×2160 geometry and runtime state with Playwright + Chrome DevTools.
- [x] Final focused tests: noise runtime 17/17, Magic Park 33/33; full core 1552/1552.

### Task 5: Record the completed package

**Files:**
- Modify: `docs/PROJE_OZETI.md`
- Modify: `public/themes/magic-park/boxes/noise-meter/README.md`

- [x] Document final visual ownership, runtime ownership, tested states, and limitations of simulated microphone-state rehearsal.
- [x] Update `docs/PROJE_OZETI.md`, `AI_PROJECT_CONTEXT.md`, and this plan with the final runtime/visual contract.

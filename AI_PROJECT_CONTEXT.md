# Classroom Dashboard — AI Project Context

## 1. Mandatory Instructions for Future AI Sessions

* Read this entire document before making any project change.
* Verify every recorded Git fact with:

  ```bash
  git branch --show-current
  git status
  git log -5 --oneline
  ```
* Repository state is the source of truth if this document becomes stale.
* Do not redesign the existing dashboard.
* Do not assume that a development task is complete merely because it was discussed.
* Check the “Current State”, “Recent Commits”, and “Next Recommended Task” sections before continuing.
* At the end of every completed development task, update this document before committing or as part of the same logical commit.
* Never place passwords, API keys, tokens, private student information, medical information, or secrets in this document.

## 2. Project Identity

* Project name: `Classroom Dashboard`
* Repository: `https://github.com/bingoweb/Classroom`
* Active development branch: `ilk-surum-gelistirme`
* Main dashboard URL:

  ```text
  http://127.0.0.1:3000/
  ```
* Admin URL:

  ```text
  http://127.0.0.1:3000/admin
  ```
* Development simulator URL:

  ```text
  http://127.0.0.1:3000/?gelistirme=1
  ```
* Primary target environment:

  * Raspberry Pi
  * local school network
  * large classroom display
  * primarily 1920×1080 and 4K screens
  * 1366×768 must remain usable

## 3. User and Product Requirements

* The user likes the existing dashboard design.
* Preserve the original bento-grid structure.
* Preserve the dark neon glassmorphism aesthetic.
* Preserve:

  * large digital clock
  * slideshow prominence
  * lesson countdown
  * attendance information
  * noise meter
  * class president
  * vice presidents
  * duty students
  * weekly stars
* Do not redesign from scratch.
* Do not move cards unless the user explicitly requests it.
* Do not shrink the main clock.
* Do not reduce student-photo readability.
* Do not replace the current visual identity with a generic dashboard.
* Development must proceed through small, reversible changes.
* All AI implementation prompts and technical reports should be written in English.
* All visible application labels, buttons, errors, and help text must be natural Turkish.
* Code identifiers, filenames, API fields, and internal names may remain in English.

## 4. Technology Stack

* Node.js
* Express
* SQLite
* Vanilla JavaScript
* Vanilla CSS
* Web Audio API
* Multer
* XLSX
* Local static frontend
* No frontend framework
* No test framework currently committed
* Temporary Playwright and Node test scripts are created under:

  ```text
  /tmp/classroom-playwright/
  ```
* Temporary test scripts must not be committed unless explicitly approved.

## 5. Important Project Files

* `backend/server.js`: The central Express server and API entry point.
* `backend/database.js`: The SQLite initialization and database schema definitions.
* `public/index.html`: The main dashboard HTML layout utilizing the bento-grid.
* `public/css/style.css`: The styling file for the main dashboard (glassmorphism, layout, typography).
* `public/js/script.js`: Main frontend logic connecting components, rendering the dashboard, and making API calls.
* `public/js/schedule-normalizer.js`: A pure, dependency-free validation layer that normalizes and validates external schedule arrays.
* `public/js/schedule-manager.js`: Handles lesson schedules, active period detection, and countdown generation logic.
* `public/js/time-provider.js`: Abstracts time retrieval to support dev simulation or real time.
* `public/js/dev-time-simulator.js`: A development toolbar that controls and mocks time states.
* `public/css/dev-time-simulator.css`: Styles specifically for the dev time simulator overlay.
* `public/admin/index.html`: The administrative interface HTML for managing classroom data.
* `public/admin/admin.js`: The frontend script driving the admin panel interactions.
* `public/js/api-service.js`: Centralized fetch handling logic used by the frontend to communicate with the backend.

## 6. Current Verified Git State

* Active branch:

  ```text
  ilk-surum-gelistirme
  ```
* Current verified HEAD:

  ```text
  9d4c658 refactor: remove alternating schedule assumptions
  ```
* Working tree at the time this file is created:

  ```text
  clean
  ```
* Remote changes:

  ```text
  Recent development commits have not been pushed unless a later entry explicitly says otherwise.
  ```

*WARNING: Future AI agents must verify this section rather than trusting it blindly.*

## 7. Important Recent Commits

### `179907d`

```text
fix: remove duplicate script imports from main page
```

Summary:

* Removed duplicated script references from `public/index.html`.
* Fixed declaration errors involving:

  * `SettingsLoader`
  * `DisplayModeManager`
  * `SCHOOL_SCHEDULE`
* Original script order at the bottom of the page was preserved.

### `44e1874`

```text
feat: add lesson context and development time simulator
```

Summary:

* Added current-period and next-lesson information.
* Added:

  * `public/js/time-provider.js`
  * `public/js/dev-time-simulator.js`
  * `public/css/dev-time-simulator.css`
* Simulator activates only with:

  ```text
  ?gelistirme=1
  ```
* Normal mode does not create simulator DOM or load simulator CSS.
* Simulation is stored in `sessionStorage`.
* Simulation presets currently use fixed local dates and times.
* Simulated time is intentionally frozen for stable visual testing.
* The simulator never overrides the global JavaScript `Date` object.
* The normal bento layout remains unchanged.

### `9d4c658`

```text
refactor: remove alternating schedule assumptions
```

Summary:

* Removed hardcoded `i + 1` and `i + 2` assumptions from schedule lookup logic.
* Added forward-search helpers.
* Consecutive lessons and consecutive breaks can now be handled safely.
* Invalid null entries or rows missing `type` or `name` are ignored during forward lookup.
* Existing visible behaviour remains unchanged.

## 8. Development Time Simulator

Activation:

```text
http://127.0.0.1:3000/?gelistirme=1
```

Normal mode:

```text
http://127.0.0.1:3000/
```

Available simulator controls:

* Gerçek Zaman
* Ders Öncesi
* 1. Ders
* Teneffüs
* 2. Ders
* Öğle Teneffüsü
* Son Ders
* Okul Çıkışı
* Hafta Sonu
* Özel Tarih ve Saat

Current behaviour:

* Time remains frozen at the selected simulated timestamp.
* Digital clock, Turkish date, weekday, weekend counter, lesson state, progress, countdown, and subtitle use the same time provider.
* Simulation persists across reloads in the same tab through `sessionStorage`.
* `Gerçek Zaman` clears the simulation.
* Development UI is hidden in normal mode.
* The simulator JavaScript file is downloaded in normal mode but exits before initialisation.
* No duplicate timer is created.

## 8.5. Schedule Normalizer Layer

The `public/js/schedule-normalizer.js` file provides a pure, dependency-free validation layer.

* **Public API:** `window.ScheduleNormalizer.normalizeSchedule(rows)` returns `{ periods, warnings, errors, valid }`.
* **Accepted Aliases:** `course` for `name`, `period_type` for `type`, `start_time` for `start`, `end_time` for `end`.
* **Accepted Type Aliases (Case-insensitive):** 
  * `class`, `lesson`, `ders` -> `class`
  * `break`, `recess`, `teneffüs`, `teneffus`, `ara` -> `break`
* **Validation Behaviour:** Drops rows with invalid/missing times, unknown types, or zero/negative durations with structured warnings. Exact duplicates are skipped.
* **Overlap Handling:** Detects intersecting times, triggers a fatal `OVERLAP` error, and marks the schedule `valid: false`.
* **Non-Mutation:** Deeply guarantees that original input objects and arrays remain strictly untouched.
* **Connection Status:** Currently **not connected** to the dashboard, admin panel, or any other system.

## 9. Current Hardcoded School Schedule

| Index | Name               | Type  | Start | End   |
| ----: | ------------------ | ----- | ----- | ----- |
|     0 | 1. Ders            | class | 09:00 | 09:40 |
|     1 | 1. Teneffüs        | break | 09:40 | 09:55 |
|     2 | 2. Ders            | class | 09:55 | 10:35 |
|     3 | 2. Teneffüs        | break | 10:35 | 10:50 |
|     4 | 3. Ders (Beslenme) | class | 10:50 | 11:30 |
|     5 | 3. Teneffüs        | break | 11:30 | 11:40 |
|     6 | 4. Ders            | class | 11:40 | 12:20 |
|     7 | Öğle Teneffüsü     | break | 12:20 | 13:00 |
|     8 | 5. Ders            | class | 13:00 | 13:40 |
|     9 | Son Teneffüs       | break | 13:40 | 13:50 |
|    10 | Son Ders           | class | 13:50 | 14:30 |

* Monday through Friday currently use the same schedule.
* Saturday and Sunday are treated as weekends.
* Special holidays, makeup school days, and shortened schedules are not yet supported.

## 10. Existing Backend Schedule System

Database table:

```text
schedule
```

Current fields:

* `id`
* `day`
* `period`
* `course`

Current limitations:

* no `start_time`
* no `end_time`
* no `type`
* no `duration`
* no `is_active`
* no complete schedule validation

Current API:

* `GET /api/schedule`
* `POST /api/schedule`

Current verified GET response:

```json
[]
```

Admin status:

* There is currently no schedule-management tab.
* The admin interface does not call the schedule API.
* The main dashboard does not call the schedule API.
* The countdown continues to use the hardcoded frontend schedule.

Important warning:

Do not connect the current dashboard directly to the current schedule API. The database schema does not contain enough information to calculate countdowns safely.

## 11. Known Technical Risks and Debt

### Schedule source duplication

* Frontend schedule is hardcoded.
* Backend contains a dormant and incomplete schedule table.
* Future admin changes would not affect the current countdown.

### Schedule schema limitations

* Missing start/end time and type fields.
* Current backend rows cannot represent breaks or countdown duration.

### Schedule normalisation integration

* The pure `schedule-normalizer.js` validation layer now exists.
* Integration with `schedule-manager.js` and fallback selection are still pending.

### Simulator preset coupling

* Preset times are hardcoded.
* If the real schedule changes, presets may target the wrong state.
* Future presets should derive suitable test times from the active validated schedule.

### Istanbul date bug

* Some backend attendance logic uses:

  ```javascript
  new Date().toISOString().split('T')[0]
  ```
* At early local hours in Europe/Istanbul, this can resolve to the previous UTC calendar date.
* This issue has been identified but not yet fixed.

### Main script size and responsibility

* `public/js/script.js` contains many unrelated dashboard responsibilities.
* Avoid broad refactoring until behavioural tests exist.

### Admin interface

* Some admin labels are mixed Turkish and English.
* Schedule administration is absent.
* Authentication and security improvements remain future work.

### Potential HTML injection

* Some dynamic values are inserted with template strings and `innerHTML`.
* Student names and similar external values should eventually be escaped or rendered using safe DOM APIs.

## 12. Accepted Non-Blocking Test Warnings

* Headless browser microphone:

  ```text
  NotFoundError: Requested device not found
  ```
* Empty slideshow:

  ```text
  [WARN] [SLIDESHOW] No slides found, using fallback
  ```

These are non-blocking during headless development tests unless the behaviour changes unexpectedly.

## 13. Current Testing Expectations

Before committing a dashboard change, verify:

* JavaScript syntax with `node -c`
* normal dashboard:

  ```text
  /
  ```
* development simulator:

  ```text
  /?gelistirme=1
  ```
* admin panel:

  ```text
  /admin
  ```
* 1920×1080 viewport
* 1366×768 viewport
* no page overflow
* no card movement unless explicitly requested
* no duplicate scripts
* no duplicate subtitles
* no duplicate intervals
* no new page errors
* no failed local requests
* normal mode contains no simulator UI
* development mode contains exactly one simulator UI

## 14. Work That Was Tried and Rejected

* An experimental `dashboard-v2` layout was created.
* It moved the clock into a full-width header and substantially rearranged the cards.
* The user rejected it because the original layout was preferred.
* The files:

  * `public/dashboard-v2.html`
  * `public/css/dashboard-v2.css`
    were deleted.
* Do not recreate or revive this design unless the user explicitly requests it.
* A later uncommitted visual restructuring was also restored because it changed the original bento layout too much.

## 15. Current Development Direction

The project is moving toward a validated, dynamic lesson-schedule system while preserving the existing dashboard and keeping the current hardcoded schedule as an offline fallback.

The safe planned sequence is:

1. Add a pure schedule normalisation and validation layer (COMPLETED).
2. Test malformed, unsorted, overlapping, and incomplete input (COMPLETED).
3. Allow `schedule-manager.js` to consume a validated schedule.
4. Keep the current hardcoded schedule as fallback.
5. Upgrade the backend schedule schema.
6. Add a Turkish schedule-management section to the admin panel.
7. Connect the dashboard to the API only after validation and fallback are ready.
8. Make simulator presets derive from the active schedule.
9. Fix Istanbul-local date handling.

## 16. Next Recommended Task

```text
Add focused regression coverage for ScheduleManager external injection and evaluate whether simulator presets should derive from the active schedule, without connecting /api/schedule.
```

The next task must explicitly state:
* do not fetch `/api/schedule` yet
* do not modify the backend schema yet
* do not modify the admin panel yet
* do not connect the current incomplete database schedule
* first add safe schedule injection and fallback behaviour only

## 17. Update Protocol for Every Future Task

At the end of each completed development task, update this file with:

1. `Last verified branch`
2. `Last verified HEAD`
3. `Working-tree state`
4. New or modified files
5. Commit hash and message
6. Behaviour added or changed
7. Tests performed
8. New known issues
9. Resolved issues
10. Updated next recommended task

Rules:

* Keep old important commits in the history section.
* Do not replace the document with only the newest task.
* Preserve major rejected-design decisions.
* Keep the “Next Recommended Task” section to one concrete next step.
* Add dates in ISO format:

  ```text
  YYYY-MM-DD
  ```
* Do not claim a change is committed unless verified with Git.
* Do not claim a change is pushed unless verified with the remote.
* Keep the document concise enough for an AI to read quickly, but complete enough to restore context.

## 18. Last Context Update

* Date:

  ```text
  2026-07-12
  ```
* Verified branch:

  ```text
  ilk-surum-gelistirme
  ```
* Verified HEAD before this task:

  ```text
  a8f6235 docs: update AI context after normalizer
  ```
* New commit message:

  ```text
  feat: integrate validated schedule fallback
  ```
* Working tree state before this document update:

  ```text
  clean (with public/index.html and public/js/schedule-manager.js modified)
  ```
* Files modified:

  ```text
  public/index.html
  public/js/schedule-manager.js
  AI_PROJECT_CONTEXT.md
  ```
* New `ScheduleManager` APIs added:

  ```text
  setExternalSchedule(rows), clearExternalSchedule(), getActiveSchedule(), getScheduleSource()
  ```
* Fallback behaviour:

  ```text
  Invalid, empty, or missing schedules automatically revert to SCHOOL_SCHEDULE without throwing errors.
  ```
* Schedule-gap rejection:

  ```text
  Any uncovered time gaps between valid periods trigger a SCHEDULE_GAP error and the schedule is rejected to maintain countdown continuity.
  ```
* Tests performed:

  ```text
  Node regression tests covering 19 test conditions including fallback retention, gap detection, array mutability, zero-duration overlaps, browser/node execution, and syntax verification. Playwright UI tests verified no layout overflow and no duplicate scripts.
  ```
* Resolved risks:

  ```text
  Schedule integration logic is now completed without connecting it to the faulty backend API yet.
  ```
* Remaining risks:

  ```text
  Simulator presets remain hardcoded and may be invalid against new schedules. Backend database still lacks the required temporal fields to be safely consumed.
  ```
* Status:

  ```text
  Task completed successfully.
  ```

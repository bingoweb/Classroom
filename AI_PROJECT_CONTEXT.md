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
Fix Istanbul-local date key generation in date-sensitive backend paths without changing the schedule schema, admin panel, API contract, or dashboard design.
```

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
  ab0539f docs: update semantic simulator context
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Files added/modified during task:

  ```text
  public/js/dev-time-simulator.js (modified)
  tests/dev-time-simulator.test.js (modified)
  AI_PROJECT_CONTEXT.md (modified)
  ```
* Hardening Edge Cases:

  ```text
  - Strict `HH:MM` rule: Replaced permissive `split` with strict regex `/^(?:[01]\d|2[0-3]):[0-5]\d$/`.
  - Weekend schedule-independence: Moved `weekend` evaluation to occur before missing schedule checks. `isSemanticPresetAvailable` ensures `weekend` is available without a schedule.
  - Malformed-period protection: `classes` and `breaks` filters check `p && typeof p === 'object'`.
  - Stale availability refresh strategy: Added `pointerover`, `focusin`, and `keydown` event listeners to update UI dynamically without global schedule-change events.
  - Duplicate-initialization guard: `init` exits early if `document.getElementById('dev-time-simulator')` exists.
  - TimeProvider-unavailable: All buttons disable automatically with a tooltip "Zaman sağlayıcısı kullanılamıyor." if `!window.TimeProvider`.
  ```
* Exact Node test totals:

  ```text
  Persistent ScheduleManager tests: 33
  Persistent Simulator tests: 42
  Combined core test total: 75
  ```
* Exact Playwright UI test total:

  ```text
  37 passed, 0 failed (verified via real Chromium)
  ```
* Implementation commit:

  ```text
  e58785e fix: harden semantic simulator edge cases
  ```
* Documentation commit:

  ```text
  (hash available in Git history) docs: record simulator hardening results
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Confirmation of unchanged scope:

  ```text
  Backend, database, API connection, admin panel, dashboard visual design, clock layout, cards, and CSS were definitely NOT changed.
  ```
* Remaining risks:

  ```text
  Backend uses server-local time (often UTC on servers) or problematic date generation causing Istanbul time bugs. Database schema requires updating to handle dynamic temporal fields correctly.
  ```
* Status:

  ```text
  Task completed successfully.
  ```

## 19. Last Context Update

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
  6c5579e docs: record simulator hardening results
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Files added/modified during task:

  ```text
  backend/date-utils.js (added)
  tests/backend-date-utils.test.js (added)
  backend/server.js (modified)
  package.json (modified)
  ```
* Root cause of the UTC/Istanbul date-key defect:

  ```text
  Using `new Date().toISOString().split('T')[0]` generated UTC dates, which resulted in the wrong date key when queried between midnight and 02:59:59 local Istanbul time.
  ```
* New `backend/date-utils.js` public API:

  ```text
  ISTANBUL_TIME_ZONE ('Europe/Istanbul') and getIstanbulDateKey(date = new Date())
  ```
* Explicit `Europe/Istanbul` decision:

  ```text
  Implemented deterministic local timezone conversion avoiding unreliable host-timezone logic like process.env.TZ or Date object numeric offsets.
  ```
* Why `Intl.DateTimeFormat(...).formatToParts()` was selected:

  ```text
  Ensures strict standard 'YYYY-MM-DD' formatting regardless of locale quirks or default separators.
  ```
* The two endpoint integrations:

  ```text
  `GET /api/stats` and `GET /api/attendance/today`
  ```
* Excluded paths:

  ```text
  Explicit attendance-date routes (e.g. `GET /api/attendance/:date`) and unrelated timestamps (e.g., slide expirations) were purposefully left untouched.
  ```
* Exact Node version:

  ```text
  v24.18.0
  ```
* Exact Node test totals:

  ```text
  Persistent ScheduleManager tests: 33
  Persistent Simulator tests: 42
  Persistent Backend Date tests: 20
  Combined core test total: 95
  ```
* Exact Server smoke-test result:

  ```text
  Backend attendance smoke responses are valid JSON
  ```
* Exact Playwright UI test total:

  ```text
  37 passed, 0 failed (verified via real Chromium)
  ```
* Implementation commit:

  ```text
  9e1dae4 fix: use Istanbul date keys for attendance
  ```
* Documentation commit:

  ```text
  (hash available in Git history) docs: record Istanbul date key fix
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Confirmation of unchanged scope:

  ```text
  Database schema, schedule API contract, admin panel, frontend files, dashboard layout, cards, large clock, CSS, and visual design were definitely NOT changed.
  ```
* Remaining risks:

  ```text
  Database schema requires updating to handle dynamic temporal fields correctly in the next task.
  ```
* Updated next recommended task:

  ```text
  Design and implement a backward-compatible schedule-table migration and validated backend schedule API for normalized period fields, without connecting the admin panel or dashboard yet.
  ```

## 20. Last Context Update

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
  d1e4411 docs: record Istanbul date key fix
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Files added/modified during task:

  ```text
  backend/schedule-schema.js (added)
  backend/schedule-service.js (added)
  backend/schedule-repository.js (added)
  tests/backend-schedule.test.js (added)
  backend/database.js (modified)
  backend/server.js (modified)
  package.json (modified)
  ```
* Original legacy schema:

  ```text
  id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, period INTEGER NOT NULL, course TEXT NOT NULL, UNIQUE(day, period)
  ```
* Additive migration fields:

  ```text
  period_type TEXT, start_time TEXT, end_time TEXT, is_active INTEGER NOT NULL DEFAULT 1
  ```
* Legacy-row preservation policy:

  ```text
  All existing id, day, period, and course values remain unmodified.
  ```
* No-fabricated-times policy:

  ```text
  Legacy rows receive NULL for temporal fields because they cannot be inferred safely.
  ```
* Normalized API route contracts:

  ```text
  GET /api/schedule/normalized returns unified structure: day, source, valid, periods, warnings, errors.
  PUT /api/schedule/normalized validates inputs and replaces periods via atomic transaction.
  ```
* Strict partial-input rejection policy:

  ```text
  PUT /api/schedule/normalized rejects writes returning PARTIAL_SCHEDULE_REJECTED if normalizer issues ANY row-dropping warnings.
  ```
* Exact duplicate policy:

  ```text
  DUPLICATE_PERIOD is treated as a nonfatal warning and safely merged.
  ```
* Atomic replacement behaviour:

  ```text
  Successful update runs in BEGIN IMMEDIATE replacing all rows for target day, ROLLBACK on any failure.
  ```
* Rollback behaviour:

  ```text
  Checked and verified via tests/backend-schedule.test.js handling SQLITE_IOERR and constraint failures safely.
  ```
* Temporary database test strategy:

  ```text
  getNormalizedScheduleRows and replaceNormalizedSchedule use an injected db object. Tests map temp sqlite DB using process.env.CLASSROOM_DB_PATH.
  ```
* `CLASSROOM_DB_PATH` internal override:

  ```text
  Reads process.env.CLASSROOM_DB_PATH before opening SQLite, safely isolating DB operations during testing.
  ```
* Exact Node version:

  ```text
  v24.18.0
  ```
* Exact Node test totals:

  ```text
  Persistent ScheduleManager tests: 33
  Persistent Simulator tests: 42
  Persistent Backend Date tests: 20
  Persistent Backend Schedule tests: 48
  Combined core test total: 143
  ```
* Exact Server smoke-test result:

  ```text
  Smoke tests passed for legacy arrays, POST success, normalized GET partial, PUT validation errors vs atomic update success.
  ```
* Exact Playwright UI test total:

  ```text
  37 passed, 0 failed (verified via real Chromium with test DB)
  ```
* Implementation commit:

  ```text
  bb8933a feat: add validated normalized schedule API
  ```
* Documentation commit:

  ```text
  (hash available in Git history) docs: record normalized schedule API
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Confirmation of unchanged scope:

  ```text
  Dashboard, admin panel, frontend API integration, cards, large clock, CSS, and visual design were not changed.
  ```
* Remaining risks:

  ```text
  Dashboard uses old logic and needs wiring to GET /api/schedule/normalized.
  ```
* Updated next recommended task:

  ```text
  Connect the dashboard to GET /api/schedule/normalized through a guarded loader that activates ScheduleManager external schedules only when the backend response is valid, while preserving permanent fallback behaviour and without building the admin editor yet.
  ```

## 21. Last Context Update

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
  1af105b docs: record normalized schedule API
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Implementation commit hash and message:

  ```text
  26c32f8 fix: harden normalized schedule API correctness
  ```
* Files added/modified during task:

  ```text
  backend/database.js (modified)
  backend/schedule-service.js (modified)
  backend/server.js (modified)
  tests/backend-schedule.test.js (modified)
  ```
* Readiness Promise race and correction:

  ```text
  db.scheduleMigrationPromise is now immediately available upon requiring database.js, preventing race conditions where the Promise didn't exist initially.
  ```
* Swallowed-rejection correction:

  ```text
  SQLite open failures and schema migration failures now explicitly reject db.scheduleMigrationPromise instead of swallowing the error.
  ```
* Shared four-route migration gate:

  ```text
  A single middleware requireScheduleStorageReady ensures that all 4 legacy and normalized routes wait for migration or fail gracefully.
  ```
* 503 contract:

  ```text
  Rejections of db.scheduleMigrationPromise return HTTP 503 withSCHEDULE_STORAGE_UNAVAILABLE and natural Turkish error text, hiding internal paths and SQLITE_ errors.
  ```
* Canonical day-key policy:

  ```text
  resolveScheduleDayKey trims and sanitizes the day parameter before querying/saving. Invalid names return HTTP 400. Padded requests are cleaned.
  ```
* Omitted-day default policy:

  ```text
  Normalized PUT without a 'day' falls back to 'weekday'. Omitted GET falls back to 'weekday'.
  ```
* 400 versus 422 policy:

  ```text
  Malformed payloads without a 'periods' array return 400 (INVALID_SCHEDULE_BODY). Structurally valid but semantically empty/invalid schedules (e.g. periods: []) return 422.
  ```
* Legacy-incomplete diagnostics policy:

  ```text
  A legacy row without temporal data fetched from normalized GET retains its structure and returns valid: false along with explicit warnings/errors from the pure normalizer.
  ```
* Exact number of placeholder tests removed:

  ```text
  8 placeholder tests replaced.
  ```
* Names or categories of placeholder tests replaced:

  ```text
  API Wiring Tests and Readiness Script Tests.
  ```
* Exact persistent suite totals from final runs:

  ```text
  ScheduleManager tests: 33
  Simulator tests: 42
  Backend Date tests: 20
  Backend Schedule tests: 47
  Combined core test total: 142
  ```
* Exact API smoke-test outcomes:

  ```text
  15/15 valid endpoints checked and passed via smoke-test script targeting the new 3001 testing port.
  ```
* Migration-failure HTTP test:

  ```text
  503 response generated and returned successfully with no SQLite paths leaked (tested on port 3002).
  ```
* Playwright result:

  ```text
  UI tests: 37 passed, 0 failed.
  ```
* Confirmation that the real database was untouched:

  ```text
  backend/classroom.db and other real project artifacts were not touched or committed. All execution used isolated temporary DB paths.
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Remaining risks:

  ```text
  Dashboard uses old logic and needs wiring to GET /api/schedule/normalized.
  ```
* Next recommended task:

  ```text
  Connect the dashboard to GET /api/schedule/normalized through a guarded loader that activates ScheduleManager external schedules only when the backend response is valid, while preserving permanent fallback behaviour and without building the admin editor yet.
  ```

## 22. Last Context Update

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
  2c00d5e docs: record schedule API hardening
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Implementation commit hash and message:

  ```text
  51889df test: correct schedule API contracts and totals
  ```
* Files added/modified during task:

  ```text
  backend/schedule-service.js (modified)
  backend/server.js (modified)
  tests/backend-schedule.test.js (modified)
  AI_PROJECT_CONTEXT.md (modified)
  ```
* Corrected test-count arithmetic:

  ```text
  Fixed incorrect persistent test totals from a previous task. ScheduleManager tests count was mistakenly recorded as 142 instead of 33, causing the combined core test total to be mistakenly listed as 251 instead of 142.
  ```
* `isValidDayKey(undefined)` root cause and fix:

  ```text
  The function resolveScheduleDayKey used `options.defaultDay || 'weekday'`, which incorrectly resolved `undefined` to truthy 'weekday'. It was fixed to use `Object.prototype.hasOwnProperty.call(options, 'defaultDay')`.
  ```
* Invalid-day GET response code:

  ```text
  The GET route for invalid days now correctly returns HTTP 400 with both `code: 'INVALID_SCHEDULE_DAY'` and `error: 'Geçersiz gün anahtarı.'`.
  ```
* Remaining `assert.ok(true)` removal:

  ```text
  The last placeholder migration test (Migration may run twice without failure) was replaced with genuine schema checks verifying columns and indices.
  ```
* Persistent HTTP tests added:

  ```text
  21 new persistent HTTP tests were added to tests/backend-schedule.test.js.
  ```
* Assertion strategy change:

  ```text
  Changed assertion strategy from `console.assert` to `node:assert/strict` inside integration tests.
  ```
* Exact persistent suite totals from final runs:

  ```text
  ScheduleManager tests: 33
  Simulator tests: 42
  Backend Date tests: 20
  Backend Schedule tests: 69
  Combined core test total: 164
  ```
* Smoke-test result:

  ```text
  All 21 persistent HTTP integration tests passed (throwing assertions via node:assert/strict).
  ```
* 503 result:

  ```text
  Migration-failure path verified. An unusable database location results in HTTP 503, code SCHEDULE_STORAGE_UNAVAILABLE, with no SQLite path, errno or stack exposed.
  ```
* Playwright result:

  ```text
  UI tests: 37 passed, 0 failed.
  ```
* Confirmation that the real database was untouched:

  ```text
  backend/classroom.db and other real project artifacts were not touched or committed. All execution used isolated temporary DB paths.
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Next recommended task:

  ```text
  Connect the dashboard to GET /api/schedule/normalized through a guarded loader that activates ScheduleManager external schedules only when the backend response is valid, while preserving permanent fallback behaviour and without building the admin editor yet.
  ```


## 23. Last Context Update

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
  717ce15 docs: correct schedule hardening results
  ```
* Initial working-tree state:

  ```text
  clean
  ```
* Implementation commit hash and message:

  ```text
  28824e0 fix: integrate dashboard with normalized schedule API
  ```
* Files added/modified during task:

  ```text
  public/js/dashboard-schedule-loader.js (added)
  public/js/script.js (modified)
  public/index.html (modified)
  public/js/time-provider.js (modified)
  ```
* Dashboard Schedule Loader:

  ```text
  Created a dependency-free UMD loader `DashboardScheduleLoader` that calls the `/api/schedule/normalized?day=weekday` API and integrates it with `ScheduleManager`.
  ```
* Fallback guarantee:

  ```text
  The loader protects the dashboard layout by enforcing strict validation: if the network fails, or the schedule is empty/malformed, the application safely preserves or restores the local offline fallback schedule.
  ```
* UI tests:

  ```text
  Added a new Playwright UI testing suite `test-ui.js` that intercepts API calls and asserts the state of `ScheduleManager`.
  ```
* Exact Playwright UI test total:

  ```text
  UI tests: 24 passed, 0 failed.
  ```
* Exact Node test totals:

  ```text
  Persistent Backend Schedule tests: 69
  Combined core test total: 164
  ```
* Confirmation of unchanged scope:

  ```text
  The admin panel, schedule management interface, backend date logic, and existing dashboard bento layout remained completely untouched.
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Next recommended task:

  ```text
  Build the first read-only schedule diagnostics section in the admin panel.
  ```

---

## Task 10: Publish Dashboard Loader Persistent Tests

* Objective: Complete the missing persistent-test publication and documentation correction for the dashboard normalized-schedule integration.
* Implementation Hash:

  ```text
  332ef18167e8b6d4f12baaf1c945fd0f7d58dbe8
  ```
* Files added/modified during task:

  ```text
  tests/dashboard-schedule-loader.test.js (added)
  public/js/dashboard-schedule-loader.js (modified)
  package.json (modified)
  ```
* Final verification results:

  ```text
  Loader tests: 55
  Combined core test total: 219
  UI tests: 24 passed, 0 failed
  ```
* Final working-tree state:

  ```text
  clean (after committing this documentation)
  ```
* Next recommended task:

  ```text
  Build the first read-only schedule diagnostics section in the admin panel.
  ```

# Admin Access Control Plan

## Current Risk
The admin panel and API currently do not have authentication or authorization. They should not remain openly accessible.

## Goals
- The admin panel and write-capable API endpoints should not remain openly accessible.
- The first implementation should be minimal and low-risk.
- The classroom display view should remain easy to open in kiosk/fullscreen mode.
- Admin actions should require a separate admin session.

## Non-Goals
- The first version should avoid unnecessary complexity such as multi-user roles unless clearly justified.
- Secrets must not be committed.
- Any future implementation must preserve the current Turkish user-facing UI language.

## Recommended Minimal Model
A simple server-side admin session model using:
- a password or passphrase supplied from environment configuration
- secure cookie settings appropriate for local deployment
- CSRF-aware handling for write actions
- clear separation between public display routes and admin/API write routes

## Session and Credential Strategy
Admin sessions will be tracked server-side and identified via a secure cookie. The admin passphrase will be injected via an environment variable, ensuring secrets are not committed to source control.

## API Protection Strategy
All write-capable API routes will be placed behind authentication middleware that verifies the admin session.

## Protected Write Route Inventory

| Method | Path | Capability | Admin Session Required | CSRF Protection Required |
| --- | --- | --- | --- | --- |
| POST | /api/students | Create student | Yes | Yes |
| POST | /api/students/import | Import students | Yes | Yes |
| DELETE | /api/students/:id | Delete student | Yes | Yes |
| PUT | /api/students/:id/photo | Update student photo | Yes | Yes |
| POST | /api/roles | Create role | Yes | Yes |
| DELETE | /api/roles/:id | Delete role | Yes | Yes |
| POST | /api/settings | Update settings | Yes | Yes |
| PUT | /api/schedule/normalized | Update normalized schedule | Yes | Yes |
| POST | /api/schedule | Legacy schedule write | Yes | Yes |
| POST | /api/attendance | Bulk attendance update | Yes | Yes |
| PUT | /api/attendance/:id | Single attendance update | Yes | Yes |
| POST | /api/slides | Create slide | Yes | Yes |
| PUT | /api/slides/reorder | Reorder slides | Yes | Yes |
| PUT | /api/slides/:id | Update slide | Yes | Yes |
| DELETE | /api/slides/:id | Delete slide | Yes | Yes |
| POST | /api/slide-settings | Update slide settings | Yes | Yes |
| POST | /api/logs | Create log entry | Yes | Yes |
| DELETE | /api/logs/cleanup | Clean up logs | Yes | Yes |

* Public display GET routes are not part of this write-route table.
* The `/admin` page itself must require an authenticated admin session in the implementation phase.
* Sensitive administrative GET routes may need a separate protection review before implementation.

**Audit Summary:**
- POST routes: 9
- PUT routes: 5
- PATCH routes: 0
- DELETE routes: 4
- Total write-capable routes: 18

## Admin UI Strategy
The admin panel routes will require a valid session. Unauthenticated users will be challenged to log in.

## Local Classroom Deployment Notes
Security must be balanced with usability for local network deployments, ensuring the classroom display functions smoothly without requiring periodic login.

## Migration and Configuration Impact
Administrators will need to set an environment variable to establish the admin passphrase before deploying the update.

## Test Strategy
Focused test files will be added to ensure public routes are unaffected and write routes are securely protected against unauthenticated and CSRF attacks.

## Planned Access Control Test Cases

These cases define the required behavior for a future access-control implementation. They do not claim that authentication, authorization, sessions, or CSRF protection already exist.

### Test Isolation and Fixtures

- Security tests must use isolated temporary databases and upload directories.
- Tests must never read from or write to `backend/classroom.db`.
- Environment variables, mocked clocks, session stores, upload paths, and modified module state must be restored after every test.
- No security test may depend on execution order or state left by another test.

### Public Display Access

- The main classroom display page must remain accessible without an admin session.
- Static assets required by the classroom display must remain accessible without login.
- Public display media under the managed uploads path must remain accessible without login.
- Read-only API endpoints required by the classroom display must remain accessible unless a separate sensitive-GET review classifies them as administrative.
- Public display access must not create or require an admin session cookie.

### Admin Page Access

- An unauthenticated request to `/admin` must not receive the administration interface and must be redirected to the admin login page.
- A request to `/admin` with a valid, unexpired admin session must receive the administration interface.
- Invalid, unknown, logged-out, and expired sessions must be treated as unauthenticated.
- Login, redirect, denial, expiry, and logout messages visible to users must remain natural Turkish.

### Configuration Failure Behavior

- An absent, empty, or whitespace-only `CLASSROOM_ADMIN_PASSWORD` value must be treated as missing configuration.
- Missing password configuration must not silently leave `/admin` or any write-capable API route open.
- Admin login must remain unavailable until valid password configuration is supplied.
- Public classroom display routes must continue to operate when admin access is disabled because configuration is missing.
- Configuration failures must return safe messages and must never expose environment values, expected passwords, session identifiers, or CSRF tokens.

### Login and Session Lifecycle

- An incorrect password must not create an authenticated session or set a valid admin cookie.
- The configured password must create a new server-side admin session.
- Successful authentication must issue a new unpredictable session identifier rather than reusing a pre-login identifier.
- The session-status response must distinguish authenticated and unauthenticated clients without exposing the configured password, stored credential material, or raw server-side session data.
- Logout must invalidate the server-side session and make the previous cookie unusable.
- Expired sessions must no longer authorize `/admin` or protected API requests.
- A newly authenticated session must not inherit authentication or CSRF state from a previous session.

### Login Request Hardening

- Same-origin login requests must be accepted when their credentials are valid.
- Login requests with a conflicting or unapproved origin must be rejected.
- Login request bodies must be size-limited and malformed bodies must fail safely.
- Repeated failed login attempts must be throttled without revealing whether the server password is configured or which credential check failed.
- Authentication failures must use a generic Turkish user-facing error and must not disclose secret-comparison details.

### Write Route Protection

- Every route in the existing `Protected Write Route Inventory` must be covered by table-driven security tests.
- All 18 inventoried write-capable routes must reject requests without an authenticated admin session.
- Unauthenticated API write requests must return an authentication failure before reaching the existing route handler.
- Authenticated write requests without a CSRF token must be rejected.
- Authenticated write requests with an invalid CSRF token must be rejected.
- Authenticated write requests using a CSRF token from another session must be rejected.
- Authenticated write requests with the correct session-bound CSRF token must reach the route's existing validation and business logic.
- Authentication and CSRF rejection must occur without changing database state, deleting managed files, creating uploads, or invalidating caches.

### Upload Middleware Ordering

The following upload-capable routes require explicit ordering tests:

- `POST /api/students`
- `POST /api/students/import`
- `PUT /api/students/:id/photo`
- `POST /api/slides`
- `PUT /api/slides/:id`

For each route:

- Authentication must be checked before upload middleware persists a file.
- CSRF validation must be checked before upload middleware persists a file.
- Rejected unauthenticated requests must leave no new upload file behind.
- Rejected CSRF requests must leave no new upload file behind.
- Valid authenticated and CSRF-protected requests must continue to reach the route's existing file-type, file-size, payload, database, and cleanup behavior.

### CSRF and Session Binding

- CSRF tokens must be bound to one authenticated admin session.
- A missing CSRF token must be rejected.
- A malformed or incorrect CSRF token must be rejected.
- A valid token from one admin session must not authorize a different session.
- A token associated with a logged-out or expired session must be rejected.
- Protected writes must require the token in the designated CSRF request header.
- A successful new login must establish fresh session and CSRF state.

### Session Cookie Behavior

- The admin session cookie must use `HttpOnly`.
- The admin session cookie must use `SameSite=Strict`.
- The cookie must be scoped to the application and must not use an unnecessarily broad domain.
- HTTPS deployment must enable the `Secure` cookie attribute.
- Explicit local classroom HTTP configuration may disable `Secure` without disabling the other cookie protections.
- Tests must cover both the local HTTP configuration and the HTTPS configuration.
- Logout and session expiry must prevent the old cookie from authorizing subsequent requests.

### CORS and Origin Behavior

- Normal same-origin classroom display and admin usage must continue to work.
- Arbitrary cross-origin write requests must not receive permission to use admin credentials.
- Unexpected origins must not be allowed through a wildcard credentialed CORS policy.
- Any future allowed-origin setting must be explicit and must be tested with both allowed and rejected origins.
- Removing unnecessary CORS support must not break same-origin application behavior.

### Existing Behavior Regression

- Valid authenticated and CSRF-protected requests must preserve the current route-specific validation status codes and response behavior.
- Existing transaction, cache invalidation, upload cleanup, file deletion, schedule validation, attendance, role-limit, slide, settings, and log behavior must remain unchanged after access control is introduced.
- Existing public display functionality must remain usable without admin authentication.
- The complete `test:core` suite must remain successful on the supported Node.js matrix.

### Coverage Acceptance

- The security test suite must identify protected cases by HTTP method and exact route path.
- The 9 POST, 5 PUT, 0 PATCH, and 4 DELETE routes in the inventory must all be represented.
- The route-protection matrix must contain exactly 18 distinct write routes.
- Future implementation work must not be accepted until the planned failing tests exist, their intended failures are understood, and the implementation makes them pass without weakening existing assertions.

## Rollout Phases
- Phase 1: plan and tests
- Phase 2: minimal login/session middleware
- Phase 3: protect admin page and write APIs
- Phase 4: add logout/session expiry and documentation
- Phase 5: optional hardening after classroom testing

## Open Decisions
- This document is a plan only and must not claim that access control has already been implemented.

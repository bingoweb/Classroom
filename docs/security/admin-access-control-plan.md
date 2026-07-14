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

## Admin UI Strategy
The admin panel routes will require a valid session. Unauthenticated users will be challenged to log in.

## Local Classroom Deployment Notes
Security must be balanced with usability for local network deployments, ensuring the classroom display functions smoothly without requiring periodic login.

## Migration and Configuration Impact
Administrators will need to set an environment variable to establish the admin passphrase before deploying the update.

## Test Strategy
Focused test files will be added to ensure public routes are unaffected and write routes are securely protected against unauthenticated and CSRF attacks.

## Rollout Phases
- Phase 1: plan and tests
- Phase 2: minimal login/session middleware
- Phase 3: protect admin page and write APIs
- Phase 4: add logout/session expiry and documentation
- Phase 5: optional hardening after classroom testing

## Open Decisions
- This document is a plan only and must not claim that access control has already been implemented.

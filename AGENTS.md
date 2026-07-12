# Agent Instructions

## Maintenance mode
* The project is in maintenance and optimization mode.
* New features are prohibited by default.
* Every task must concern one existing feature or one maintenance-infrastructure concern.
* Unrelated features must not be changed together.
* Existing working behaviour must be preserved unless a verified defect is being corrected.

## Scope
* Every future implementation task requires an active task contract.
* Files outside the contract allowlist must not be modified.
* New files must be explicitly listed in the contract.
* Do not perform opportunistic cleanup.
* Do not add dependencies, network behaviour, storage, backend behaviour, database changes, or persistence without explicit permission.

## Language
* All user-visible interface text must be natural Turkish.
* All explanatory project documentation must be natural Turkish.
* Technical identifiers, filenames, commands, libraries, and API names may remain English.
* Mixed English-Turkish explanatory prose is prohibited.

## Rendering and security
* Do not add new `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function`.
* Existing violations are technical debt, not permission for new use.
* Use safe DOM construction.

## Testing
* Tests must verify real behaviour.
* Padding, placeholder, skipped, todo, assertion-free, duplicated, or unconditional-success tests are prohibited.
* Do not weaken tests to make code pass.
* Report top-level test declarations separately from executed test results.

## Evidence
* Local terminal output is not GitHub CI evidence.
* Do not claim a browser, CI, push, deployment, or verification succeeded without direct evidence.
* If Chromium did not run, state that.
* Do not reuse historical results as current results.
* Documentation must not contradict code.

## Git
* Explicitly stage every file.
* Prohibit `git add .`, `git commit -a`, `git commit -am`, force push, amend, rebase, squash, `killall`, `pkill`, and `pkill -f`.
* Run the staged gate before committing.
* Run the complete repository gate before pushing.
* A task is not complete when any required gate fails.

Executable repository checks override all agent completion claims.

# Agent Instructions

* All user-visible text and explanatory project documentation must be natural Turkish.
* Technical identifiers, filenames, command names, and code symbols may remain English.
* Do not claim that a test, browser run, CI run, or push succeeded without direct evidence.
* Local terminal results must never be described as GitHub CI evidence.
* If Chromium was not run, state that explicitly.
* Do not modify files outside the task allowlist.
* Do not use `innerHTML` in modules where the active task prohibits it.
* Do not introduce network, storage, backend, or database behaviour without explicit task permission.
* Do not add placeholder, padding, skipped, todo, or unconditional tests.
* Do not use `git add .`, `git commit -a`, `git commit -am`, force push, `killall`, `pkill`, or `pkill -f`.
* Run the compliance gate before every commit.
* A task is not complete when the compliance gate fails.

Executable checks override completion claims.

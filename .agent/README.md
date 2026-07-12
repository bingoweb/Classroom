# Agent Configuration Directory

This directory contains the project-wide configuration for the agent guardrail system.

## Files
* `project-policy.json`: The central configuration that defines allowed maintenance changes, protected paths, and prohibited patterns. (Note: currently stored as `agent-policy.json` at root).
* `quality-baseline.json`: The recorded existing technical debt in the project. Used to prevent baseline growth and ensure new violations fail.
* `task-contract.schema.json`: JSON schema defining the required structure for any task contract.
* `task-contract.example.json`: An example task contract.

## Task Contract Workflow
1. **Task-Contract-Only Commit:** A new task must begin with a commit that only adds a `task-contract.json` specifying the allowed file scope, bug to fix, and base commit.
2. **Human Review:** The contract is reviewed to ensure it adheres to the maintenance mode (no new features).
3. **Implementation:** The agent implements the task strictly within the allowed files.
4. **Tests:** Required tests defined in the contract are written and run.
5. **Documentation:** Documentation changes are made in a separate commit.
6. **Independent Acceptance Review:** Final validation of the entire task.

# Tasks: <Feature Name>

**Spec:** [spec.md](spec.md) (approval state and log live there)
**Plan:** [plan.md](plan.md)

States: `[ ]` open, `[x]` done (check passed), `[-]` skipped (reason required), `[!]` blocked, `[?]` needs decision. `[P]` marks a task that is safe to run in parallel with the other `[P]` tasks in its group.

## Group 1: Foundations

- [ ] **T001** <Task title>
  - Files: `path/a.ts`, `path/a.test.ts`
  - Covers: FR-001
  - Depends on: none
  - Verify: `<command or test name>`

## Group 2: <Name>

- [ ] **T002** [P] <Task title>
  - Files: `path/b.ts`
  - Covers: FR-002
  - Depends on: T001
  - Verify: `<command or test name>`

- [ ] **T003** [P] <Task title>
  - Files: `path/c.ts`
  - Covers: FR-003
  - Depends on: T001
  - Verify: `<command or test name>`

## Coverage check

| Requirement | Tasks |
|-------------|-------|
| FR-001 | T001 |
| FR-002 | T002 |
| FR-003 | T003 |

- Requirements without a task: <none>
- Tasks without a requirement: <none>
- Plan files not touched by any task: <none>

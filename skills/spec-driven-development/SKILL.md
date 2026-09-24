---
name: Spec-Driven Development
description: Approve a spec, plan, and tasks before code
disable-model-invocation: true
mode: true
icon: list-checks
color: blue
---

# Spec-Driven Development

The spec is the source of truth, not the prompt. A prompt is temporary and narrow. A spec survives across sessions, contributors, tools, and reviews. Work flows through reviewed documents in order (spec, plan, tasks), then code written against them, with a human gate between each.

## Operating contract

These hold in every phase.

1. **Name the phase.** Start every reply with `Phase: <name>` and, when stopping, `Gate: <what needs approval>`.
2. **Gates stop the turn.** At a gate, put the full gate summary in the final message of the turn, not a pointer to earlier text, and end the turn. A gate passes only through its approval channel from [settings.md](settings.md): an explicit "approved", "yes", or "go" in chat by default, or an approving review on the spec PR. Feedback means revise and present again.
3. **State lives in one field.** The `Status` in `spec.md` is the feature's only state. Change it only as the Status lifecycle below says, and add a dated line to the spec's `Log` each time. A new session trusts this field, not memory.
4. **No code before tasks approval.** Production code and tests are written only once the status is `Tasks approved` or later. Reading code, running commands, and throwaway spikes that answer a question are allowed earlier. The Skip track is the only exception.
5. **Never resolve ambiguity silently.** Mark it `[NEEDS CLARIFICATION: <question>]` and run a clarify round (see Phase 3). Any phase may run one.
6. **Approved artifacts are gated.** Changing this feature's approved spec, plan, or tasks list reopens its gate: roll the status back per the lifecycle table. These edits don't reopen a gate: task and Definition of done state marks, ticket IDs, `Log` and `Clarifications` entries, typos, and fixed links.
7. **Spec-anchored.** Approved behavior changes reach the spec through rule 6 before the code changes, and the spec ships in the same PR as the code. A stale spec misleads the next agent more than no spec.
8. **Stay in scope.** Every change traces to a task, and every task traces to a requirement. Anything else is scope creep. Propose it as a spec change instead.
9. **Contradictions stop the line.** If implementation shows that the spec or plan is wrong, stop. Mark the task `[?]`, propose the edit, and reopen the owning gate per rule 6. Do not work around it.
10. **External writes need confirmation.** Creating or commenting on tickets, and opening PRs, wait for the user's go-ahead.

## Status lifecycle

| Status | Set when | Resume goes to |
|--------|----------|----------------|
| `Draft` | Spec created, or reopened by a spec edit | Clarify, then Gate 1 |
| `Spec approved` | Gate 1 passes (Full) | Plan, then Gate 2 |
| `Plan approved` | Gate 2 passes, or reopened by a tasks edit (Full) | Tasks, then Gate 3 |
| `Tasks approved` | Gate 3 passes (Full), or Gate 1 passes (Lite) | Implement at the first open task, or Verify when none remain |
| `In progress` | First task starts, or Gate 4 feedback needs code changes | Implement at the first open task, or Verify when none remain |
| `Delivery pending` | Verify finishes and Gate 4 is presented | Re-present Gate 4 |
| `Implemented` | Gate 4 passes | Done. Not resumed |

Reopening (rule 6): a spec edit sets `Draft`. A plan edit sets `Spec approved`. A tasks edit sets `Plan approved`. On Lite, any edit sets `Draft`. Revise the artifacts in place. Reset to `[ ]` every task whose requirements, files, or plan section changed, and list the reset tasks at the gate.

Brownfield baselines use their own statuses, `Baseline draft` and `Baseline`, and are never resumed directly. `Superseded` marks an earlier spec whose behavior a later feature fully replaced (see Phase 7).

## Artifacts

```text
specs/
  constitution.md            # Project-wide principles every spec must respect
  <feature-id>/
    spec.md                  # What and why. Requirements, scope, acceptance criteria. Holds Status and Log
    plan.md                  # How. Approach, decisions, file map, test strategy
    tasks.md                 # In what steps. Ordered, verifiable, traced to requirements
```

- **Feature ID.** Prefer the ticket key plus a slug (`ENG-1234-account-lockout`), using the per-tracker shapes in [tickets.md](tickets.md). Without a ticket, use the next sequential number (`004-account-lockout`). Check both the local `specs/` folder and the default branch on the remote to avoid collisions.
- **Existing frameworks.** If the repo already uses Spec Kit (`.specify/`), Kiro (`.kiro/specs/`), or SpecDD (`*.sdd`), store artifacts where that framework does. Keep this skill's phases, gates, status lifecycle, requirement IDs, and task states. Link existing ADRs from the spec's `Decisions already made` section. Say which framework you detected.
- **Templates.** Copy from [templates/](templates/) and fill them in. Delete any section with no material content rather than writing "N/A".

**Lite track layout.** A single `spec.md` holds `## Plan` and `## Tasks` sections. The Plan section is the plan, including its file map. The Tasks section uses the same task format, states, and coverage check as [templates/tasks.md](templates/tasks.md). Everywhere this skill says `plan.md` or `tasks.md`, Lite uses those sections.

## Resume

Run this before Phase 0 on every invocation.

1. Pick the feature. Use the one the user named. Otherwise use the only spec whose status is not `Implemented`, `Superseded`, `Baseline draft`, or `Baseline`. If there are several, ask. If the user describes new work, start at Phase 0. If there are none and the message does not describe work, run Empty start and stop.
2. If the spec's `Amends` field names a baseline with status `Baseline draft`, re-present the baseline review gate from [brownfield.md](brownfield.md).
3. Otherwise go where the lifecycle table says. If the pending gate uses `pull-request` approval, check the PR first. In Implement, any `[?]` task blocks until resolved. Report `[!]` tasks before continuing.
4. Report the feature, the status, and what is pending, then continue.

## Empty start

Run this only when Resume found nothing to continue and the invoking message does not describe work. A description names an outcome, a change, or a ticket. The command on its own, a greeting, or "help" does not.

Ask what to build: the outcome in one or two sentences, and a ticket link or key if they have one. Then end the turn. Do not scan the repo, pick a track, draft a spec, or fill in the six spec questions.

The reply that supplies that description is the request. Start at Phase 0. A message that already describes the work skips Empty start.

## Phase 0: Size gate

Do a quick scan first: search for the code the request touches and count the likely files and areas. Then pick a track.

| Track | Use when | Gates |
|-------|----------|-------|
| **Skip** | Mechanical or low-risk change. Reviewable in under 5 minutes. Throwaway prototype. Exploratory spike. | None. No spec. Implement directly, still in this mode. |
| **Lite** | 1-3 files in one area. Clear intent. Cheap to reverse. | Gate 1 (spec, plan, and tasks together), Gate 4 |
| **Full** | 4+ files, multiple sessions, cross-service or cross-repo, public API or schema change, security or compliance impact, or expensive to reverse. | Gates 1, 2, 3, 4 |

The test: if the agent reading the requirements differently from the author would be costly, write the spec. If a quick follow-up prompt would fix it, skip.

State the track and the one-line reason at the top of the reply. For Lite and Full, record it in the spec's `Track` field and continue into Orient and Specify in the same turn. The user can override the track at Gate 1. For Skip, stop and confirm before changing code.

## Phase 1: Orient

1. **Constitution.** Read `specs/constitution.md` and its `Workflow settings` ([settings.md](settings.md)).
   - **Full track:** the constitution must exist with status `Ratified` before Specify. If it is missing or `Draft`, draft it from [templates/constitution.md](templates/constitution.md), seeded from `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, and the repo's CI config. Present it at a **Constitution gate**, and set it to `Ratified` on approval.
   - **Lite track:** use the constitution if one exists. Otherwise fall back to `AGENTS.md` and the rules, with default settings.
2. If the request references a ticket (Linear, Jira, Notion, GitHub, Azure DevOps, or another tracker), pull it per [tickets.md](tickets.md).
3. Extend the Phase 0 scan into an impact scan. Find existing patterns to reuse, likely touched files, related prior specs under `specs/`, and ripple effects. This stops the spec from duplicating existing code or fighting established conventions.
4. **Living specs.** If an existing `Baseline` or `Implemented` spec already defines behavior this change touches, list it in the new spec's `Amends` field and write a `Delta from <spec>` section for it (see [brownfield.md](brownfield.md) for the format).
5. **Brownfield.** On Full track, if the change must preserve existing behavior that no spec covers, run [brownfield.md](brownfield.md) before Specify. On Lite, list the behavior that must not change in the spec's `Must not` section instead.

## Phase 2: Specify

Create `spec.md` from [templates/spec.md](templates/spec.md) with status `Draft`. It answers **what** and **why**, not how. Keep technology choices out unless they are decisions already made.

A complete spec answers six questions. Any left open, the agent will answer on its own.

1. **Outcomes.** Observable end states, not feature names. "A user can sign in and stay signed in across refreshes", not "build auth".
2. **Scope.** In scope and explicitly out of scope. The out-of-scope list prevents agents from adding what similar systems usually include.
3. **Constraints and assumptions.** Stack, limits, performance, compatibility. Anything that affects implementation and is not obvious from the codebase.
4. **Decisions already made.** Schema, library, protocol, UX choices that are settled. Agents that don't know a decision exists will make their own.
5. **Requirements.** Numbered `FR-001`, `NFR-001`. Each is testable, one idea per line, and has a single canonical home.
6. **Acceptance criteria.** Given/When/Then scenarios per requirement, including edge cases and error paths. These become tests.

Requirement quality bar:

- Good: `FR-003: After 5 consecutive failed sign-ins, the account is locked for 15 minutes.`
- Bad: `The system should robustly handle all authentication edge cases.`
- `Must not` entries prevent plausible mistakes. Don't restate the inverse of a `Must`.

On Full track, run the `spec-critic` subagent before Clarify (optional on Lite), using the model from the `Critic model` setting. Give it the spec path, the constitution path, and the impact scan summary. Fold in the findings that change behavior, tests, security, or architecture.

## Phase 3: Clarify

Resolve every `[NEEDS CLARIFICATION]` marker and every critic finding before the gate.

Classify each open question first:

- **Observable fact.** The answer comes from reading code, running a command, or a short spike (current behavior, performance, what a library supports). Find it yourself. Don't ask the human.
- **Product or preference decision.** Only the user or a stakeholder can decide (scope, UX, policy, trade-off appetite). Ask it.

Ask at most 5 questions per round with the AskQuestion tool. Offer concrete options and put your recommendation first. Record each answer in the spec's `Clarifications` section with the date, and update the affected requirements in place.

**Lite track.** After Clarify, append `## Plan` and `## Tasks` to `spec.md` following Phases 4 and 5 (short form), and run the coverage check.

**Gate 1: Spec approval.** Present the outcomes, requirement count, out-of-scope list, recorded decisions, and remaining risks. On Lite, also present the plan, tasks, and coverage result, and offer ticket export. On approval, set status `Spec approved` (Full) or `Tasks approved` (Lite).

## Phase 4: Plan

Write `plan.md` from [templates/plan.md](templates/plan.md). It answers **how**.

- **Constitution check.** List each principle the plan touches and how it complies. A violation needs an explicit, justified exception or a spec change.
- **Data shape first.** Name the core types, schema, state, and API contracts before describing logic.
- **Approach and alternatives.** For a novel or contested decision, compare 2-3 options in a short table and state why you chose one. For routine work, state the approach and move on.
- **File map.** Every file to create, modify, or test, and what changes in each. This is the implementation's modification boundary.
- **Test strategy.** Which acceptance criteria become which tests, at which level (unit, integration, contract, e2e).
- **Risks and rollout.** Migration, feature flag, backward compatibility, and rollback, where relevant.
- **Definition of done.** Concrete checks: tests pass, lint and typecheck clean, specific manual verification.

Match the repo's existing patterns. A plan that introduces a new pattern must say why the existing one doesn't fit.

**Gate 2: Plan approval.** Present the approach, key decisions, file map, and risks. On approval, set status `Plan approved`.

## Phase 5: Tasks

Write `tasks.md` from [templates/tasks.md](templates/tasks.md).

- Each task is the smallest unit that ends in its own check. It names its files, the requirements it covers (`FR-00x`), its dependencies, and its verification step.
- Order tasks so that foundations (types, schema, shared components) come first and each later task builds on verified work.
- Mark a task `[P]` (parallel-safe) only when its file set is disjoint from every other task that could run at the same time. Shared writes run in sequence.
- Tests for a behavior come in the same task as the behavior, or directly before it.
- Brownfield characterization tests are the first task group (`Covers: BL-00x`), so current behavior is pinned before anything changes.

Run the coverage check and record the result in `tasks.md`:

- Every requirement maps to at least one task. A gap means missing work.
- Every task maps to at least one requirement. An orphan task means scope creep, or a missing requirement that belongs in the spec.
- Every file in the plan's file map is touched by some task, and no task touches a file outside the map.

**Gate 3: Tasks approval.** Present the task list, parallel groups, and coverage result, and offer ticket export per [tickets.md](tickets.md). On approval, set status `Tasks approved`.

## Phase 6: Implement

Set status `In progress` when the first task starts. Work one task at a time, or a small related group, in order.

1. Re-read the task, its requirements, and the relevant acceptance criteria.
2. Write the test first when the project has a test suite. Watch it fail for the right reason.
3. Make the smallest change that satisfies the task, inside the file map.
4. Run the task's verification step. Mark it `[x]` only after the check passes.
5. If the code can't satisfy the approved spec or plan as written, stop per rule 9.

Task states: `[ ]` open, `[x]` done (check passed), `[-]` skipped (reason required), `[!]` blocked, `[?]` needs a decision.

**Parallel tasks.** For a `[P]` group, delegate each task to a subagent, in an isolated worktree when available. Give each one the spec, plan, and tasks paths, its exact file set, and its verification step. Subagents must not edit anything under `specs/`. The parent reviews each diff, merges it, and ticks the task. Merge the whole group before starting the next.

## Phase 7: Verify

The implementing agent is biased toward its own output. An independent pass does the final check.

1. Run the project's full verification sequence (tests, lint, typecheck, build) as defined by its CI config or scripts.
2. Dispatch the `spec-verifier` subagent, using the model from the `Verifier model` setting. Give it the spec, plan, and tasks paths, every spec listed in `Amends`, and the diff scope (branch or files).
3. Fix every `not met` item, violation, and regression, then verify again. Spec drift is a `not met` finding. Resolve it by fixing the code, or by reopening the spec per rule 6. Never by quietly editing the spec. For each `unverifiable` item, add the missing check, or carry it to Gate 4 as a stated gap.
4. Tick each Definition of done item in the plan that passed (rule 6 exempts this). Carry any unticked item to Gate 4 as a gap. Set status `Delivery pending`.

**Gate 4: Delivery.** Present:

- A requirement coverage table: requirement, task, test or evidence, verdict.
- Checks run and their results.
- Deviations from the original request, and the rule 9 decisions that approved them.
- Unverifiable gaps, remaining risks, and follow-ups.

If the feedback needs code changes within the approved spec, reset the affected tasks to `[ ]`, set status `In progress`, and return to Implement and then Verify. If it changes behavior, reopen per rule 6.

On approval:

1. Apply each approved delta to the spec it amends, so every living spec describes current behavior. This doesn't change the amended spec's status, except that a feature spec whose behavior was fully replaced becomes `Superseded`.
2. Set status `Implemented`. Open the PR per the team's workflow, or mark the existing spec PR ready for review. If a ticket is linked, include the tracker's PR-linking reference from [tickets.md](tickets.md) when the PR is created. Then post the ticket sync from [tickets.md](tickets.md) if a ticket is linked. The specs ship in the same PR as the code.

## Anti-patterns

- **Over-engineering the spec.** Refining the spec should always cost less than fixing a misunderstanding in code. When that flips, stop polishing and build.
- **One giant spec.** Prefer a narrow spec per feature or area of change. Large specs rot and overflow context.
- **Plan mode as a substitute.** An in-chat plan with no file on disk and no gate is not SDD. The artifacts must persist.
- **Duplicating the constitution.** Don't restate project-wide rules in each spec. Reference them.

## Plugin components

- `spec-critic` subagent reads a draft spec cold and finds ambiguity before Gate 1. Read-only.
- `spec-verifier` subagent checks the implementation against the spec, requirement by requirement, in Phase 7. It runs checks but does not edit files.
- An optional hook enforces rule 4 and the file map when `Enforce gates: on` (see [settings.md](settings.md)). If it denies an edit, follow its message: finish the current gate, or propose a plan change. Never route the edit through the shell or a subagent to get around it.

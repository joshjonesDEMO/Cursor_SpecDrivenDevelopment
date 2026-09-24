# Spec: <Feature Name>

**ID:** <NNN-feature-slug>
**Status:** Draft | Spec approved | Plan approved | Tasks approved | In progress | Delivery pending | Implemented | Superseded | Baseline draft | Baseline
**Track:** Lite | Full
**Created:** YYYY-MM-DD
**Owner:** <name>
**Source:** <ticket URL or "conversation">
**Amends:** <paths of existing Baseline or Implemented specs whose behavior this changes, if any>

## Problem

<Why this change exists. The current behavior or gap, who it affects, and the evidence. Two to five sentences.>

## Outcomes

When this is done:

- <Observable end state from the user's or caller's point of view>
- <...>

## Scope

**In scope**

- <...>

**Out of scope**

- <Things a reasonable implementer might add but must not. E.g. "OAuth login", "password reset flow">

<!-- One section per spec listed in Amends. Delete if Amends is empty. -->
## Delta from <amended spec ID>

- **Added:** FR-00x ...
- **Changed:** <amended ID> becomes FR-00y ...
- **Removed:** <amended ID>, because ...
- **Unchanged (must not regress):** <amended IDs>

## Constraints and assumptions

- <Stack, performance budget, compatibility, rate limits, data volume>
- <Assumption, marked as such, with how it was or will be confirmed>

## Decisions already made

- <Decision and short rationale. E.g. "Sessions use the existing Redis store, not JWTs">

## Requirements

### Functional

- **FR-001:** <One testable statement>
- **FR-002:** <...>

### Non-functional

- **NFR-001:** <Performance, security, accessibility, observability requirement with a measurable threshold>

### Must not

- <Plausible wrong behavior this feature must avoid. Not the inverse of an FR.>

## Acceptance criteria

### FR-001: <short name>

```gherkin
Scenario: <happy path>
  Given <state>
  When <action>
  Then <observable result>

Scenario: <edge or error case>
  Given <state>
  When <action>
  Then <observable result>
```

### FR-002: <short name>

<...>

## Open questions

- [NEEDS CLARIFICATION: <question>]

## Clarifications

<!-- Filled in during Clarify. One entry per resolved question. -->

- YYYY-MM-DD. Q: <question> A: <answer>. Affects: FR-00x.

## Log

<!-- The feature's only log. One dated line per status change, reopened gate, blocked task, or decision. -->

- YYYY-MM-DD. Status: Draft. Spec created.

<!--
LITE TRACK ONLY: replace this comment with these two sections instead of creating plan.md and tasks.md.

## Plan
Short form of templates/plan.md: data shape, approach, test strategy, definition of done, and this file map.

### File map

| File | Change | Covers |
|------|--------|--------|
| `path/to/file.ts` | Modify. <what changes> | FR-001 |

## Tasks
Same format, states, and coverage check as templates/tasks.md.
-->

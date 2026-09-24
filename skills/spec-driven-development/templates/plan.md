# Plan: <Feature Name>

**Spec:** [spec.md](spec.md) (approval state lives in its Status field)
**Created:** YYYY-MM-DD

## Summary

<Two to four sentences: the approach and why it satisfies the spec.>

## Constitution check

| Principle | How this plan complies |
|-----------|------------------------|
| P1 <name> | <...> |

Exceptions: <none, or the principle, the justification, and who approved it>

## Data shape

<Core types, schema changes, state, events, and API contracts. Name them before any logic.>

```ts
// e.g.
type LoginAttempt = { userId: UserId; at: Date; succeeded: boolean };
```

## Approach

<How the pieces fit together. Reference existing modules and patterns being reused.>

### Alternatives considered

<!-- Only for novel or contested decisions. Delete for routine work. -->

| Option | Pros | Cons | Chosen |
|--------|------|------|--------|
| A | | | Yes |
| B | | | |

## File map

This is the modification boundary for implementation. Changes outside it need a plan update.

| File | Change | Covers |
|------|--------|--------|
| `src/auth/lockout.ts` | Create. Lockout counter and window | FR-003 |
| `src/auth/lockout.test.ts` | Create. Tests for lockout scenarios | FR-003 |
| `src/auth/login.ts` | Modify. Check lockout before verifying password | FR-003 |

## Test strategy

| Acceptance criterion | Test | Level |
|----------------------|------|-------|
| FR-003 lockout after 5 failures | `lockout.test.ts: locks on 6th attempt` | unit |

## Risks and rollout

- <Migration, feature flag, backward compatibility, rollback plan, observability>

## Definition of done

- [ ] All tasks in [tasks.md](tasks.md) are `[x]` or `[-]` with a reason
- [ ] `<project verification command>` passes clean
- [ ] `spec-verifier` reports every requirement `met`, or `unverifiable` with the gap stated at Gate 4
- [ ] `spec-verifier` reports no spec drift
- [ ] <feature-specific manual check>

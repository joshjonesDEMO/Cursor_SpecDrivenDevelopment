# Brownfield: spec existing behavior before changing it

Use this on Full track when a change must preserve existing behavior that no spec covers. The goal is a baseline spec that describes what the code does today, so the change spec can list what is added, changed, removed, and unchanged.

Spec the area of change, not the whole system. Coverage grows one change at a time. If a `Baseline` spec already covers the area, skip extraction: list it in `Amends` and write the delta (step 8).

## Steps

1. **Anchor the feature first.** Create the feature's `spec.md` with status `Draft` and list the baseline path you are about to create in `Amends`. Resume uses this link to find a pending baseline review.
2. **Bound the area.** Name the entry points (routes, commands, exported functions, UI screens) and the files behind them that the change will touch. Stop at the first stable boundary (a module interface, a service API, a queue).
3. **Start from visible artifacts.** Read in this order: public interfaces and their callers, existing tests, types and schema, then the implementation. Tests and callers show intended behavior. The implementation shows actual behavior.
4. **Draft a baseline spec.** Use [templates/spec.md](templates/spec.md) with status `Baseline draft`, in its own folder named `<area>-baseline`. Write requirements as current behavior, using the prefix `BL-` (`BL-001`) so they never collide with the change spec's `FR-` IDs. Cite the source for each one (`src/auth/login.ts:42`, `login.test.ts: rejects empty password`).
5. **Label every uncertainty.** Tag each requirement with one of:
   - `[observed]`: confirmed by an existing test or by running it.
   - `[inferred]`: read from code, not exercised.
   - `[suspect]`: looks like a bug or accident, not intent.
6. **Don't enshrine bugs.** Put `[suspect]` items in Open questions, not in Requirements. Old bugs and accidental behavior must not become contracts by default.
7. **Gate: baseline review.** Present the baseline with the uncertainty counts. The user confirms which `[suspect]` items are intended and which `[inferred]` items matter. On approval, set the baseline's status to `Baseline`.
8. **Write the change spec.** Continue with Specify on the feature spec from step 1, including a `Delta from <baseline ID>` section (the template has the format). The `Unchanged` list gives the verifier explicit regression targets.
9. **Plan characterization tests.** For each `[inferred]` item the user marked as important, the plan's file map gets a test file and the tasks list gets a task in the first group, with `Covers: BL-00x`. The test pins current behavior. When it passes, retag the item `[observed]` in the baseline.

## After the change ships

After Gate 4 approval, apply the delta to the baseline in the same PR: add the new behavior, rewrite changed items, and delete removed ones. The baseline keeps status `Baseline` and stays the current-state spec for that area. The next change in the area starts from it instead of re-extracting.

## Prompt starter

```text
Draft a baseline spec for <area> that describes what it does today.
Tag each requirement [observed], [inferred], or [suspect] with a source citation.
Do not change code.
```

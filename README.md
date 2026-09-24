# Spec-Driven Development for Cursor

A Cursor plugin that adds a spec-driven development mode. Invoke it with `/spec-driven-development`. The agent then moves a feature through reviewed documents before it writes code, and verifies the result against them afterwards.

```text
Size gate -> Orient -> Specify -> Clarify -> [Gate 1: spec]
          -> Plan -> [Gate 2: plan] -> Tasks -> [Gate 3: tasks]
          -> Implement (one task at a time) -> Verify -> [Gate 4: delivery]
```

That is the Full track. The Lite track puts the plan and tasks inside `spec.md` and approves all three at Gate 1. The Skip track is for changes too small to need a spec.

Artifacts are plain markdown in your repo, versioned with the code:

```text
specs/
  constitution.md              # project principles and workflow settings
  ENG-1234-account-lockout/
    spec.md                    # what and why; holds the feature's Status
    plan.md                    # how
    tasks.md                   # in what steps
```

## Install

macOS and Linux:

```bash
git clone https://github.com/joshjonesDEMO/Cursor_SpecDrivenDevelopment ~/.cursor/plugins/local/spec-driven-development
```

Windows (PowerShell):

```powershell
git clone https://github.com/joshjonesDEMO/Cursor_SpecDrivenDevelopment "$env:USERPROFILE\.cursor\plugins\local\spec-driven-development"
```

Then restart Cursor. Teams can instead add the repo to their plugin marketplace. The optional gate-enforcement hook needs Node 18 or newer on the `PATH`.

## Usage

```text
/spec-driven-development Add account lockout after repeated failed logins. ENG-1234
```

The agent recommends a track, drafts the spec, and asks only the questions it can't answer from the code. It stops at each gate for approval. Approvals are recorded in the spec's `Status` field, so running the command again in a later session resumes where the work left off.

For existing code without specs, the agent can first extract a baseline spec describing current behavior, so that the change can say exactly what it adds, changes, and must not break.

## Settings

Each repo configures the workflow in the `## Workflow settings` section of `specs/constitution.md`. These are the defaults:

```markdown
- Enforce gates: off
- Spec approval: chat
- Plan approval: chat
- Tasks approval: chat
- Critic model: ask
- Verifier model: ask
```

- **`Enforce gates: on`** turns on a hook that blocks the agent's code edits until the tasks are approved, and edits outside the approved file map after that. It catches an agent that forgets the gates. It doesn't replace reviewing the spec's log.
- **`pull-request @handle`** on any of the three approval settings makes that gate wait for an approving GitHub review from the named people on a draft PR, instead of approval in chat.
- **`ask`** for a model means the agent asks which model to use the first time it runs that subagent.

See [settings.md](skills/spec-driven-development/settings.md) for the details and limits.

## What's included

| Component | Purpose |
|-----------|---------|
| `skills/spec-driven-development` | The mode: phase rules, status lifecycle, gates, tracks |
| `.../templates/` | Constitution, spec, plan, and tasks templates |
| `.../brownfield.md` | Baseline spec extraction for existing code |
| `.../tickets.md` | Ticket intake from Linear, Jira, or GitHub, and task export |
| `.../settings.md` | Per-repo workflow settings |
| `agents/spec-critic.md` | Reviews a draft spec cold before approval |
| `agents/spec-verifier.md` | Verifies the implementation against the spec, requirement by requirement |
| `hooks/` | Optional gate enforcement (off by default) |

## Development

```bash
npm test
```

## Sources

The workflow draws on [SpecDD](https://specdd.ai/), [GitHub Spec Kit](https://github.com/github/spec-kit), the [DataCamp SDD tutorial](https://www.datacamp.com/tutorial/spec-driven-development-with-claude-code), [IBM's SDD overview](https://www.ibm.com/think/topics/spec-driven-development), and [Augment Code's SDD guide](https://www.augmentcode.com/guides/what-is-spec-driven-development).

## License

MIT

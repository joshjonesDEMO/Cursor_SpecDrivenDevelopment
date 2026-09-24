# Spec-Driven Development

A Cursor plugin that adds a spec-driven development mode. Invoke it with `/spec-driven-development`, and the agent moves a feature through reviewed documents before writing code:

```text
Size gate -> Orient -> Specify -> Clarify -> [Gate 1: spec]
          -> Plan -> [Gate 2: plan] -> Tasks -> [Gate 3: tasks]
          -> Implement (one task at a time) -> Verify -> [Gate 4: delivery]
```

That is the Full track. The Lite track puts the plan and tasks inside `spec.md` and approves all three at Gate 1.

Artifacts are plain markdown in the repo, versioned with the code:

```text
specs/
  constitution.md
  001-user-login/
    spec.md    # what and why
    plan.md    # how
    tasks.md   # in what steps
```

## What's included

| Component | Purpose |
|-----------|---------|
| `skills/spec-driven-development` | The mode. Phase rules, gates, size tracks (Skip, Lite, Full), anti-patterns |
| `.../templates/` | Constitution, spec, plan, and tasks templates |
| `.../brownfield.md` | Extract a baseline spec from existing code before changing it |
| `.../tickets.md` | Pull a Linear, Jira, or GitHub ticket into a spec, and export tasks back |
| `agents/spec-critic` | Reads a draft spec cold and finds ambiguity before approval |
| `agents/spec-verifier` | Checks the implementation against the spec, requirement by requirement |

## Usage

```text
/spec-driven-development Add account lockout after repeated failed logins. ENG-1234
```

The agent recommends a track (Skip, Lite, or Full), drafts the spec, asks only the questions it can't answer from the code, and stops at each gate for approval. Approvals are recorded as statuses in the artifacts, so in a later session the same command resumes at the pending gate or the first open task.

## Install

Local: place this folder in `~/.cursor/plugins/local/spec-driven-development` and restart Cursor.

Team: push this repo to GitHub and add it to your team's plugin marketplace.

## Sources

The workflow draws on [SpecDD](https://specdd.ai/), [GitHub Spec Kit](https://github.com/github/spec-kit), the [DataCamp SDD tutorial](https://www.datacamp.com/tutorial/spec-driven-development-with-claude-code), [IBM's SDD overview](https://www.ibm.com/think/topics/spec-driven-development), and [Augment Code's SDD guide](https://www.augmentcode.com/guides/what-is-spec-driven-development).

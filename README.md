# Spec-Driven Development for Cursor

A Cursor mode that turns a feature request into an approved spec, plan, and task list before any code is written, then checks the finished work against that spec.

The spec lives in your repo next to the code, so it carries over between sessions, teammates, and reviews.

## How it works

```mermaid
flowchart TD
  start(["/spec-driven-development or mode"]) --> resume{"Resume<br/>read Status in spec.md"}
  resume -->|"active spec"| cont["Continue where Status points<br/>check PR approval if pending"]
  resume -->|"no request"| empty["Ask what to build, end turn"]
  resume -->|"new request"| size{"Phase 0: size gate"}

  size -->|"Skip: small, low-risk"| skip["Confirm in chat, then implement<br/>no spec, no gates, hook not bound"]
  size -->|"Lite or Full"| orient

  subgraph zone1["Hook stage 1 · Status Draft to Plan approved · edits outside specs/ denied"]
    orient["Phase 1: Orient<br/>constitution gate on Full · ticket · impact scan"]
    specify["Phase 2: Specify<br/>Status: Draft · chat binds to feature"]
    criticRun["spec-critic review · Full"]
    clarify["Phase 3: Clarify"]
    g1lite{{"Gate 1 Lite: spec + plan + tasks<br/>chat or PR @handle"}}
    g1{{"Gate 1: spec<br/>chat or PR @handle"}}
    plan["Phase 4: Plan · file map"]
    g2{{"Gate 2: plan<br/>chat or PR @handle"}}
    tasks["Phase 5: Tasks · coverage check"]
    g3{{"Gate 3: tasks<br/>chat or PR @handle"}}
  end

  subgraph zone2["Hook stage 2 · Status Tasks approved to Delivery pending · edits outside the file map denied"]
    implement["Phase 6: Implement<br/>Status: In progress"]
    verify["Phase 7: Verify<br/>full checks + spec-verifier"]
    g4{{"Gate 4: delivery<br/>chat only"}}
  end

  orient --> specify
  specify -->|"Full"| criticRun --> clarify
  specify -->|"Lite"| clarify
  clarify -->|"Lite"| g1lite
  clarify -->|"Full"| g1
  g1 -->|"Status: Spec approved"| plan --> g2
  g2 -->|"Status: Plan approved"| tasks --> g3
  g1lite -->|"Status: Tasks approved"| implement
  g3 -->|"Status: Tasks approved"| implement
  implement --> verify
  verify -->|"Status: Delivery pending"| g4
  g4 -->|"Status: Implemented"| done(["Hook releases the chat<br/>PR with specs + code · ticket sync"])

  implement -.->|"spec or plan is wrong"| reopen["Reopen owning gate<br/>Status rolls back"]
  reopen -.-> clarify
  g4 -.->|"code changes needed"| implement
```

The hook stages apply only with `Enforce gates: on` (see [Settings](#settings)).

The agent picks a track based on the size of the change, and you can override it:

| Track | For | Approvals |
|-------|-----|-----------|
| Skip | Small, low-risk changes | A quick confirm, no spec |
| Lite | 1-3 files in one area | Spec, plan, and tasks together, then delivery |
| Full | 4+ files, API or schema changes, security-sensitive work | Spec, plan, tasks, and delivery separately |

Before asking you anything, the agent checks the code for answers, so its questions are the product decisions only you can make. On larger changes, a separate reviewer agent checks the spec for gaps before you approve it. On every change with a spec, a verifier agent checks the finished code against each requirement.

## Install

macOS and Linux:

```bash
git clone https://github.com/joshjonesDEMO/Cursor_SpecDrivenDevelopment ~/.cursor/plugins/local/spec-driven-development
```

Windows (PowerShell):

```powershell
git clone https://github.com/joshjonesDEMO/Cursor_SpecDrivenDevelopment "$env:USERPROFILE\.cursor\plugins\local\spec-driven-development"
```

Restart Cursor. **Spec-Driven Development** is then available as a custom mode and as a command. Teams can also add this repo to their plugin marketplace.

## Use

Switch to the custom mode, or start with the command:

```text
/spec-driven-development Add account lockout after repeated failed logins. ENG-1234
```

You can also run `/spec-driven-development` on its own. If nothing is already in progress, the agent asks what to build before it starts. Include a ticket link or key when you have one.

Approvals are saved in the spec, so running the command again in a new chat picks up where you left off.

## What gets written

```text
specs/
  constitution.md              # project principles and workflow settings
  ENG-1234-account-lockout/
    spec.md                    # what and why, plus the feature's status
    plan.md                    # how
    tasks.md                   # the steps, each with its own check
```

For existing code with no spec, the agent can first write down what the code does today, so the change can list what it adds, changes, and must keep working.

## Settings

Each repo can adjust the workflow in `specs/constitution.md`. These are the defaults:

```markdown
- Enforce gates: off
- Spec approval: chat
- Plan approval: chat
- Tasks approval: chat
- Critic model: ask
- Verifier model: ask
- Tracker: auto
```

- **Enforce gates: on** adds a hook that blocks the agent's file edits before the tasks are approved, and edits outside the approved plan after that. It's a safety net for a skipped step. It doesn't cover shell commands, or the subagents that build parallel tasks, and reviewing the spec's log is still the real check. It needs Node 18 or newer.
- **pull-request @handle** on an approval setting sends that approval to a GitHub reviewer, such as a product manager or architect, on a draft PR.
- **ask** on a model setting means the agent asks which model to use for the reviewer and verifier.
- **Tracker** sets the ticket system, or `auto` detects it from the ticket link.

Full details: [settings.md](skills/spec-driven-development/settings.md).

## Ticket integrations

Share a ticket link or key and the agent drafts the spec from it. After approval, it can also create tasks back in your tracker and link the PR.

There are built-in instructions for **Linear**, **Jira Cloud**, **Notion**, **GitHub Issues**, and **Azure DevOps**. They work once that tracker's MCP server is connected in Cursor. Jira, GitHub, and Azure DevOps also work through their CLIs. Other trackers (including self-hosted Jira) work through their MCP server, CLI, or API, and pasted ticket text works anywhere.

If the tracker isn't connected yet, the agent offers to install its Cursor plugin and sign you in, then carries on. Azure DevOps has no Cursor plugin, so the agent explains the manual setup instead. Details: [tickets.md](skills/spec-driven-development/tickets.md).

## What's included

| Component | Purpose |
|-----------|---------|
| `skills/spec-driven-development/` | The mode, templates, and guides for settings, tickets, and existing code |
| `agents/spec-critic.md` | Reviews a draft spec for gaps |
| `agents/spec-verifier.md` | Checks the build against the spec |
| `hooks/` | Optional gate enforcement, off by default |

How the pieces connect, where state lives, and how approvals flow:

```mermaid
flowchart TB
  subgraph plugin["Plugin repo · registered by .cursor-plugin/plugin.json"]
    direction LR
    skill["skills/spec-driven-development/<br/>SKILL.md: mode + command<br/>settings · tickets · brownfield · templates"]
    critic["agents/spec-critic.md<br/>read-only spec review"]
    verifier["agents/spec-verifier.md<br/>checks build against spec"]
    hook["hooks/enforce-gates.mjs<br/>preToolUse on Write | Delete<br/>off unless Enforce gates: on"]
  end

  subgraph approvals["Approval channels"]
    direction LR
    chat["Chat<br/>developer says approved, yes, or go<br/>default for Gates 1–3, always Gate 4"]
    prReview["GitHub draft PR<br/>only listed @handles count<br/>Gates 1–3 when set to pull-request"]
  end

  tracker["Tracker<br/>Linear · Jira · Notion · GitHub · Azure DevOps<br/>via MCP or CLI"]
  bindings[("OS temp dir<br/>cursor-sdd-gates/*.json<br/>chat-to-feature bindings")]

  subgraph repo["Your repo"]
    direction LR
    constitution["specs/constitution.md<br/>Workflow settings: Enforce gates,<br/>approval channels, models, Tracker"]
    feature["specs/feature-id/<br/>spec.md: Status + Log, the only state<br/>plan.md: file map · tasks.md: task states"]
    code["Source code"]
  end

  skill -->|"ticket intake and export"| tracker
  skill -->|"presents gate, ends turn"| chat
  skill -->|"pushes artifacts, requests review"| prReview
  skill -->|"writes from templates"| feature
  chat -->|"agent sets next Status"| feature
  prReview -->|"approval checked on Resume"| feature

  critic -.->|"reads"| feature
  verifier -.->|"reads, runs checks"| code

  hook <-->|"bind and release"| bindings
  hook -.->|"reads settings"| constitution
  hook -.->|"reads Status and file map"| feature
  hook ==>|"allow or deny agent edit"| code
```

Run the hook's tests with `npm test`.

## License

MIT

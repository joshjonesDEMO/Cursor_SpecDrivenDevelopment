# Workflow settings

Settings always live in the `## Workflow settings` section of `specs/constitution.md`, one `- Key: value` line each, even when feature artifacts follow another framework's layout. When there is no constitution (Lite work in a repo without one), every setting takes its default.

| Setting | Values | Default |
|---------|--------|---------|
| `Enforce gates` | `on`, `off` | `off` |
| `Spec approval` | `chat`, `pull-request @handle[, @handle]` | `chat` |
| `Plan approval` | same as above | `chat` |
| `Tasks approval` | same as above | `chat` |
| `Critic model` | `ask`, `inherit`, or a model name | `ask` |
| `Verifier model` | `ask`, `inherit`, or a model name | `ask` |

`Spec approval` covers Gate 1, `Plan approval` covers Gate 2, and `Tasks approval` covers Gate 3. On Lite, Gate 1 uses `Spec approval`. Gate 4 is always a chat gate. Its approval opens the delivery PR, or marks the existing spec PR ready for review.

Changing only this section is a settings change. Bump the constitution's patch version and log it, but it doesn't need principle review.

## Approval channels

**`chat`.** The developer approves in the conversation with an explicit "approved", "yes", or "go".

**`pull-request @handle`.** For stakeholders who review in GitHub rather than in Cursor, such as a product manager approving the spec or an architect approving the plan. Only approvals from the listed GitHub handles count. The approver can't be the PR author, because GitHub doesn't allow self-approval. A solo developer should use `chat`.

1. **Branch.** Use the current branch unless it is the default branch. In that case create `spec/<feature-id>`.
2. **Push.** Commit the gated artifacts, together with the spec `Log` line for the gate, in one commit, and push. The setting is the team's standing go-ahead for this push and the draft PR, so rule 10 doesn't need a separate confirmation.
3. **Request review.** Pass handles without the `@`, and teams as `org/team`.
   - At the first PR gate, run `gh pr create --draft --title "Spec: <feature name>" --body "<body>" --reviewer <handles>`.
   - At later gates, run `gh pr edit <url> --add-reviewer <handles>`.
   - Put the pending gate and links to the artifacts in the PR body. Record the PR URL in the spec's `Log`.
   - If `gh` is unavailable, use the GitHub MCP. If neither works, stop and tell the user.
4. **End the turn.** The gate is pending until someone approves on GitHub.
5. **Check approval** (on Resume or when the user asks):
   - Run `git fetch origin <branch>` first. Reviewers can push suggestion commits.
   - `A=$(git log -1 --format=%H origin/<branch> -- <artifact paths>)` is the last commit that changed the gated artifacts.
   - Expand each `org/team` handle to its members with `gh api --paginate orgs/<org>/teams/<team>/members --jq '.[].login'`. This needs the `read:org` scope. If it fails, stop and tell the user rather than reporting the gate as pending.
   - `gh pr view <url> --json reviews` lists the reviews. Match `author.login` against the handles (with the `@` stripped) and team members. Take each person's latest review.
   - The gate passes when at least one of those is `APPROVED` on a commit `C` (`commit.oid`) where `git merge-base --is-ancestor $A C` succeeds, and none is `CHANGES_REQUESTED`.
   - Requested changes count as feedback. Run `git pull --ff-only`, revise, push, and wait again.

Each gate is checked until it passes and never again. So the status and `Log` commits made after it passes don't matter. Later gates and the implementation continue on the same branch.

## Enforce gates

When `on`, the plugin's hook enforces rule 4 and the file map. A conversation is bound to a feature as soon as it edits a file under `specs/<feature-id>/` whose spec is active. After that, the hook:

- **Denies** edits outside `specs/` while the spec status is `Draft`, `Spec approved`, or `Plan approved`.
- **Denies** edits outside the plan's file map while the status is `Tasks approved`, `In progress`, or `Delivery pending`. The fix is a plan change, which reopens Gate 2.
- **Denies** agent edits that turn `Enforce gates` off. People change that setting themselves in the editor.
- **Releases** the conversation once the status is `Implemented` or `Superseded`.

When a deny gets in the way:

- **Throwaway spikes** go in the OS temp directory, outside the workspace.
- **Unrelated work** goes in a new chat. The hook only restricts chats that edited a spec.
- **A stuck state** means a person sets `Enforce gates: off` in the editor.

Limits:

- It checks the status on disk, so it catches an agent that forgets the gates, not one that edits its own status. Human review of the spec `Log` is still the control.
- It covers the agent's file edit tools. Shell commands that write files and subagents (which run as separate conversations) are not covered.
- It only understands the default `specs/<feature-id>/` layout, and only the workspace root that contains `specs/constitution.md`.
- It needs `node` 18 or newer on the `PATH`. Any error lets the edit through rather than blocking it.

## Subagent models

When a setting is `ask`, ask the user with AskQuestion the first time that subagent is dispatched for a feature. Offer `inherit` (the current chat model) and the models available to you. For the critic, suggest a strong reasoning model, because errors in the spec propagate everywhere. For the verifier, a fast model is enough, because it checks specific criteria against specific output.

Record the answer in the spec's `Log` and reuse it for the rest of the feature. Offer to save it into the constitution as a settings change.

A named model that isn't available to the current user falls back to `inherit`. Say so when it happens.

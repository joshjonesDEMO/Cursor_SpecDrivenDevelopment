# Ticket intake and export

The tracker holds planning, priority, and status. The spec folder holds behavior. Link the two, and don't copy requirements back and forth.

Jump to: [Linear](#linear) · [Jira](#jira) · [Notion](#notion) · [GitHub Issues](#github-issues) · [Azure DevOps](#azure-devops) · [Other trackers](#other-trackers)

## Pick the tracker

1. **A full URL decides.** Match it against the table below.
2. **A bare key** (`ENG-123`, `#123`) uses the `Tracker` setting from [settings.md](settings.md).
   - With `auto`, check which integrations are connected.
   - `ABC-123` fits Linear, Jira, and Notion unique IDs. Ask if more than one is connected, or which tracker it belongs to if none is.
3. **`Tracker: none`** means no tracker calls. Work from pasted ticket text, and export copy-ready markdown.

| Tracker | URL shape | ID shape | Feature ID |
|---------|-----------|----------|------------|
| Linear | `linear.app/<workspace>/issue/ENG-123/...` | `ENG-123` | `ENG-123-<slug>` |
| Jira Cloud | `<site>.atlassian.net/browse/PROJ-123` | `PROJ-123` | `PROJ-123-<slug>` |
| Notion | `notion.so/...`. The ticket is the `p=` query value when present, else the trailing 32 hex characters | page ID, or the database's unique ID property (`TASK-42`) | unique ID if present, else next number |
| GitHub Issues | `github.com/<owner>/<repo>/issues/123` | `#123`, `owner/repo#123` | `GH-123-<slug>` |
| Azure DevOps | `dev.azure.com/<org>/<project>/_workitems/edit/123` or `<org>.visualstudio.com/<project>/_workitems/edit/123` | `123`, `AB#123` | `ADO-123-<slug>` |

Self-hosted Jira (Server or Data Center) isn't covered by Atlassian's cloud MCP server or `acli`. Use [Other trackers](#other-trackers).

## Connect

Check the connection before any tracker call, and fix only what is missing. Skip this for ticket work when `Tracker: none`.

1. **Connected.** A connected MCP server for the tracker, or its CLI installed and signed in, counts. Continue with that tracker's section below.
2. **Installed, not signed in.** If the MCP server reports that it needs authentication, tell the user which tracker needs a sign-in and why, then call that server's `mcp_auth` tool. If the CLI is installed but signed out, ask the user to run its login command in their terminal (for example `gh auth login`). Retry once it succeeds.
3. **Not installed.** Tell the user which plugin is needed and for what, then call `install_plugin` with the slug from the table below. It opens Cursor's install confirm and waits for the user. After it installs, sign in per step 2 if the server asks.
4. **No plugin, cancelled, or failed.** Give the manual route from the table. For ticket intake, also offer to work from pasted ticket text. For export, offer copy-ready task text. Don't offer the same install or sign-in again in this conversation unless the user asks.

`install_plugin` and `mcp_auth` are Cursor agent tools, and may only appear in a dynamically listed tool namespace. If you can't find them, go straight to step 4. Never ask for a token in chat.

| Tracker | Cursor plugin | Manual route |
|---------|---------------|--------------|
| Linear | `linear` | Add Linear's hosted MCP server (`https://mcp.linear.app/mcp`) in Cursor's MCP settings |
| Jira Cloud | `atlassian` | Add Atlassian's Rovo MCP server in Cursor's MCP settings, or use the Atlassian CLI (`acli`) |
| Notion | `notion-workspace` | Add Notion's hosted MCP server in Cursor's MCP settings |
| GitHub Issues | `github` | `gh auth login` |
| Azure DevOps | None | Add Microsoft's Azure DevOps MCP server in Cursor's MCP settings, or install the `az` CLI with the `azure-devops` extension and run `az login` |
| Self-hosted Jira, others | See [Other trackers](#other-trackers) | Pasted ticket text, per [Other trackers](#other-trackers) item 6 |

Each tracker section lists the usual MCP tools, plus a CLI fallback where one exists. Tool names change between server versions, so read the connected server's tool list and schemas before calling anything.

Never guess IDs, project keys, team names, or account IDs. Read them from the ticket or a lookup call, or ask.

## Intake (Phase 1)

1. Fetch the ticket: title, description, acceptance criteria, labels, parent and linked items, attachments, and comments.
2. Map it into the spec:
   - Title and description go to `Problem` and `Outcomes`.
   - Acceptance criteria go to draft `Requirements` and `Acceptance criteria`, rewritten into testable form with the same meaning.
   - "Not doing" notes go to `Out of scope`.
   - Anything vague or contradictory becomes a `[NEEDS CLARIFICATION]` marker.
3. Set the spec's `Source:` to the ticket URL, and note the ticket's type or hierarchy level (epic, story, task) for export.
4. The ticket is input. Once the spec is approved, the spec wins where they differ. Tell the user about any differences so the ticket can be updated.

## Export (at tasks approval, only when asked)

Offered at Gate 3 on Full track and Gate 1 on Lite. Create tickets only after that gate passes. Ask which shape the team wants:

- **One ticket per task.** For teams that track every unit of work.
- **One ticket per task group.** For teams that track milestones.
- **Checklist on the source ticket.** The lightest option.

For each new ticket:

- Title: `<T00x> <task title>`
- Body: a link to `specs/<feature>/tasks.md`, the requirements it covers, its files, and its verification step.
- Type and parent: follow the tracker section below. Child types depend on the source ticket's level.
- Write the new ticket ID onto the task line: `- [ ] **T002** ... (ENG-1234)`.

If a PR already exists (the `pull-request` approval channel opens one at Gate 1), appending the new tickets' closing references to its body is part of the same confirmed export write. Read the current body with `gh pr view <url> --json body --jq .body`, add the references, and write the whole body back with `gh pr edit <url> --body-file -`, so the existing text is kept.

## PR linking and status sync

- **When the PR is created, or when tickets are exported while a PR already exists,** include the source ticket's reference and every exported child's reference, using the tracker's closing convention below, so the tickets link and close on merge.
- **Where the tracker has no closing convention,** list the child tickets at Gate 4 and offer to close them.
- **After Gate 4,** post a short comment on the source ticket with the PR link, the requirement coverage table, and any differences from the original ticket.

## Confirmation

Every tracker write (creating tickets, commenting, changing status) is an external action. Show exactly what will be written and wait for a yes first.

---

## Linear

- **MCP:** Linear's hosted server (`https://mcp.linear.app/mcp`). The usual tools are `get_issue`, `list_issues`, `list_comments`, `create_comment`, `list_teams`, and either `create_issue` / `update_issue` or `save_issue` (one tool for both; omit `id` to create). There is no official CLI.
- **Fields:** the description is markdown. Acceptance criteria usually sit in the description under a heading or checklist. Read `state`, `labels`, `project`, `cycle`, and `parent`.
- **Children:** create sub-issues by setting `parentId` to the source issue. `team` is required, so use the source issue's team.
- **PR linking:** `Fixes ENG-123` in the PR description closes the issue on merge. Using the issue's `gitBranchName` as the branch also links it.

## Jira

- **MCP:** Atlassian's Rovo MCP server (Jira Cloud). The usual tools are `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, `addCommentToJiraIssue` (or `addOrEditJiraIssueComment`), `createIssueLink`, `getTransitionsForJiraIssue`, and `transitionJiraIssue`. Most calls need a `cloudId`; get it from `getAccessibleAtlassianResources`.
- **CLI fallback:** Atlassian CLI (`acli jira workitem view PROJ-123`). Check `acli jira workitem --help` for create and comment.
- **Fields:** ask for markdown responses where the tool supports it, because the raw description is Atlassian Document Format. Acceptance criteria are often a custom field. Fetch with `fields: ["*all"]`, or check `getJiraIssueTypeMetaWithFields`.
- **Children by level:**
  - Under an Epic, create Stories or Tasks with `parent` set to the epic.
  - Under a Story, Task, or Bug, create Sub-tasks.
  - Under a Sub-task, create Tasks linked with "relates to", because sub-tasks can't have children.
  - Type names vary (`Sub-task`, `Subtask`, custom types), so list them with `getJiraProjectIssueTypesMetadata`. Check required fields with `getJiraIssueTypeMetaWithFields` before creating.
- **Links:** for directional link types, read `getIssueLinkTypes` and check the direction on one link before creating more.
- **PR linking:** include the key in the branch name, a commit message, or the PR title. Jira shows the PR on the issue. Closing happens through the team's workflow automation or a transition, not the PR text, so offer the transition at Gate 4.

## Notion

- **MCP:** Notion's MCP server. The usual tools are `notion-fetch` (a page or database by URL or ID), `notion-search`, `notion-query-data-sources`, `notion-create-pages`, `notion-update-page`, and `notion-create-comment`. There is no official CLI.
- **Shape:** a ticket is a page in a database. Properties vary by workspace (`Status`, `Assignee`, `Sprint`, `Priority`), and the page body holds the description. Acceptance criteria may be a property or a section in the body.
- **Children:** fetch the database to get its data source ID and property schema, then create task pages in the same data source. If the database has sub-items or a relation such as `Parent item`, set it to the source page. Otherwise add a link to the source page in the body.
- **Status:** use the database's own status options. Read them from the schema, never guess.
- **PR linking:** if the database has a unique ID property and the GitHub integration's pull request property, put `Fixes TASK-42` in the PR description. That links the PR, and the integration can update the task's status on merge. Otherwise paste the PR URL into the page.

## GitHub Issues

- **CLI:** `gh issue view 123 --json title,body,labels,comments,url`, `gh issue create --title ... --body ...` (prints the new issue's URL), and `gh issue comment 123 --body ...`.
- **MCP:** GitHub's server. The usual tools are `issue_read`, `issue_write`, `add_issue_comment`, `search_issues`, and `sub_issue_write`.
- **Fields:** the body is markdown. Acceptance criteria are usually a section or checklist in the body. Issue forms may add structured sections.
- **Children:** use sub-issues through `sub_issue_write`, or `gh api repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<id>`. `<id>` is the child's numeric REST id from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`, not its number and not the `id` from `gh issue view`. Where sub-issues aren't enabled, add a task list of links to the parent.
- **PR linking:** `Closes #123` closes the issue when the PR merges into the default branch. Use `Closes owner/repo#123` for an issue in another repo.

## Azure DevOps

- **MCP:** Microsoft's Azure DevOps MCP server. The local server has `wit_get_work_item`, `wit_create_work_item`, `wit_update_work_item`, `wit_add_child_work_items`, `wit_add_work_item_comment`, and `wit_link_work_item_to_pull_request`. The hosted server groups these under tools like `wit_work_item` and `wit_work_item_write` with an `action` parameter.
- **CLI fallback:** `az boards work-item show --id 123`, `az boards work-item create --type Task --title ... --project ...`, `az boards work-item relation add --id <child> --relation-type parent --target-id 123`, and `az boards work-item update --id 123 --discussion "..."` for comments. This needs the `azure-devops` extension and `az devops configure --defaults organization=... project=...`.
- **Fields:** `System.Title`, `System.Description` (HTML), `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.State`, and `System.WorkItemType`.
- **Children by level:**
  - Under an Epic or Feature, create the process's story type: `User Story` (Agile), `Product Backlog Item` (Scrum), `Requirement` (CMMI), or `Issue` (Basic).
  - Under a story-level item, create `Task` items.
  - Read the process's types with `wit_get_work_item_type`, or from the source item, rather than assuming.
- **PR linking:** Azure Repos PRs link directly (`wit_link_work_item_to_pull_request`), and can complete linked items on merge. For GitHub repos connected to Azure Boards, `Fixes AB#123` in the PR description links the item and moves it to done on merge.

## Other trackers

For Shortcut, Asana, ClickUp, YouTrack, GitLab, Trello, Monday, Plane, ServiceNow, self-hosted Jira, and others:

1. **Connect** in this order: a connected MCP server, then the tracker's CLI if installed (for example `glab` for GitLab), then its REST API with a token the user already has in an environment variable. If none works, run [Connect](#connect) from step 2 with the tracker's name. `install_plugin` shows nothing when no plugin matches, so if nothing installs, use item 6 below. Self-hosted Jira must not use the `atlassian` plugin, which only reaches Jira Cloud. Never ask for a token in chat.
2. **Map** the tracker's fields to the intake fields: ID and URL, title, description, acceptance criteria, parent or children, and comments. Tell the user which field you used for acceptance criteria.
3. **Children:** use the tracker's native parent/child or subtask link if it has one. Otherwise link back to the source ticket in each new ticket's body.
4. **PR linking:** use the tracker's closing keyword if it has one (for example `Closes #123` in GitLab). Otherwise paste the PR URL into each ticket.
5. **Feature ID:** use the tracker's key if it has one (`sc-123`, `PROJ-123`). Otherwise use the next sequential number.
6. **No integration:** work from pasted ticket text, and hand back export tasks as copy-ready markdown.

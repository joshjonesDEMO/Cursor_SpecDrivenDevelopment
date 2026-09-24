# Ticket intake and export

The ticketing system tracks planning, prioritization, and cross-team status. The spec folder in the repo is the source of truth for behavior. Link the two and don't duplicate requirements between them.

## Find the integration

Integrations differ by team. Check in this order and use the first that works:

1. An MCP server for the tracker. Search the available tools for `linear`, `jira`, `atlassian`, or `github` and read the tool schema before calling it.
2. The `gh` CLI for GitHub issues (`gh issue view`, `gh issue create`).
3. None available. Ask the user to paste the ticket content, and offer copy-ready task text for export.

Never guess ticket IDs, project keys, or team IDs. Read them from the ticket or ask.

## Intake (Phase 1)

1. Fetch the ticket: title, description, acceptance criteria, labels, linked tickets, attachments, and comments.
2. Map the fields into the spec:
   - Title and description go to `Problem` and `Outcomes`.
   - Ticket acceptance criteria go to draft `Requirements` and `Acceptance criteria`. Rewrite them into testable form and keep the original meaning.
   - Explicit "not doing" notes go to `Out of scope`.
   - Anything vague or contradictory becomes a `[NEEDS CLARIFICATION]` marker, not a guess.
3. Set `Source:` in the spec header to the ticket URL.
4. Treat the ticket as input, not authority. Where the spec and the ticket disagree after Clarify, the approved spec wins. Note the divergence for the user so the ticket can be updated.

## Export (at tasks approval, only when requested)

Offered at Gate 3 on Full track and Gate 1 on Lite. Create tickets only after that gate passes.

Ask which granularity the team wants before creating anything:

- **One ticket per task.** For teams that track every unit of work.
- **One ticket per task group.** For teams that track milestones.
- **Checklist on the source ticket.** Lightest option. Adds the task list as a comment or checklist.

For each created ticket:

- Title: `<T00x> <task title>`
- Body: a link to `specs/<feature>/tasks.md`, the requirements covered, the files, and the verification step.
- Link it to the source ticket as a sub-issue or with "relates to".
- Write the created ticket ID back onto the task line in `tasks.md` (`- [ ] **T002** ... (ENG-1234)`).

## Status sync (after Gate 4)

Post a short comment on the source ticket with a link to the PR, the requirement coverage table, and any deviations from the original ticket.

## Confirmation

Every tracker write (creating tickets, commenting, changing status) is an external action. Show exactly what you will write and wait for confirmation first.

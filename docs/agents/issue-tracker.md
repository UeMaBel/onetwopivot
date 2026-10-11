# Issue Tracker

This repository tracks work in local Markdown files under `.scratch/`.

## Conventions

- Keep one feature per `.scratch/<feature-slug>/` directory.
- Keep the feature spec at `.scratch/<feature-slug>/spec.md` when the work has a spec.
- Store each implementation ticket in its own file under `.scratch/<feature-slug>/issues/`.
- Number tickets from `01` in dependency order. Use each ticket's **Blocked by** field to name its prerequisite ticket numbers and titles.
- Include a `Status:` line near the top of each ticket. Use `ready-for-agent` when the ticket is fully specified and ready for agent work.
- Append comments and conversation history under a `## Comments` heading.

## Ticket operations

- To publish tickets, create the feature directory and one Markdown file per ticket.
- To fetch a ticket, read the file identified by its path or number.

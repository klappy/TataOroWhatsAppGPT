# ADR 011: Folder-Based Issue Lifecycle

## Status

✅ Accepted

## Context

Codex CLI and human workflows benefit from clear issue maturity stages.

## Decision

We use a structured folder lifecycle:

- `01-new/`: vague intake
- `02-planned/`: ready to implement
- `03-qa/`: awaiting testing + validation
- `04-documentation/`: awaiting doc updates
- `05-closed/`: complete and archived

## Consequences

- Codex CLI can act more intelligently
- Contributors understand what to pick up
- No special configuration needed — all convention-based

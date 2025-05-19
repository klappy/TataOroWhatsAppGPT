# ADR 008: Embrace Convention Over Configuration

## Status

✅ Accepted

## Context

To reduce complexity, improve team velocity, and align with Codex CLI capabilities, we aim to minimize explicit configuration and instead rely on predictable conventions across:

- Folder structure (e.g., `docs/issues`, `docs/decisions`, `shared/`)
- File naming (e.g., `issue-*.md`, `FEATURE_*.md`, `ADR_*.md`)
- KV key structure (`CHAT_HISTORY:<phone>`)
- R2 pathing (`whatsapp:+<phone>/<timestamp>-<filename>.jpg`)
- Message flow control via prompt + filename consistency

## Decision

We formally adopt a **convention over configuration** strategy across the entire codebase and documentation framework.

This includes:

- Clearly documented naming, folder, and key conventions
- Avoiding per-feature config files unless absolutely required
- Using predictable, composable logic (e.g., `getSafeSession()`, path prefixes)

## Consequences

- Easier for Codex CLI to interpret and operate on the repo
- Simplifies developer onboarding and coordination
- Reduces chance of silent failures due to misconfiguration
- Some use cases may require workarounds instead of custom config

## Implementation Examples

- Codex pulls from `docs/issues/` and `docs/architecture/` without a config file
- WhatsApp image uploads are automatically retrievable from R2 based on prefix
- Summary logic doesn’t rely on flags, but presence of expected files/data

## Related Principles

- Antifragile design (e.g., fallback defaults, stateless summaries)
- Deterministic behavior from folder layout alone

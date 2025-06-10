## 🧭 Project Structure

- `docs/issues/open/`: Markdown files describing open development issues

## 🚧 Issue Resolution Workflow

Outstanding development issues are stored as Markdown files under:

```
docs/issues/open/
```

Each file describes a single issue using standard headings like `## Description`, `## Acceptance Criteria`, etc.

Codex CLI should:

1. Read all open issues from `docs/issues/open/`
2. For each issue:
   - Review related documentation in `docs/`
   - Locate and update relevant code files (typically under `src/`)
   - Implement the requested behavior (e.g., `twlService.js`)
   - Update documentation as described (e.g., `TWL_Integration_Documentation.md`)
   - Increment the version number in `package.json`
   - Prepend a new entry to `CHANGELOG.md`
   - Commit the changes with a meaningful commit message (e.g., `feat: migrate TW integration to TWL`)
   - Move the issue file to `docs/issues/closed/` and add `Resolved: true` metadata to the top

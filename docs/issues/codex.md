# 🧠 Codex Workflow: Issue Folder Lifecycle

This project uses a structured folder system to manage the lifecycle of Codex-compatible tasks and issues. Each issue progresses through the following stages:

---

## 📂 `01-new/` – Idea Intake (Rough + Vague)

- Place raw, incomplete, or loosely defined issues here
- Each issue should include user description or observed behavior
- Use Codex or manual review to **vet, clarify, and reframe** as a proper spec
- Once a clear issue has been generated and documented → move to `02-planned/`
- Prepend the filename with an incremented version number using semver

---

## 📂 `02-planned/` – Ready for Implementation

- These issues are well-defined and approved for execution
- Codex CLI or developers can pick up tasks from here and **implement them**
- Be sure to:
  - Consult all related docs in `/docs/`
  - Apply antifragile practices and architectural alignment
  - Follow patterns from `/docs/architecture/` and `/docs/decisions/`

---

## 📂 `03-qa/` – Implementation Complete, Needs Testing

- Issue has been implemented but needs:

  - Automated or manual tests
  - Thorough code and feature review
  - Cross-feature regression check to ensure nothing else was broken

- Do **not** close the issue yet — move to `04-documentation` only after validation

---

## 📂 `04-documentation/` – Documentation Review

- Ensure:

  - All related docs (architecture, decisions, features, issues) are updated
  - Markdown specs reflect the final state of the feature
  - Nothing conflicts with other decisions or constraints

- Once docs are updated and verified → move to `05-closed/`

---

## 📂 `05-closed/` – Completed & Documented

- Final resting place for issues that:
  - Have been implemented
  - Passed QA
  - Are fully documented
  - Did not regress or break related functionality

---

## ✅ Best Practices

- Always refer to `/docs/architecture/` and `/docs/decisions/` before planning or building
- Prefer antifragile patterns (see: `antifragile-integrations.md`)
- Each folder acts as a queue — process oldest issues first when possible

# 🧠 Codex CLI Migration Plan Execution Prompt

You are the automated assistant responsible for applying VIBE plan migrations to the Tata Oro Assistant codebase.

## 🗂️ Directory Structure

The VIBE plans are stored in:

```
vibe/plans/
├── pending/        # Plans to be applied
│   ├── v1.2.0.md
│   └── v1.2.1.md
├── success/        # Plans that have already been applied
```

Each `.md` file in `pending/` contains specific instructions for changes to the project.

---

## ✅ Your Job

For **each `.md` file** in `vibe_plans/pending/`:

1. **Read the prompt inside the plan file.**
2. **Follow the instructions** — then update all relevant project files:
   - `README.md`
   - `ARCHITECTURE.md`
   - `VIBE_CHECK.md`
   - `CHANGELOG.md`
   - Any other `.md` or config file specified in the prompt.
3. **Check your vibe.**
   - Read the prompt inside of ./vibe/VIBE_CHECK.md
   - Follow the instructions to ensure you pass your own vibe check.
   - Report findings and ask user to review before moving to stage/commit.
4. **Stage and commit all changes**.
   - Commit message must match the **version string** (e.g., `v1.2.0`) found in the filename and/or `CHANGELOG.md`.
5. **Move the plan file** from `pending/` to `success/`.

Repeat until all plans in `pending/` are complete.

---

## 🛑 Rules

- Do not skip any pending files.
- Do not guess edits not explicitly required.
- Do not edit `success/` files.
- Always update the `CHANGELOG.md` with what was changed, if not already included in the plan.

---

## 📦 Example

If `vibe_plans/pending/v1.2.0.md` contains:

```markdown
# v1.2.0 – Add Document Sync Worker

- Create `workers/doc-sync/index.js`
- Update `wrangler.toml` with new env
- Add description in `ARCHITECTURE.md`
- Reflect version in `CHANGELOG.md`
```

You must:

- Implement `doc-sync` worker
- Add `env.docsync` block to `wrangler.toml`
- Edit `ARCHITECTURE.md`
- Add `## v1.2.0` entry in `CHANGELOG.md`
- Commit with message: `v1.2.0`
- Move the plan to `vibe_plans/success/v1.2.0.md`

---

## 🚀 Let’s Migrate

Begin processing files in `vibe_plans/pending/` in ascending version order. Complete one fully before moving on.

```
codex migrate
```

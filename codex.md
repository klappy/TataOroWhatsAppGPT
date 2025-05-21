# Codex Project Instructions

Welcome to the Tata Oro Assistant project. This guide provides Codex CLI with the necessary context to assist in development tasks.

## Project Structure

- `workers/`: Contains modular handler functions and the router.

  - `router.js`: central HTTP router
  - `whatsapp-incoming.js`: WhatsApp interactions
  - `doc-sync.js`: Document synchronization and embedding
  - `upload-hook.js`: Processes GitHub webhook events

- `shared/`: Houses reusable utilities and helper functions.

## Coding Standards

- Use ES6+ syntax.
- Prefer functional components over class-based ones.
- Maintain consistent naming conventions: kebab-case for filenames, camelCase for variables and functions.

## Deployment
- Use `wrangler deploy` to publish the router.
- Ensure all changes are committed before deployment.

## Testing

- Write unit tests for all new functions.
- Use Jest as the testing framework.

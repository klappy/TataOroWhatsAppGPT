# ADR 016: Router Worker Architecture

## Status

Accepted

## Context

Multiple Workers were previously deployed under different `[env.*]` blocks in `wrangler.toml`. This caused route shadowing and inconsistent deployments because GitHub only auto-published the default environment.

## Decision

Consolidate all HTTP routes into a single Worker (`workers/router.js`). The router imports pure handler functions from each module and dispatches based on the request path. Deployment uses a single `wrangler.toml` with KV and R2 bindings shared across handlers.

## Consequences

* Easier to reason about routes and deploys
* No more route conflicts between environments
* Modules remain testable and isolated as pure functions

## Date

2025-06-01

## Scope

All public routes under `wa.tataoro.com`

# PROJECT_LOG — path-router-lib

_Reconstructed 2026-08-02 from git history (no PROJECT_LOG existed prior to this pass) — this is a retroactive summary of commits, not a live session log going forward. Continue appending entries here after this point per the standing PROJECT_LOG convention._

## What this is

Shared library: mount matching, rewrites, host redirects, and a discovery payload — used by the 1507 path-based API routers (api-router, api-cloud-router) to dispatch requests to the right backend service.

## History (from git log)

- **2026-06-11** feat: mount matching, rewrites, host redirects, discovery payload
- **2026-06-11** ci: validate workflow — typecheck + vitest on Node 22
- **2026-06-11** docs: README — API reference, usage sketch, consumption + release notes
- **2026-06-11** fix: origin-pin backend rebase; collapse leading // in strip-prefix
- **2026-06-11** chore(release): v0.1.1
- **2026-06-22** ci: bump checkout/setup-node to v5 for Node 24 runtime 
- **2026-06-27** ci: adopt at-merge Cortex issue closer (caller workflow)
- **2026-06-27** ci: self-contained cortex-close (workflow_call blocked by org policy)
- **2026-06-27** ci: use SHA-pinned shared cortex-close workflow (coffer@da3d722)

## Current state

On `main`, tree clean as of 2026-08-02. See git log above for the latest shipped work.

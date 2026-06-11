# path-router-lib

Generic path-mount router primitives for Web-standard `fetch` handlers.

One routing/rewrite implementation, shared by every 1507 path-based router
(first consumer: `mcp-router` on `mcp.1507.cloud`; next: the `api.1507.systems`
router) so the routers cannot drift apart.

- **Web-standard only** — `URL`, `Request`, `Response`. No Cloudflare types,
  no framework, zero runtime dependencies. Works in Workers, Node ≥ 18, Deno,
  Bun, anything fetch-shaped.
- **Source-form TypeScript** — `exports` points at `src/index.ts`; consumers
  bundle it (wrangler/esbuild, vitest, tsx). No build artifacts to drift.

## Install

Consumed as a `github:` dependency pinned to an annotated release tag:

```json
{
  "dependencies": {
    "@1507-systems/path-router-lib": "github:1507-systems/path-router-lib#v0.1.0"
  }
}
```

Upgrades are a one-line PR in each consumer; `package-lock.json` records the
resolved commit and `npm ci` enforces it.

## API

```ts
import {
  resolveMount,
  buildBackendRequest,
  hostRedirect,
  discoveryPayload,
  applyRewrite,
  type MountDef,
  type MountMatch,
  type RewriteRule,
  type HostRedirectRule,
  type DiscoveryPayload,
  type DiscoveryMountEntry,
} from '@1507-systems/path-router-lib';
```

### `resolveMount(url, mounts)`

Match a URL against a mount table. Longest prefix wins; boundary-safe
(`/domain` matches `/domain` and `/domain/...`, never `/domainx`);
case-sensitive; query string preserved verbatim. Returns:

- `{ mount, backendPath }` — matched, rewritten (backendPath includes the query string)
- `{ mount, backendPath: null }` — matched, but the exact-map rewrite missed (caller should 404 without contacting the backend)
- `null` — no mount matched (including the root path `/`)

### Rewrite rules

```ts
type RewriteRule =
  | { kind: 'strip-prefix' }                            // /name/x → /x ; /name → /
  | { kind: 'exact-map'; map: Record<string, string> }; // suffix → backend path; miss → null
```

Use `exact-map` when a mount root must rewrite to a different backend path
(e.g. `/portal → /mcp`) without also letting `/portal/mcp` reach the same
endpoint — one canonical URL per endpoint.

### `buildBackendRequest(req, backendPath)`

The forwarding step: rebases the URL onto `backendPath` and preserves method,
**all** headers (`Authorization` pass-through happens here), body stream,
redirect mode, and abort signal. Adds nothing, strips nothing.

### `hostRedirect(url, method, rules)`

Permanent host-level redirects for legacy hostnames during migrations.
Returns a `Response` (301 for GET/HEAD, 308 — method-preserving — for
everything else, so redirected POST bodies are never rewritten to GET) or
`null` if no rule matches. Path and query are preserved under the rule's
`pathPrefix`.

### `discoveryPayload({ service, host, version?, mounts })`

Builds the constrained public payload for `GET /`:

```json
{
  "service": "mcp-router",
  "host": "mcp.1507.cloud",
  "version": "<GIT_SHA>",
  "mounts": [
    { "name": "domain", "path": "/domain", "mcp_endpoint": "/domain/mcp",
      "auth_hint": "bearer", "docs_url": "..." }
  ]
}
```

Per mount it publishes only `name` / `path` / `mcp_endpoint` / `auth_hint` /
`docs_url` (+ `canonical_url` when the mount has a canonical host elsewhere) —
never rewrite rules, service-binding names, or token formats.

## Usage sketch (a ~60-line worker)

```ts
const MOUNTS: MountDef[] = [
  { name: 'domain', prefix: '/domain', rewrite: { kind: 'strip-prefix' },
    authHint: 'bearer', mcpEndpoint: '/domain/mcp' },
  { name: 'portal', prefix: '/portal',
    rewrite: { kind: 'exact-map', map: { '': '/mcp', '/health': '/health' } },
    authHint: 'bearer', mcpEndpoint: '/portal' },
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    const redirect = hostRedirect(url, req.method, HOST_REDIRECTS);
    if (redirect) return redirect;

    if (url.pathname === '/' && req.method === 'GET') {
      return Response.json(discoveryPayload({
        service: 'mcp-router', host: 'mcp.1507.cloud',
        version: env.GIT_SHA, mounts: MOUNTS,
      }));
    }

    const hit = resolveMount(url, MOUNTS);
    if (!hit || hit.backendPath === null) return notFound(MOUNTS);
    return BINDINGS[hit.mount.name](env)
      .fetch(buildBackendRequest(req, hit.backendPath));
  },
};
```

## Development

```sh
npm ci
npm run typecheck   # tsc --noEmit
npm test            # vitest run (hermetic — no network)
```

CI (`validate.yml`) runs both on every PR and push to `main` (Node 22).

## Releases

Annotated git tags: `git tag -a v0.x.y -m "..." && git push origin v0.x.y`.
No registry publish, no deploy job — consumers pin tags.

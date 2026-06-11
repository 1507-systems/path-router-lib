import { applyRewrite, type RewriteRule } from './rewrite';

/**
 * A mounted backend on a path router. `prefix` must start with `/` and must
 * not end with `/` (e.g. `"/domain"`).
 *
 * The `authHint` / `docsUrl` / `mcpEndpoint` / `canonicalUrl` fields are
 * discovery metadata only — they never influence matching or rewriting and
 * are never sent to backends.
 */
export interface MountDef {
  /** Short mount name, e.g. `"domain"`. */
  name: string;
  /** URL path prefix, e.g. `"/domain"`. Boundary-safe, case-sensitive match. */
  prefix: string;
  /** How the matched path is rewritten into the backend path. */
  rewrite: RewriteRule;
  /** Discovery only: auth model name, e.g. `"bearer"` or `"bearer+oauth"`. */
  authHint: string;
  /** Discovery only: docs page for this mount. */
  docsUrl?: string;
  /** Discovery only: router-side MCP endpoint path, e.g. `"/domain/mcp"`. */
  mcpEndpoint?: string;
  /** Discovery only: canonical origin for clients that must bypass the router. */
  canonicalUrl?: string;
}

export interface MountMatch {
  mount: MountDef;
  /**
   * Backend path including the original query string, or `null` when the
   * mount matched but its rewrite rule produced no backend path (exact-map
   * miss — the caller should 404 without contacting the backend).
   */
  backendPath: string | null;
}

/**
 * Resolve a URL against a mount table.
 *
 * - Longest prefix wins, regardless of table order.
 * - Boundary-safe: `/domain` matches `/domain` and `/domain/...`, never
 *   `/domainx`.
 * - Case-sensitive.
 * - The query string is preserved verbatim on the rewritten backend path.
 *
 * Returns `null` when no mount matches (including the root path `/`).
 */
export function resolveMount(url: URL, mounts: MountDef[]): MountMatch | null {
  const path = url.pathname;
  let best: MountDef | null = null;
  for (const mount of mounts) {
    if (path !== mount.prefix && !path.startsWith(mount.prefix + '/')) continue;
    if (best === null || mount.prefix.length > best.prefix.length) best = mount;
  }
  if (best === null) return null;
  const suffix = path.slice(best.prefix.length); // "" or starts with "/"
  return {
    mount: best,
    backendPath: applyRewrite(best.rewrite, suffix, url.search),
  };
}

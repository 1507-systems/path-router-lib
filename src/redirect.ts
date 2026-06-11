/** Permanent host-level redirect (e.g. a legacy hostname during migration). */
export interface HostRedirectRule {
  /** Hostname to redirect away from, e.g. `"cfdomaincheck.mcp.1507.cloud"`. */
  fromHost: string;
  /** Target origin, no trailing slash, e.g. `"https://mcp.1507.cloud"`. */
  toOrigin: string;
  /** Path prefix prepended to the original path, e.g. `"/domain"`. */
  pathPrefix: string;
}

/**
 * Return a permanent-redirect `Response` when the URL's hostname matches a
 * rule, else `null`. The original path and query are preserved under the
 * rule's `pathPrefix`:
 *
 *   GET cfdomaincheck.../mcp?x=1 → Location: https://mcp.1507.cloud/domain/mcp?x=1
 *
 * Status is 301 for GET/HEAD and 308 (method-preserving permanent) for
 * everything else, so a redirected POST body — e.g. MCP JSON-RPC — can never
 * be rewritten to GET by an RFC-conformant client.
 */
export function hostRedirect(
  url: URL,
  method: string,
  rules: HostRedirectRule[],
): Response | null {
  for (const rule of rules) {
    if (url.hostname !== rule.fromHost) continue;
    const m = method.toUpperCase();
    const status = m === 'GET' || m === 'HEAD' ? 301 : 308;
    return new Response(null, {
      status,
      headers: {
        Location: rule.toOrigin + rule.pathPrefix + url.pathname + url.search,
      },
    });
  }
  return null;
}

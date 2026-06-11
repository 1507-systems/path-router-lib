import type { MountDef } from './match';

/** One mount entry in the public discovery payload. */
export interface DiscoveryMountEntry {
  name: string;
  path: string;
  mcp_endpoint?: string;
  auth_hint: string;
  docs_url?: string;
  canonical_url?: string;
}

/** The constrained public discovery payload served on `GET /`. */
export interface DiscoveryPayload {
  service: string;
  host: string;
  version?: string;
  mounts: DiscoveryMountEntry[];
}

/**
 * Build the constrained public discovery payload for `GET /`.
 *
 * Deliberately publishes nothing operational: no rewrite rules, no service
 * binding names, no token formats. Each mount is reduced to
 * `name` / `path` / `mcp_endpoint` / `auth_hint` / `docs_url`
 * (+ `canonical_url` where the mount has a canonical host elsewhere).
 */
export function discoveryPayload(opts: {
  service: string;
  host: string;
  /** Deployed build identifier, e.g. a GIT_SHA. Omitted when undefined. */
  version?: string;
  mounts: MountDef[];
}): DiscoveryPayload {
  return {
    service: opts.service,
    host: opts.host,
    ...(opts.version !== undefined ? { version: opts.version } : {}),
    mounts: opts.mounts.map((m) => ({
      name: m.name,
      path: m.prefix,
      ...(m.mcpEndpoint !== undefined ? { mcp_endpoint: m.mcpEndpoint } : {}),
      auth_hint: m.authHint,
      ...(m.docsUrl !== undefined ? { docs_url: m.docsUrl } : {}),
      ...(m.canonicalUrl !== undefined ? { canonical_url: m.canonicalUrl } : {}),
    })),
  };
}

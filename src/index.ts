// @1507-systems/path-router-lib — generic path-mount router primitives for
// Web-standard fetch handlers. No Cloudflare types, zero runtime deps.

export { resolveMount } from './match';
export type { MountDef, MountMatch } from './match';

export { applyRewrite } from './rewrite';
export type { RewriteRule } from './rewrite';

export { hostRedirect } from './redirect';
export type { HostRedirectRule } from './redirect';

export { buildBackendRequest } from './request';

export { discoveryPayload } from './discovery';
export type { DiscoveryMountEntry, DiscoveryPayload } from './discovery';

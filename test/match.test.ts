import { describe, expect, it } from 'vitest';
import { resolveMount, type MountDef } from '../src/index';

const strip = { kind: 'strip-prefix' } as const;

const mounts: MountDef[] = [
  { name: 'domain', prefix: '/domain', rewrite: strip, authHint: 'bearer' },
  {
    name: 'portal',
    prefix: '/portal',
    rewrite: { kind: 'exact-map', map: { '': '/mcp', '/health': '/health' } },
    authHint: 'bearer',
  },
  { name: 'memory', prefix: '/memory', rewrite: strip, authHint: 'bearer' },
];

const u = (path: string) => new URL(`https://mcp.example.com${path}`);

describe('resolveMount', () => {
  it('matches the exact mount root', () => {
    const hit = resolveMount(u('/domain'), mounts);
    expect(hit?.mount.name).toBe('domain');
    expect(hit?.backendPath).toBe('/');
  });

  it('matches a subpath', () => {
    const hit = resolveMount(u('/domain/mcp'), mounts);
    expect(hit?.mount.name).toBe('domain');
    expect(hit?.backendPath).toBe('/mcp');
  });

  it('matches deep subpaths', () => {
    expect(resolveMount(u('/domain/mcp/x/y'), mounts)?.backendPath).toBe('/mcp/x/y');
  });

  it('never emits a protocol-relative backendPath for // suffixes', () => {
    expect(resolveMount(u('/domain//evil.com/x'), mounts)?.backendPath).toBe(
      '/evil.com/x',
    );
    expect(resolveMount(u('/memory//attacker.tld/x'), mounts)?.backendPath).toBe(
      '/attacker.tld/x',
    );
    expect(resolveMount(u('/domain//mcp'), mounts)?.backendPath).toBe('/mcp');
    expect(resolveMount(u('/domain//evil.com/x?q=1'), mounts)?.backendPath).toBe(
      '/evil.com/x?q=1',
    );
  });

  it('is boundary-safe: /domainx does not match /domain', () => {
    expect(resolveMount(u('/domainx'), mounts)).toBeNull();
    expect(resolveMount(u('/domainx/mcp'), mounts)).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(resolveMount(u('/Domain'), mounts)).toBeNull();
    expect(resolveMount(u('/DOMAIN/mcp'), mounts)).toBeNull();
  });

  it('matches nothing at the root path /', () => {
    expect(resolveMount(u('/'), mounts)).toBeNull();
  });

  it('returns null for unknown mounts', () => {
    expect(resolveMount(u('/nope'), mounts)).toBeNull();
    expect(resolveMount(u('/nope/mcp'), mounts)).toBeNull();
  });

  it('treats a trailing slash on the mount root as the backend root', () => {
    expect(resolveMount(u('/domain/'), mounts)?.backendPath).toBe('/');
  });

  it('preserves the query string verbatim', () => {
    const hit = resolveMount(u('/memory/memory/search?q=x&y=%20z'), mounts);
    expect(hit?.mount.name).toBe('memory');
    expect(hit?.backendPath).toBe('/memory/search?q=x&y=%20z');
  });

  it('longest prefix wins, regardless of table order', () => {
    const a: MountDef = { name: 'a', prefix: '/a', rewrite: strip, authHint: 'bearer' };
    const ab: MountDef = { name: 'ab', prefix: '/a/b', rewrite: strip, authHint: 'bearer' };
    for (const table of [[a, ab], [ab, a]]) {
      const hit = resolveMount(u('/a/b/c'), table);
      expect(hit?.mount.name).toBe('ab');
      expect(hit?.backendPath).toBe('/c');
    }
    expect(resolveMount(u('/a/x'), [a, ab])?.mount.name).toBe('a');
  });

  it('returns the matched mount with backendPath null on an exact-map miss', () => {
    const hit = resolveMount(u('/portal/anything'), mounts);
    expect(hit?.mount.name).toBe('portal');
    expect(hit?.backendPath).toBeNull();
  });

  it('exact-map hits rewrite through the mount table', () => {
    expect(resolveMount(u('/portal'), mounts)?.backendPath).toBe('/mcp');
    expect(resolveMount(u('/portal/health'), mounts)?.backendPath).toBe('/health');
  });
});

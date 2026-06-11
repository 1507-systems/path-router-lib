import { describe, expect, it } from 'vitest';
import { discoveryPayload, type MountDef } from '../src/index';

const mounts: MountDef[] = [
  {
    name: 'domain',
    prefix: '/domain',
    rewrite: { kind: 'strip-prefix' },
    authHint: 'bearer',
    mcpEndpoint: '/domain/mcp',
    docsUrl: 'https://docs.example.com/domain',
  },
  {
    name: 'portal',
    prefix: '/portal',
    rewrite: { kind: 'exact-map', map: { '': '/mcp', '/health': '/health' } },
    authHint: 'bearer',
    mcpEndpoint: '/portal',
    docsUrl: 'https://docs.example.com/portal',
  },
  {
    name: 'memory',
    prefix: '/memory',
    rewrite: { kind: 'strip-prefix' },
    authHint: 'bearer',
    mcpEndpoint: '/memory/mcp',
    docsUrl: 'https://docs.example.com/memory',
    canonicalUrl: 'https://memory-sync.example.com',
  },
];

describe('discoveryPayload', () => {
  it('produces the constrained payload shape', () => {
    const payload = discoveryPayload({
      service: 'mcp-router',
      host: 'mcp.example.com',
      version: 'abc123',
      mounts,
    });
    expect(payload).toEqual({
      service: 'mcp-router',
      host: 'mcp.example.com',
      version: 'abc123',
      mounts: [
        {
          name: 'domain',
          path: '/domain',
          mcp_endpoint: '/domain/mcp',
          auth_hint: 'bearer',
          docs_url: 'https://docs.example.com/domain',
        },
        {
          name: 'portal',
          path: '/portal',
          mcp_endpoint: '/portal',
          auth_hint: 'bearer',
          docs_url: 'https://docs.example.com/portal',
        },
        {
          name: 'memory',
          path: '/memory',
          mcp_endpoint: '/memory/mcp',
          auth_hint: 'bearer',
          docs_url: 'https://docs.example.com/memory',
          canonical_url: 'https://memory-sync.example.com',
        },
      ],
    });
  });

  it('omits version when not provided', () => {
    const payload = discoveryPayload({ service: 's', host: 'h', mounts: [] });
    expect('version' in payload).toBe(false);
  });

  it('omits optional mount fields when absent', () => {
    const payload = discoveryPayload({
      service: 's',
      host: 'h',
      mounts: [
        { name: 'm', prefix: '/m', rewrite: { kind: 'strip-prefix' }, authHint: 'bearer' },
      ],
    });
    expect(payload.mounts[0]).toEqual({ name: 'm', path: '/m', auth_hint: 'bearer' });
  });

  it('publishes only the allowed keys — never rewrite rules or internals', () => {
    const payload = discoveryPayload({
      service: 'mcp-router',
      host: 'mcp.example.com',
      mounts,
    });
    const allowed = ['name', 'path', 'mcp_endpoint', 'auth_hint', 'docs_url', 'canonical_url'];
    for (const entry of payload.mounts) {
      for (const key of Object.keys(entry)) {
        expect(allowed).toContain(key);
      }
    }
    const body = JSON.stringify(payload);
    expect(body).not.toContain('rewrite');
    expect(body).not.toContain('strip-prefix');
    expect(body).not.toContain('exact-map');
    expect(body).not.toContain('prefix');
  });
});

import { describe, expect, it } from 'vitest';
import { hostRedirect, type HostRedirectRule } from '../src/index';

const rules: HostRedirectRule[] = [
  {
    fromHost: 'legacy.mcp.example.com',
    toOrigin: 'https://mcp.example.com',
    pathPrefix: '/domain',
  },
];

const u = (path: string, host = 'legacy.mcp.example.com') =>
  new URL(`https://${host}${path}`);

describe('hostRedirect', () => {
  it('301s GET, composing pathPrefix + path', () => {
    const res = hostRedirect(u('/'), 'GET', rules);
    expect(res?.status).toBe(301);
    expect(res?.headers.get('Location')).toBe('https://mcp.example.com/domain/');
  });

  it('301s HEAD', () => {
    const res = hostRedirect(u('/health'), 'HEAD', rules);
    expect(res?.status).toBe(301);
    expect(res?.headers.get('Location')).toBe('https://mcp.example.com/domain/health');
  });

  it.each(['POST', 'PUT', 'DELETE', 'PATCH'])(
    '308s %s (method-preserving permanent)',
    (method) => {
      const res = hostRedirect(u('/mcp'), method, rules);
      expect(res?.status).toBe(308);
      expect(res?.headers.get('Location')).toBe('https://mcp.example.com/domain/mcp');
    },
  );

  it('preserves the query string', () => {
    const res = hostRedirect(u('/mcp?session=abc&x=%201'), 'POST', rules);
    expect(res?.headers.get('Location')).toBe(
      'https://mcp.example.com/domain/mcp?session=abc&x=%201',
    );
  });

  it('normalizes lowercase methods', () => {
    expect(hostRedirect(u('/'), 'get', rules)?.status).toBe(301);
    expect(hostRedirect(u('/mcp'), 'post', rules)?.status).toBe(308);
  });

  it('returns null for non-matching hosts', () => {
    expect(hostRedirect(u('/mcp', 'mcp.example.com'), 'POST', rules)).toBeNull();
    expect(hostRedirect(u('/', 'other.example.com'), 'GET', rules)).toBeNull();
  });

  it('returns null when no rules are configured', () => {
    expect(hostRedirect(u('/mcp'), 'POST', [])).toBeNull();
  });
});

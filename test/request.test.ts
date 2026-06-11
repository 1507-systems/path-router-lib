import { describe, expect, it } from 'vitest';
import { buildBackendRequest } from '../src/index';

describe('buildBackendRequest', () => {
  it('rebases the URL onto the backend path (same origin)', () => {
    const req = new Request('https://mcp.example.com/domain/mcp');
    const out = buildBackendRequest(req, '/mcp');
    expect(out.url).toBe('https://mcp.example.com/mcp');
  });

  it('keeps the query string carried by backendPath', () => {
    const req = new Request('https://mcp.example.com/memory/memory/search?q=x');
    const out = buildBackendRequest(req, '/memory/search?q=x');
    expect(out.url).toBe('https://mcp.example.com/memory/search?q=x');
  });

  it('preserves method, ALL headers (Authorization pass-through), and body', async () => {
    const body = JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 });
    const req = new Request('https://mcp.example.com/domain/mcp', {
      method: 'POST',
      headers: {
        authorization: 'Bearer xyz',
        'content-type': 'application/json',
        'x-custom': 'kept',
      },
      body,
    });
    const out = buildBackendRequest(req, '/mcp');
    expect(out.method).toBe('POST');
    expect(out.headers.get('authorization')).toBe('Bearer xyz');
    expect(out.headers.get('content-type')).toBe('application/json');
    expect(out.headers.get('x-custom')).toBe('kept');
    await expect(out.text()).resolves.toBe(body);
  });

  it('handles bodyless GET requests', () => {
    const req = new Request('https://mcp.example.com/domain');
    const out = buildBackendRequest(req, '/');
    expect(out.method).toBe('GET');
    expect(out.body).toBeNull();
    expect(out.url).toBe('https://mcp.example.com/');
  });

  it('adds no headers of its own', () => {
    const req = new Request('https://mcp.example.com/domain/mcp', {
      headers: { 'x-only': '1' },
    });
    const out = buildBackendRequest(req, '/mcp');
    expect([...out.headers.keys()].sort()).toEqual([...req.headers.keys()].sort());
  });

  it('preserves the abort signal', () => {
    const ac = new AbortController();
    const req = new Request('https://mcp.example.com/domain/mcp', {
      signal: ac.signal,
    });
    const out = buildBackendRequest(req, '/mcp');
    expect(out.signal.aborted).toBe(false);
    ac.abort();
    expect(out.signal.aborted).toBe(true);
  });
});

// Regression — protocol-relative backendPath must NEVER become an authority.
// `new URL('//evil.com/x', base)` resolves to `https://evil.com/x`; the
// origin-pinned construction must keep every rebased URL on the ROUTER
// origin instead (SSRF for fetch() consumers, wrong-endpoint routing via
// service bindings).
describe('buildBackendRequest — origin pinning', () => {
  const ROUTER = 'https://mcp.example.com';

  it('/domain//evil.com/x → the rebased URL stays on the router origin', () => {
    const req = new Request(`${ROUTER}/domain//evil.com/x`);
    const out = buildBackendRequest(req, '//evil.com/x');
    const url = new URL(out.url);
    expect(url.origin).toBe(ROUTER);
    expect(url.hostname).toBe('mcp.example.com');
    expect(url.pathname).toBe('//evil.com/x');
  });

  it('/memory//attacker.tld/x → stays on the router origin', () => {
    const req = new Request(`${ROUTER}/memory//attacker.tld/x`);
    const out = buildBackendRequest(req, '//attacker.tld/x');
    const url = new URL(out.url);
    expect(url.origin).toBe(ROUTER);
    expect(url.pathname).toBe('//attacker.tld/x');
  });

  it('/domain//mcp → stays on the router origin (no `mcp` authority)', () => {
    const req = new Request(`${ROUTER}/domain//mcp`);
    const out = buildBackendRequest(req, '//mcp');
    const url = new URL(out.url);
    expect(url.origin).toBe(ROUTER);
    expect(url.pathname).toBe('//mcp');
  });

  it('%2F-encoded variants stay literal path bytes on the router origin', () => {
    for (const path of ['/%2F..', '/%2F%2Fevil.com/x', '/%2Fevil.com%2Fx']) {
      const req = new Request(`${ROUTER}/domain${path}`);
      const out = buildBackendRequest(req, path);
      const url = new URL(out.url);
      expect(url.origin).toBe(ROUTER);
      expect(url.pathname).toBe(path);
    }
  });

  it('query preservation still holds under origin pinning', () => {
    const req = new Request(`${ROUTER}/domain//evil.com/x?a=1&b=two%20three`);
    const out = buildBackendRequest(req, '//evil.com/x?a=1&b=two%20three');
    const url = new URL(out.url);
    expect(url.origin).toBe(ROUTER);
    expect(url.pathname).toBe('//evil.com/x');
    expect(url.search).toBe('?a=1&b=two%20three');
  });
});

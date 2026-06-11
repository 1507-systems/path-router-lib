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

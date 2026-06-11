import { describe, expect, it } from 'vitest';
import { applyRewrite, type RewriteRule } from '../src/index';

describe('applyRewrite — strip-prefix', () => {
  const rule: RewriteRule = { kind: 'strip-prefix' };

  it('rewrites the mount root to /', () => {
    expect(applyRewrite(rule, '')).toBe('/');
  });

  it('rewrites a bare trailing slash to /', () => {
    expect(applyRewrite(rule, '/')).toBe('/');
  });

  it('passes a single-segment suffix through', () => {
    expect(applyRewrite(rule, '/mcp')).toBe('/mcp');
  });

  it('passes deep paths through', () => {
    expect(applyRewrite(rule, '/memory/search')).toBe('/memory/search');
    expect(applyRewrite(rule, '/a/b/c/d')).toBe('/a/b/c/d');
  });

  it('appends the query string verbatim', () => {
    expect(applyRewrite(rule, '/mcp', '?a=1&b=2')).toBe('/mcp?a=1&b=2');
    expect(applyRewrite(rule, '', '?a=1')).toBe('/?a=1');
  });

  // Regression: a leading slash run is collapsed to exactly one so the
  // result can never read as a protocol-relative URL (`//evil.com/x` would
  // make `evil.com` the authority in a naive `new URL(path, base)`).
  it('collapses a leading slash run — never emits a protocol-relative path', () => {
    expect(applyRewrite(rule, '//evil.com/x')).toBe('/evil.com/x');
    expect(applyRewrite(rule, '//attacker.tld/x')).toBe('/attacker.tld/x');
    expect(applyRewrite(rule, '//mcp')).toBe('/mcp');
    expect(applyRewrite(rule, '///deep')).toBe('/deep');
    expect(applyRewrite(rule, '//')).toBe('/');
  });

  it('collapsing keeps interior slashes and the query string intact', () => {
    expect(applyRewrite(rule, '//evil.com//x', '?a=1')).toBe('/evil.com//x?a=1');
  });

  it('does not decode %2F — encoded slashes stay literal path bytes', () => {
    expect(applyRewrite(rule, '/%2F..')).toBe('/%2F..');
    expect(applyRewrite(rule, '/%2F%2Fevil.com/x')).toBe('/%2F%2Fevil.com/x');
  });
});

describe('applyRewrite — exact-map', () => {
  const rule: RewriteRule = {
    kind: 'exact-map',
    map: { '': '/mcp', '/health': '/health' },
  };

  it('maps a hit', () => {
    expect(applyRewrite(rule, '')).toBe('/mcp');
    expect(applyRewrite(rule, '/health')).toBe('/health');
  });

  it('maps a hit with the query string appended', () => {
    expect(applyRewrite(rule, '/health', '?probe=1')).toBe('/health?probe=1');
    expect(applyRewrite(rule, '', '?x=y')).toBe('/mcp?x=y');
  });

  it('returns null on a miss', () => {
    expect(applyRewrite(rule, '/anything')).toBeNull();
    expect(applyRewrite(rule, '/mcp')).toBeNull(); // not mapped — only "" is
  });

  it('treats a bare trailing slash as a miss unless mapped explicitly', () => {
    expect(applyRewrite(rule, '/')).toBeNull();
  });
});

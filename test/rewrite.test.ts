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

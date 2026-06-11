/**
 * Build the request to forward to a backend: rebase the URL onto
 * `backendPath` (same origin as the incoming request — meaningless to a
 * service binding, but well-formed), preserving method, ALL headers
 * (`Authorization` pass-through is this line), body stream, redirect mode,
 * and abort signal. Adds nothing, strips nothing.
 *
 * The rebase is ORIGIN-PINNED: `backendPath` is split into pathname + search
 * and assigned onto a copy of the request's own URL. It is deliberately NOT
 * resolved via `new URL(backendPath, req.url)` — there, a path beginning
 * with `//` (e.g. the strip-prefix suffix of `/domain//evil.com/mcp`) is a
 * PROTOCOL-RELATIVE reference and its first segment becomes the authority
 * (`https://evil.com/mcp`): latent SSRF for consumers that `fetch()` the
 * result, wrong-endpoint routing via service bindings. The `pathname` setter
 * cannot introduce an authority, so the result always stays on `req.url`'s
 * origin.
 *
 * `backendPath` should already carry the query string when one must survive
 * (as produced by `resolveMount`).
 */
export function buildBackendRequest(req: Request, backendPath: string): Request {
  const target = new URL(req.url);
  const q = backendPath.indexOf('?');
  target.pathname = q === -1 ? backendPath : backendPath.slice(0, q);
  target.search = q === -1 ? '' : backendPath.slice(q);
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: req.redirect,
    signal: req.signal,
  };
  // Required by the fetch spec (and enforced by undici / Node) when the body
  // is a ReadableStream; harmless elsewhere.
  if (req.body !== null) init.duplex = 'half';
  return new Request(target, init);
}

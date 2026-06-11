/**
 * Build the request to forward to a backend: rebase the URL onto
 * `backendPath` (same origin as the incoming request — meaningless to a
 * service binding, but well-formed), preserving method, ALL headers
 * (`Authorization` pass-through is this line), body stream, redirect mode,
 * and abort signal. Adds nothing, strips nothing.
 *
 * `backendPath` should already carry the query string when one must survive
 * (as produced by `resolveMount`).
 */
export function buildBackendRequest(req: Request, backendPath: string): Request {
  const target = new URL(backendPath, req.url);
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

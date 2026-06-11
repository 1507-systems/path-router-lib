/** How a mount rewrites the matched path into a backend path. */
export type RewriteRule =
  | { kind: 'strip-prefix' } // /name/x → /x ; /name → /
  | { kind: 'exact-map'; map: Record<string, string> }; // suffix → backend path; miss → null

/**
 * Apply a rewrite rule to the path suffix left over after removing a mount
 * prefix.
 *
 * `suffix` is `""` for the mount root (`/name`) or starts with `/`
 * (`/name/x` → suffix `/x`). `search` is the verbatim query string (`""` or
 * `"?..."`) and is always appended to a successful rewrite.
 *
 * - `strip-prefix`: `/name` → `/`, `/name/` → `/`, `/name/x` → `/x`. A
 *   leading run of slashes is collapsed to exactly one (`/name//x` → `/x`):
 *   a `//`-prefixed result would read as a PROTOCOL-RELATIVE URL to any
 *   naive `new URL(path, base)` consumer, turning its first segment into
 *   the authority. `buildBackendRequest` is origin-pinned and immune, but
 *   the footgun is never emitted in the first place (defense in depth).
 * - `exact-map`: the suffix is looked up verbatim in the map; a miss returns
 *   `null` so the caller can 404. Note `/name/` has suffix `"/"`, which is a
 *   miss unless mapped explicitly.
 */
export function applyRewrite(
  rule: RewriteRule,
  suffix: string,
  search = '',
): string | null {
  switch (rule.kind) {
    case 'strip-prefix': {
      const path = suffix === '' || suffix === '/' ? '/' : suffix.replace(/^\/+/, '/');
      return path + search;
    }
    case 'exact-map': {
      const mapped = rule.map[suffix];
      return mapped === undefined ? null : mapped + search;
    }
  }
}

Security Audit Findings

Severity: Critical.
File/line: auth.ts:84, auth.ts:92, apps/web/src/app/api/admin/[...slug]/route.ts, apps/web/src/app/api/admin/allegro/[...slug]/route.ts.
Description: A static fallback internal admin secret is hardcoded and accepted for proxy auth. If env secret loading fails or is misconfigured, anyone with this known value can call admin API routes by setting X-Admin-Internal-Secret and a valid admin id in X-Admin-User-Id, resulting in auth bypass.
Fix: Remove all hardcoded fallback secrets and fail closed (401/503) when INTERNAL_API_SECRET is missing; rotate the shared secret immediately.

Severity: Critical.
File/line: jwt.ts:47.
Description: Admin JWT signing/verification falls back to a hardcoded HS256 secret. If runtime env is unavailable, admin_session tokens become forgeable with a known key.
Fix: Remove fallback; require secret from secure runtime binding only; reject startup/auth when missing; rotate ADMIN_JWT_SECRET and invalidate existing admin sessions.

Severity: High.
File/line: client.ts:116, wrangler.json:48.
Description: Hardcoded PostgreSQL credentials are present in tracked files. This is direct credential exposure and may enable unauthorized DB access if leaked/replicated.
Fix: Remove embedded connection strings, use secret bindings only, rotate DB credentials immediately, and scrub credential history from git where possible.

Severity: High.
File/line: auth.ts:123.
Description: Secret comparison mismatch logging prints both requestSecret and internalSecret. This can leak the real secret to logs/observability systems.
Fix: Never log secrets or full tokens; log only boolean match result and request metadata.

Severity: Medium.
File/line: allegro.ts:50, allegro.ts:57.
Description: Allegro token encryption is fail-open. When encryption key is missing, tokens are stored and read as plaintext. This weakens token-at-rest security.
Fix: Enforce ALLEGRO_TOKEN_ENCRYPTION_KEY in production and block token write/read paths when absent; migrate existing plaintext tokens by forced re-auth and re-encryption.

Severity: Medium.
File/line: crypto.ts:10, crypto.ts:21, crypto.ts:22.
Description: Crypto key parsing/import does not validate hex format and expected length before AES import. Misconfigured keys can silently degrade effective key quality.
Fix: Validate key as exactly 64 hex chars for AES-256 before import; throw explicit errors on invalid format/length.

Severity: Medium.
File/line: index.ts:105, allegro.ts:175, allegro.ts:176, allegro.ts:254, allegro.ts:302.
Description: Internal exception messages are returned to clients (health and Allegro flows), and callback redirects include raw error text in query params. This increases information disclosure risk.
Fix: Return generic user-safe messages with stable error codes; keep detailed diagnostics server-side only.

Severity: Medium.
File/line: index.ts:73, index.ts:130, index.ts:78, index.ts:87.
Description: Rate limiting is applied to /api/* but not to /admin/* or /health. This leaves sensitive/admin and health endpoints more exposed to brute-force and abuse traffic.
Fix: Add dedicated limiters for /admin/* and /health (stricter for auth-like admin traffic, looser for health checks).

Additional Results

Injection review: no clear SQL or command injection path found in reviewed source; raw SQL usage is parameterized in inspected cases.
Dependency review: npm audit for production dependencies reported 0 vulnerabilities.
Local secret files: workspace contains secret-bearing env files (for example .env:1), but they are gitignored in .gitignore:14. Keep them out of artifacts and rotate if already shared.
Highest-priority remediation order

Remove hardcoded auth secrets and rotate them.
Remove hardcoded DB credentials and rotate DB password.
Stop logging secrets and stop returning internal error details to clients.
Enforce encryption key presence/validation and add admin endpoint rate limiting.
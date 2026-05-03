# Security Audit — Il Buon Caffe

_Audited: all routes in `apps/web` and `apps/api`_

---

## Summary

The project has a **strong security posture** for its admin panel. Auth flows, JWT handling, rate limiting, CSRF protection, and account lockout are all implemented correctly. The main gap was missing HTTP security headers on public routes, which has now been fixed.

---

## Findings

### FIXED ✅ — Missing HTTP security headers on public routes

**File:** `apps/web/next.config.mjs`

**Problem:** The edge middleware (`src/proxy.ts`) applied security headers
(`HSTS`, `X-Frame-Options`, `CSP`, etc.) only to `/admin/*` routes. Public
pages (home, shop, encyclopedia) had none.

**Fix applied:** Added a `headers()` block in `next.config.mjs` that sends the
following headers on **every route**:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` |

The admin edge middleware continues to override these with a stricter set
(including a per-request CSP nonce, `HSTS`, `DENY` framing, `COEP`, `CORP`).

---

### FIXED ✅ — Misleading comment on admin cookie `path`

**File:** `apps/web/src/lib/auth/jwt.ts` → `getAdminCookieConfig()`

**Problem:** The JSDoc comment said `path: /admin — cookie scoped to admin
routes only` but the code used `path: '/'`. This also created a bug risk:
if someone "fixed" it to `'/admin'`, the cookie would stop being sent to
`/api/admin/*` routes (allegro proxy, logout endpoint), breaking those flows.

**Fix applied:** Updated the comment to accurately document why `path: '/'`
is required and intentional, given that admin API routes live under `/api/admin/*`.

---

### FIXED ✅ — `dangerouslySetInnerHTML` safety comment

**File:** `apps/web/src/components/Encyclopedia/EncyclopediaClient.tsx`

**Problem:** No comment explaining that `article.content` is trusted
developer-authored HTML (from `ENCYCLOPEDIA_ENTRIES` in `constants.ts`).
If articles ever became DB-sourced, this would be a stored-XSS vector.

**Fix applied:** Added a prominent comment warning that DOMPurify sanitisation
must be added if the source ever becomes dynamic/user-controlled.

---

## Items already implemented correctly ✅

### Authentication & Sessions

- **JWT** — HS256, 4 h TTL, `jti` UUID per token, `tokenVersion` for instant
  revocation on logout across all devices/isolates. Secret rotation via
  `ADMIN_JWT_SECRET_OLD`.
- **Password hashing** — bcrypt (argon2 on API side). Constant-time comparison.
  Dummy hash run for non-existent users to prevent timing oracle.
- **Account lockout** — 5 failed attempts → 30 min DB lock (persists across
  serverless instances). Webhook alert fired on lockout.
- **Rate limiting** — In-memory per IP (best-effort in serverless). DB lockout
  is the durable layer.
- **CSRF** — `Origin`/`Referer` check in `adminLoginAction`. Fail-closed: absent
  header = denied. Admin cookie is `SameSite=Strict`.
- **Cookie flags** — `httpOnly`, `Secure` (production), `SameSite=Strict`.
  `path: '/'` is required because admin API endpoints are at `/api/admin/*`.
- **Email enumeration prevention** — Generic error message on login failure.
  Register endpoint always returns success if email exists.
- **Input sanitisation** — `normalizeEmail()`, `sanitizeString()`, body size
  guard (10 KB), max password length 128 chars.

### Admin Panel (`/admin/*`)

- **IP allowlist** — `ADMIN_ALLOWED_IPS` env var with CIDR support. Returns 404
  (not 403) for blocked IPs to obscure panel existence.
- **CSP with per-request nonce** — `crypto.getRandomValues()` per request.
- **Full security header set** — HSTS (2 yr, includeSubDomains, preload),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`,
  `Cross-Origin-Resource-Policy: same-origin`.
- **`Cache-Control: no-store`** on all admin pages.
- **Audit log** — every login attempt (success/failure), logout, and reason
  written to the `audit_log` DB table.

### API Layer (`apps/api` — Cloudflare Workers / Hono)

- All auth flows mirror the above protections.
- `hashToken()` — verification tokens are hashed before DB storage; raw token
  only transmitted in the email link.
- Consent recording (IP + UserAgent) on registration.

### Internal Service Auth

- **`INTERNAL_API_SECRET`** — pre-shared secret for the Next.js → Cloudflare
  Worker Allegro proxy. Admin session verified before forwarding; secret must
  be ≥ 32 chars.

---

## Remaining low-risk notes (no action required)

| # | Note |
|---|------|
| 1 | `NEXT_PUBLIC_API_URL` is the public API hostname — exposing it to the browser is intentional (admin client uses it for direct calls). |
| 2 | `images.unsplash.com` remote image patterns — intentional, specific enough. |
| 3 | In-memory rate limiting has no effect across serverless isolates — acknowledged in code comments; DB lockout provides the durable layer. |
| 4 | No global Content-Security-Policy for public pages — a strict CSP would require auditing all inline scripts/styles across the public site. Consider adding after a full CSP audit. |
| 5 | `.env` files are excluded by root `.gitignore`. Confirm they have never been committed (`git log --all -- '*/.env'`). |

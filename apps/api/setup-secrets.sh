#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Il Buon Caffe — Production Secrets Setup for Cloudflare Worker
# ─────────────────────────────────────────────────────────────────────────────
#
# This script sets all required CF Worker secrets for production.
# Run from: apps/api/
#
# Usage:
#   chmod +x setup-secrets.sh
#   ./setup-secrets.sh
#
# Prerequisites:
#   - npx wrangler login (authenticated to Cloudflare)
#   - All secret values ready (see .env.example in repo root)
#
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "═══════════════════════════════════════════════════════════════════"
echo "  Il Buon Caffe — CF Worker Secrets Setup (Production)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "This will set all required secrets for the 'il-buon-caffe-api' worker."
echo "Each secret is entered interactively (hidden input)."
echo ""
echo "Required secrets:"
echo "  1. DATABASE_URL             — Neon PostgreSQL connection string"
echo "  2. JWT_ACCESS_SECRET        — Min 32 chars random string"
echo "  3. JWT_REFRESH_SECRET       — Min 32 chars random string"
echo "  4. INTERNAL_API_SECRET      — Shared with Next.js admin proxy"
echo "  5. ALLEGRO_CLIENT_ID        — From apps.developer.allegro.pl"
echo "  6. ALLEGRO_CLIENT_SECRET    — From apps.developer.allegro.pl"
echo "  7. ALLEGRO_TOKEN_ENCRYPTION_KEY — 64-char hex (AES-256-GCM)"
echo "  8. P24_MERCHANT_ID          — From panel.przelewy24.pl"
echo "  9. P24_API_KEY              — From panel.przelewy24.pl"
echo " 10. P24_CRC_KEY              — From panel.przelewy24.pl"
echo ""
echo "To generate random secrets:"
echo '  node -e "console.log(require('"'"'crypto'"'"').randomBytes(32).toString('"'"'hex'"'"'))"'
echo ""
echo "─────────────────────────────────────────────────────────────────────"
echo ""

SECRETS=(
  "DATABASE_URL"
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
  "INTERNAL_API_SECRET"
  "ALLEGRO_CLIENT_ID"
  "ALLEGRO_CLIENT_SECRET"
  "ALLEGRO_TOKEN_ENCRYPTION_KEY"
  "P24_MERCHANT_ID"
  "P24_API_KEY"
  "P24_CRC_KEY"
)

for secret in "${SECRETS[@]}"; do
  echo "→ Setting: $secret"
  npx wrangler secret put "$secret"
  echo ""
done

echo "═══════════════════════════════════════════════════════════════════"
echo "  ✓ All secrets set successfully!"
echo ""
echo "  Non-sensitive vars are in wrangler.json:"
echo "    NODE_ENV, ALLEGRO_ENVIRONMENT, ALLEGRO_REDIRECT_URI,"
echo "    ALLEGRO_ADMIN_REDIRECT_URL, PUBLIC_URL, FRONTEND_URL, P24_SANDBOX"
echo ""
echo "  Verify with: npx wrangler secret list"
echo "═══════════════════════════════════════════════════════════════════"

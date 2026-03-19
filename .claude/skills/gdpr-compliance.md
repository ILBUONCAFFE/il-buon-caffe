---
name: gdpr-compliance
description: >
  Implement GDPR/RODO compliance features for Il Buon Caffè — soft deletes, consent management,
  audit logging, data retention, user data export, and anonymization. Use this skill whenever the user
  works on privacy features, data protection, consent tracking, audit logs, or any RODO-related requirement.
  Triggers on: "GDPR", "RODO", "consent", "zgoda", "audit log", "soft delete", "anonymization",
  "anonimizacja", "data export", "eksport danych", "data retention", "retencja", "prawo do usunięcia",
  "right to erasure", "right to be forgotten", or any privacy/compliance-related feature.
---

# GDPR/RODO Compliance Skill — Il Buon Caffè

Implement Polish RODO (GDPR) compliance: consent management, audit logging, soft deletes, data retention, and user rights.

## Project Context

- Compliance schema in `packages/db/src/schema/compliance.ts`
- Tables: `user_consents`, `audit_log`, `stock_changes`
- All tables use soft deletes (`deletedAt` column)
- Admin GDPR tools in `apps/web/app/admin/settings/`
- API routes for data export and anonymization in `apps/api/src/routes/admin/gdpr/`

## Core Principles

1. **Soft deletes everywhere** — never hard-delete user data without explicit anonymization request
2. **Consent before collection** — track what the user agreed to and when
3. **Audit everything** — every data mutation on user/order data gets logged
4. **Data minimization** — collect only what's needed, purge when retention expires
5. **Right to access & erasure** — user can export their data or request anonymization

## Consent Management

### Consent Types

```typescript
const consentTypes = [
  'terms_of_service',      // Regulamin
  'privacy_policy',        // Polityka prywatności
  'marketing_email',       // Zgoda na marketing e-mail
  'marketing_sms',         // Zgoda na marketing SMS
  'order_processing',      // Przetwarzanie danych zamówienia
  'analytics',             // Cookies analityczne
] as const;
```

### Recording Consent

```typescript
// When user registers or updates preferences
async function recordConsent(
  userId: string,
  consentType: string,
  granted: boolean,
  ipAddress: string,
) {
  if (granted) {
    await db.insert(userConsents).values({
      userId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      ipAddress,
    });
  } else {
    // Revoke: don't delete the record, update it
    await db.update(userConsents)
      .set({
        granted: false,
        revokedAt: new Date(),
      })
      .where(and(
        eq(userConsents.userId, userId),
        eq(userConsents.consentType, consentType),
        isNull(userConsents.revokedAt),
      ));
  }

  // Audit log
  await logAudit(userId, granted ? 'consent_granted' : 'consent_revoked', 'user_consent', null, {
    consentType,
    ipAddress,
  });
}
```

### Consent Check Middleware

Before sending marketing emails or collecting analytics:

```typescript
async function hasConsent(userId: string, consentType: string): Promise<boolean> {
  const consent = await db.query.userConsents.findFirst({
    where: and(
      eq(userConsents.userId, userId),
      eq(userConsents.consentType, consentType),
      eq(userConsents.granted, true),
      isNull(userConsents.revokedAt),
    ),
  });
  return !!consent;
}
```

## Audit Logging

Every mutation to user-related data gets logged:

```typescript
async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: {
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    [key: string]: unknown;
  },
) {
  await db.insert(auditLog).values({
    userId,
    action,
    entityType,
    entityId,
    oldValue: details?.oldValue ? JSON.stringify(details.oldValue) : null,
    newValue: details?.newValue ? JSON.stringify(details.newValue) : null,
    ipAddress: details?.ipAddress || null,
    createdAt: new Date(),
  });
}
```

### What to Audit

- User registration, login, logout
- Profile updates (log old + new values)
- Consent changes
- Order creation, status changes
- Admin actions: product edits, order management, customer data access
- Data export requests
- Anonymization requests

### Audit Log Schema

```typescript
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

## Data Retention

Automatic cleanup via scheduled worker:

| Data | Retention | Action |
|------|-----------|--------|
| `allegro_sync_log` | 90 days | Hard delete |
| `audit_log` | 1 year | Hard delete |
| Expired sessions | 30 days past expiry | Hard delete |
| Soft-deleted records | Keep indefinitely | Only anonymize on explicit request |

```typescript
// Scheduled cleanup worker (daily)
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const db = getDb(env);

    // Purge old sync logs (90 days)
    await db.delete(allegroSyncLog)
      .where(lt(allegroSyncLog.createdAt, sql`NOW() - INTERVAL '90 days'`));

    // Purge old audit logs (1 year)
    await db.delete(auditLog)
      .where(lt(auditLog.createdAt, sql`NOW() - INTERVAL '1 year'`));

    // Purge expired sessions
    await db.delete(sessions)
      .where(lt(sessions.expiresAt, sql`NOW() - INTERVAL '30 days'`));
  },
};
```

## Right to Access (Data Export)

User can request a full export of their data:

```typescript
// GET /api/admin/gdpr/export/:userId
app.get('/export/:userId', adminMiddleware, async (c) => {
  const userId = c.req.param('userId');

  const userData = {
    profile: await db.query.users.findFirst({ where: eq(users.id, userId) }),
    consents: await db.query.userConsents.findMany({ where: eq(userConsents.userId, userId) }),
    orders: await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: { items: true },
    }),
    auditLog: await db.query.auditLog.findMany({ where: eq(auditLog.userId, userId) }),
  };

  // Remove sensitive fields
  if (userData.profile) {
    delete userData.profile.passwordHash;
  }

  // Log the export request
  await logAudit(c.get('user').id, 'data_export', 'user', userId);

  return c.json({ data: userData });
});
```

## Right to Erasure (Anonymization)

GDPR says "right to be forgotten" — but we need to keep order records for accounting. Solution: anonymize PII while preserving transaction data.

```typescript
// POST /api/admin/gdpr/anonymize/:userId
app.post('/anonymize/:userId', adminMiddleware, async (c) => {
  const userId = c.req.param('userId');

  await db.transaction(async (tx) => {
    // 1. Anonymize user profile
    await tx.update(users).set({
      email: `anonymized-${userId.slice(0, 8)}@deleted.local`,
      firstName: 'Usunięto',
      lastName: 'Usunięto',
      phone: null,
      passwordHash: 'ANONYMIZED',
      deletedAt: new Date(),
    }).where(eq(users.id, userId));

    // 2. Anonymize shipping addresses in orders (keep amounts for accounting)
    await tx.update(orders).set({
      shippingAddress: sql`jsonb_build_object(
        'street', 'ANONYMIZED',
        'city', 'ANONYMIZED',
        'postalCode', 'ANONYMIZED',
        'country', (shipping_address->>'country')
      )`,
      guestEmail: null,
    }).where(eq(orders.userId, userId));

    // 3. Revoke all consents
    await tx.update(userConsents).set({
      granted: false,
      revokedAt: new Date(),
    }).where(and(
      eq(userConsents.userId, userId),
      eq(userConsents.granted, true),
    ));

    // 4. Delete sessions
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });

  // Audit the anonymization itself
  await logAudit(c.get('user').id, 'user_anonymized', 'user', userId);

  return c.json({ success: true });
});
```

## Key Conventions

- Polish legal context: RODO is the Polish implementation of EU GDPR
- Consent must be freely given, specific, informed, and unambiguous
- Pre-checked boxes are NOT valid consent under RODO
- `terms_of_service` and `order_processing` are required consents (can't proceed without them)
- `marketing_email`, `marketing_sms`, `analytics` are optional
- Always log the IP address and timestamp with consent records
- Admin panel shows consent history per user with grant/revoke timeline

/**
 * Active security alerting — sends a webhook notification when suspicious
 * admin activity is detected.
 *
 * Configuration:
 *   ADMIN_ALERT_WEBHOOK_URL — Slack Incoming Webhook, Discord webhook,
 *                             or any HTTP endpoint that accepts a JSON body
 *                             with a "text" field (Slack-compatible format).
 *
 * If the env var is not set, alerts are suppressed silently
 * (graceful degradation — never breaks the auth flow).
 *
 * Examples of events that trigger an alert:
 * - Account locked after repeated failed logins
 * - Login from a blocked IP despite the IP whitelist (edge layer)
 * - CSRF attempt detected by the login Server Action
 *
 * This intentionally uses a SEPARATE webhook from other notifications
 * so security alerts can be routed to a dedicated on-call channel.
 */

export interface SecurityAlertParams {
  /** Short event label, e.g. "Account locked after repeated failures" */
  event: string;
  /** Client IP address */
  ip: string;
  /** Email address involved (if known — never log passwords) */
  email?: string;
  /** Any extra structured data to include in the alert */
  details?: Record<string, unknown>;
}

/**
 * Send a security alert to the configured webhook.
 * Fire-and-forget with a 3s timeout — never throws, never blocks the caller.
 */
export async function alertSuspiciousActivity(params: SecurityAlertParams): Promise<void> {
  const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines: string[] = [
    `🚨 *Admin Security Alert* — ${params.event}`,
    `• IP: \`${params.ip}\``,
  ];

  if (params.email) {
    lines.push(`• Email: \`${params.email}\``);
  }
  if (params.details) {
    lines.push(`• Details: \`${JSON.stringify(params.details)}\``);
  }

  lines.push(`• Time: \`${new Date().toISOString()}\``);
  lines.push(`• App: Il Buon Caffe Admin`);

  const body = JSON.stringify({ text: lines.join('\n') });

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      // Abort after 3 seconds so a slow/down webhook doesn't stall the request
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Intentionally swallowed — alert failure is non-critical
    console.error('[alertSuspiciousActivity] Webhook delivery failed (non-fatal)');
  }
}

/**
 * Guards to evaluate whether an alert should fire.
 * Keeps alert logic out of the business logic layer.
 */
export const AlertThresholds = {
  /** Lock account after this many failures — alert fires when this is reached */
  FAILED_ATTEMPTS_BEFORE_LOCK: 5,
} as const;

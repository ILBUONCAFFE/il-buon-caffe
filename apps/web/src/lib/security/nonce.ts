import { headers } from 'next/headers';

/**
 * Read the per-request CSP nonce injected by proxy.ts (Edge Middleware).
 *
 * The middleware generates a cryptographically random nonce for every request
 * and sets it as `x-nonce` on the response.  Next.js then makes this header
 * accessible to Server Components via `headers()`.
 *
 * Usage in Server Components / Layouts:
 * ```tsx
 * import { getNonce } from '@/lib/security/nonce';
 *
 * export default async function Layout({ children }) {
 *   const nonce = await getNonce();
 *   return (
 *     <html>
 *       <head>
 *         <script nonce={nonce} ... />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * The nonce MUST match the value in the `Content-Security-Policy` header
 * that was set by the same middleware for the same request.
 *
 * Falls back to empty string in non-admin or test contexts.
 */
export async function getNonce(): Promise<string> {
  try {
    const headerStore = await headers();
    return headerStore.get('x-nonce') ?? '';
  } catch {
    // headers() throws outside of request context (e.g., during build)
    return '';
  }
}

/**
 * Read the per-request trace ID injected by proxy.ts.
 * Useful for correlating server logs with client-visible request IDs.
 */
export async function getRequestId(): Promise<string> {
  try {
    const headerStore = await headers();
    return headerStore.get('x-request-id') ?? '';
  } catch {
    return '';
  }
}

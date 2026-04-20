#!/usr/bin/env node

/**
 * SEO Monitoring Smoke Check
 *
 * Cross-platform Node.js script for validating critical SEO signals
 * after deployment and on scheduled runs.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_REQUEST_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent':
    'Mozilla/5.0 (compatible; IBCSeoMonitoring/1.0; +https://ilbuoncaffe.pl)',
};

function parseArgs(argv) {
  const args = {
    baseUrl: 'https://ilbuoncaffe.pl',
    output: '',
    strict: false,
  };

  for (const entry of argv) {
    if (entry.startsWith('--base-url=')) {
      args.baseUrl = entry.split('=')[1] ?? args.baseUrl;
    } else if (entry.startsWith('--output=')) {
      args.output = entry.split('=')[1] ?? '';
    } else if (entry === '--strict') {
      args.strict = true;
    }
  }

  return args;
}

function makeCheck(id, name, severity, ok, details) {
  return { id, name, severity, ok, details };
}

function extractCanonical(html) {
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return canonicalMatch?.[1]?.trim() ?? '';
}

function extractRobotsMeta(html) {
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  return robotsMatch?.[1]?.trim().toLowerCase() ?? '';
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers = new Headers(DEFAULT_REQUEST_HEADERS);
    if (options.headers) {
      const customHeaders = new Headers(options.headers);
      for (const [key, value] of customHeaders.entries()) {
        headers.set(key, value);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  const text = await response.text();
  return { response, text };
}

function hasAllDisallowRules(robotsText) {
  const expected = ['/admin', '/account', '/auth', '/checkout', '/order', '/api/'];
  const normalized = robotsText.toLowerCase();
  return expected.every((value) => normalized.includes(`disallow: ${value.toLowerCase()}`));
}

function includesBingRule(robotsText) {
  return /user-agent:\s*bingbot/i.test(robotsText) || /user-agent:\s*msnbot/i.test(robotsText);
}

function summarize(checks) {
  const total = checks.length;
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  const criticalFailed = checks.filter((c) => !c.ok && c.severity === 'critical').length;
  const warningFailed = checks.filter((c) => !c.ok && c.severity === 'warning').length;

  return { total, passed, failed, criticalFailed, warningFailed };
}

async function run() {
  const { baseUrl, output, strict } = parseArgs(process.argv.slice(2));
  const checks = [];

  const parsedBase = new URL(baseUrl);
  const canonicalOrigin = `${parsedBase.protocol}//${parsedBase.host}`;

  // SEO-01: canonical host redirect (www -> canonical)
  if (!parsedBase.hostname.startsWith('www.')) {
    const wwwUrl = new URL('/sklep', parsedBase);
    wwwUrl.hostname = `www.${parsedBase.hostname}`;

    try {
      const response = await fetchWithTimeout(wwwUrl.toString(), { redirect: 'manual' });
      const location = response.headers.get('location') ?? '';
      const isRedirect = [301, 302, 307, 308].includes(response.status);
      const pointsToCanonical = location.startsWith(`${canonicalOrigin}/sklep`);
      checks.push(
        makeCheck(
          'SEO-01',
          'Canonical host redirect',
          'critical',
          isRedirect && pointsToCanonical,
          `status=${response.status}; location=${location || 'missing'}`,
        ),
      );
    } catch (error) {
      checks.push(makeCheck('SEO-01', 'Canonical host redirect', 'critical', false, `fetch_error=${String(error)}`));
    }
  }

  // SEO-02: root status
  try {
    const response = await fetchWithTimeout(canonicalOrigin, { redirect: 'follow' });
    checks.push(makeCheck('SEO-02', 'Root host status', 'critical', response.status === 200, `status=${response.status}`));
  } catch (error) {
    checks.push(makeCheck('SEO-02', 'Root host status', 'critical', false, `fetch_error=${String(error)}`));
  }

  // SEO-03/04/15: robots checks
  try {
    const { response, text } = await fetchText(`${canonicalOrigin}/robots.txt`);
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();

    checks.push(
      makeCheck(
        'SEO-03',
        'Robots endpoint status/content-type',
        'critical',
        response.status === 200 && contentType.includes('text/plain'),
        `status=${response.status}; content_type=${contentType || 'missing'}`,
      ),
    );

    checks.push(
      makeCheck(
        'SEO-04',
        'Robots private disallow policy',
        'critical',
        hasAllDisallowRules(text),
        hasAllDisallowRules(text) ? 'all required disallow rules found' : 'missing one or more private disallow rules',
      ),
    );

    checks.push(
      makeCheck(
        'SEO-15',
        'Bingbot rule present in robots',
        'warning',
        includesBingRule(text),
        includesBingRule(text) ? 'bingbot/msnbot rule detected' : 'bingbot/msnbot rule not detected',
      ),
    );
  } catch (error) {
    checks.push(makeCheck('SEO-03', 'Robots endpoint status/content-type', 'critical', false, `fetch_error=${String(error)}`));
    checks.push(makeCheck('SEO-04', 'Robots private disallow policy', 'critical', false, `fetch_error=${String(error)}`));
    checks.push(makeCheck('SEO-15', 'Bingbot rule present in robots', 'warning', false, `fetch_error=${String(error)}`));
  }

  // SEO-05/06: sitemap checks
  try {
    const { response, text } = await fetchText(`${canonicalOrigin}/sitemap.xml`);
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const urlCount = (text.match(/<url>/g) ?? []).length;

    checks.push(
      makeCheck(
        'SEO-05',
        'Sitemap endpoint status/content-type',
        'critical',
        response.status === 200 && contentType.includes('xml'),
        `status=${response.status}; content_type=${contentType || 'missing'}`,
      ),
    );

    checks.push(
      makeCheck('SEO-06', 'Sitemap has URL entries', 'critical', urlCount > 0, `url_count=${urlCount}`),
    );

    checks.push(
      makeCheck(
        'SEO-16',
        'Noindex encyclopedia excluded from sitemap',
        'warning',
        !text.includes('/encyklopedia'),
        !text.includes('/encyklopedia') ? 'encyklopedia not found in sitemap' : 'encyklopedia URL detected in sitemap',
      ),
    );
  } catch (error) {
    checks.push(makeCheck('SEO-05', 'Sitemap endpoint status/content-type', 'critical', false, `fetch_error=${String(error)}`));
    checks.push(makeCheck('SEO-06', 'Sitemap has URL entries', 'critical', false, `fetch_error=${String(error)}`));
    checks.push(makeCheck('SEO-16', 'Noindex encyclopedia excluded from sitemap', 'warning', false, `fetch_error=${String(error)}`));
  }

  // SEO-07: home canonical
  try {
    const { text } = await fetchText(canonicalOrigin);
    const canonical = extractCanonical(text);
    checks.push(
      makeCheck(
        'SEO-07',
        'Home canonical host',
        'critical',
        canonical.startsWith(canonicalOrigin),
        `canonical=${canonical || 'missing'}`,
      ),
    );
  } catch (error) {
    checks.push(makeCheck('SEO-07', 'Home canonical host', 'critical', false, `fetch_error=${String(error)}`));
  }

  // SEO-08: auth noindex
  try {
    const { text } = await fetchText(`${canonicalOrigin}/auth`);
    const robots = extractRobotsMeta(text);
    checks.push(
      makeCheck('SEO-08', 'Auth noindex', 'critical', robots.includes('noindex'), `robots=${robots || 'missing'}`),
    );
  } catch (error) {
    checks.push(makeCheck('SEO-08', 'Auth noindex', 'critical', false, `fetch_error=${String(error)}`));
  }

  // SEO-09: checkout noindex,nofollow
  try {
    const { text } = await fetchText(`${canonicalOrigin}/checkout`);
    const robots = extractRobotsMeta(text);
    const ok = robots.includes('noindex') && robots.includes('nofollow');
    checks.push(makeCheck('SEO-09', 'Checkout noindex/nofollow', 'critical', ok, `robots=${robots || 'missing'}`));
  } catch (error) {
    checks.push(makeCheck('SEO-09', 'Checkout noindex/nofollow', 'critical', false, `fetch_error=${String(error)}`));
  }

  // SEO-11: non-existing product should behave as non-indexable missing resource
  // In App Router streaming mode, notFound() can surface as soft-404 (200 + noindex).
  try {
    const missingProductUrl = `${canonicalOrigin}/sklep/slug-ktorego-nie-ma`;
    const { response, text } = await fetchText(missingProductUrl, { redirect: 'manual' });
    const robots = extractRobotsMeta(text);
    const canonical = extractCanonical(text);
    const isHard404 = response.status === 404;
    const isSoft404Noindex = response.status === 200 && robots.includes('noindex');

    checks.push(
      makeCheck(
        'SEO-11',
        'Non-existing product is non-indexable (hard or soft 404)',
        'critical',
        isHard404 || isSoft404Noindex,
        `status=${response.status}; robots=${robots || 'missing'}; canonical=${canonical || 'missing'}`,
      ),
    );
  } catch (error) {
    checks.push(
      makeCheck(
        'SEO-11',
        'Non-existing product is non-indexable (hard or soft 404)',
        'critical',
        false,
        `fetch_error=${String(error)}`,
      ),
    );
  }

  const summary = summarize(checks);
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: canonicalOrigin,
    strict,
    summary,
    checks,
  };

  if (output) {
    const outputPath = resolve(process.cwd(), output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  const criticalFailures = summary.criticalFailed;
  const warningFailures = summary.warningFailed;
  const shouldFail = criticalFailures > 0 || (strict && warningFailures > 0);

  // Human-friendly stdout for CI logs
  console.log(`SEO monitoring summary: ${summary.passed}/${summary.total} checks passed`);
  for (const check of checks) {
    const mark = check.ok ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${check.id} (${check.severity}) - ${check.name} :: ${check.details}`);
  }

  if (output) {
    console.log(`Report written to: ${resolve(process.cwd(), output)}`);
  }

  if (shouldFail) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`seo-monitoring-check failed: ${String(error)}`);
  process.exitCode = 1;
});

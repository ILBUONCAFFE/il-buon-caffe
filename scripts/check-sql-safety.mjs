import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', 'apps', 'packages'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));

const checks = [
  {
    pattern: /\bsql\.raw\s*\(/,
    message: 'Avoid sql.raw(); use Drizzle sql tagged templates and sql.identifier() for vetted identifiers.',
  },
  {
    pattern: /\bdb\.execute\s*\(\s*['"`]/,
    message: 'Avoid db.execute() with raw strings; pass sql`...` so values stay parameterized.',
  },
  {
    pattern: /\.(?:execute|query)\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE|WITH)\b/i,
    message: 'Avoid direct SQL strings; use sql`...` with bound interpolations.',
  },
];

const findings = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    checks.forEach((check) => {
      if (check.pattern.test(line)) {
        findings.push(`${file}:${index + 1}: ${check.message}\n  ${line.trim()}`);
      }
    });
  });
}

if (findings.length > 0) {
  console.error(`SQL safety check failed with ${findings.length} finding(s):\n`);
  console.error(findings.join('\n\n'));
  process.exit(1);
}

console.log(`SQL safety check passed (${files.length} files scanned).`);

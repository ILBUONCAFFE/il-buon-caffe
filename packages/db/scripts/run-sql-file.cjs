#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function splitSqlStatements(input) {
  const statements = [];
  let buf = '';

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = i + 1 < input.length ? input[i + 1] : '';

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && !dollarTag) {
      if (ch === '-' && next === '-') {
        buf += ch + next;
        i++;
        inLineComment = true;
        continue;
      }
      if (ch === '/' && next === '*') {
        buf += ch + next;
        i++;
        inBlockComment = true;
        continue;
      }
    }

    if (!inDouble && !dollarTag && ch === "'") {
      inSingle = !inSingle;
      buf += ch;
      continue;
    }

    if (inSingle) {
      buf += ch;
      if (ch === "'" && next === "'") {
        buf += next;
        i++;
      }
      continue;
    }

    if (!dollarTag && ch === '"') {
      inDouble = !inDouble;
      buf += ch;
      continue;
    }

    if (inDouble) {
      buf += ch;
      continue;
    }

    if (!dollarTag && ch === '$') {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j++;
      if (j < input.length && input[j] === '$') {
        dollarTag = input.slice(i, j + 1);
        buf += dollarTag;
        i = j;
        continue;
      }
    }

    if (dollarTag) {
      if (input.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
      } else {
        buf += ch;
      }
      continue;
    }

    if (ch === ';') {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = '';
      continue;
    }

    buf += ch;
  }

  const tail = buf.trim();
  if (tail) statements.push(tail);

  return statements;
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node run-sql-file.cjs <path-to-sql-file>');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sqlFile = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(sqlFile)) {
    console.error(`SQL file does not exist: ${sqlFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(sqlFile, 'utf8');
  const statements = splitSqlStatements(source)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sql = neon(dbUrl);
  let executed = 0;

  for (const stmt of statements) {
    await sql.unsafe(stmt);
    executed += 1;
  }

  console.log(`EXECUTED_STATEMENTS:${executed}`);
}

main().catch((err) => {
  console.error(`RUN_SQL_FILE_ERROR:${err.message}`);
  process.exit(1);
});

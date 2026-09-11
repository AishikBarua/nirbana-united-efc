#!/usr/bin/env node
/**
 * Creates .env from .env.example if missing, and makes sure SESSION_SECRET
 * is actually a real random value (not empty, not the placeholder text).
 *
 * This exists because an earlier version of setup-and-run.bat generated the
 * secret with plain batch variables, which silently produced an EMPTY
 * SESSION_SECRET on some systems (a classic Windows batch "delayed
 * expansion" gotcha) — an empty/short secret makes every login attempt
 * fail (the server rejects it before checking the password at all), which
 * looks exactly like "wrong email or password" from the login page. This
 * script fixes that deterministically in Node instead of fragile batch
 * string-replacement, and is safe to run any number of times.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

const PLACEHOLDER = 'replace-this-with-a-long-random-string';
const MIN_SECRET_LENGTH = 32;

function generateSecret() {
  return crypto.randomBytes(48).toString('hex');
}

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(envExamplePath)) {
    console.error('[ensure-env] .env.example not found — cannot create .env.');
    process.exit(1);
  }
  fs.copyFileSync(envExamplePath, envPath);
  console.log('[ensure-env] Created .env from .env.example.');
}

let content = fs.readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);

let secretValue = '';
let secretLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^SESSION_SECRET\s*=\s*"?([^"]*)"?\s*$/);
  if (match) {
    secretLineIndex = i;
    secretValue = match[1];
    break;
  }
}

const needsNewSecret =
  secretLineIndex === -1 ||
  !secretValue ||
  secretValue === PLACEHOLDER ||
  secretValue.length < MIN_SECRET_LENGTH;

if (needsNewSecret) {
  const newSecret = generateSecret();
  const newLine = `SESSION_SECRET="${newSecret}"`;

  if (secretLineIndex === -1) {
    lines.push(newLine);
  } else {
    lines[secretLineIndex] = newLine;
  }

  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log('[ensure-env] Generated a new random SESSION_SECRET and saved it to .env.');
} else {
  console.log('[ensure-env] .env already has a valid SESSION_SECRET — left it untouched.');
}

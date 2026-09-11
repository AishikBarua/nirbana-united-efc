#!/usr/bin/env node
/**
 * Runs `npm install`, and if it fails with the classic Windows Prisma error
 *
 *   EPERM: operation not permitted, unlink '...\node_modules\.prisma\client\query_engine-windows.dll.node'
 *
 * automatically cleans up and retries once before giving up. This error
 * almost always means the Prisma query engine file is locked by something
 * still holding it open — most commonly a leftover "npm run dev" / previous
 * setup-and-run.bat window from an earlier session that never got closed
 * (Windows keeps a DLL locked for as long as any process has it loaded).
 * Antivirus real-time scanning or OneDrive sync on the project folder can
 * cause the same symptom.
 *
 * This script:
 *   1. Tries `npm install` normally.
 *   2. On failure, looks for and stops any node.exe processes that were
 *      started from this project folder (so it never touches unrelated
 *      Node processes on the machine), deletes the (possibly half-written,
 *      now-corrupt) node_modules\.prisma and node_modules\@prisma\client
 *      folders, waits a moment, then retries `npm install` once.
 *   3. If it still fails, prints plain-English next steps instead of a raw
 *      stack trace.
 */
const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot, ...opts });
}

function tryNpmInstall() {
  run('npm install');
}

function isWindows() {
  return process.platform === 'win32';
}

function killProjectNodeProcesses() {
  if (!isWindows()) return;
  try {
    // Find node.exe processes whose command line mentions this project's
    // folder, and stop only those — never a blanket "kill all node".
    const escapedRoot = projectRoot.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const psCommand =
      `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ` +
      `Where-Object { $_.CommandLine -and $_.CommandLine -like '*${escapedRoot}*' } | ` +
      `ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }`;
    execFileSync('powershell', ['-NoProfile', '-Command', psCommand], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
    console.log('[safe-install] Stopped any leftover Node processes for this project.');
  } catch {
    // Best-effort only — if PowerShell isn't reachable for some reason,
    // just move on to the file cleanup below.
  }
}

function removeIfExists(relPath) {
  const full = path.join(projectRoot, relPath);
  if (fs.existsSync(full)) {
    try {
      fs.rmSync(full, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      console.log(`[safe-install] Removed ${relPath}`);
    } catch (err) {
      console.log(`[safe-install] Could not remove ${relPath}: ${err.message}`);
    }
  }
}

function sleep(ms) {
  const buf = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buf, 0, 0, ms);
}

console.log('[safe-install] Running npm install...');
try {
  tryNpmInstall();
  console.log('[safe-install] npm install succeeded.');
  process.exit(0);
} catch {
  console.log('');
  console.log('[safe-install] npm install failed — this usually means a leftover');
  console.log('[safe-install] process from an earlier run is still holding a file open.');
  console.log('[safe-install] Attempting an automatic fix and retrying once...');
  console.log('');

  killProjectNodeProcesses();
  removeIfExists(path.join('node_modules', '.prisma'));
  removeIfExists(path.join('node_modules', '@prisma', 'client'));
  sleep(1500);

  try {
    tryNpmInstall();
    console.log('[safe-install] npm install succeeded on retry.');
    process.exit(0);
  } catch {
    console.log('');
    console.log('============================================');
    console.log(' npm install failed again.');
    console.log('============================================');
    console.log('This is almost always one of these three things:');
    console.log('');
    console.log('  1. Another window on this PC still has the site running');
    console.log('     (an old "npm run dev" or setup-and-run.bat window).');
    console.log('     Close every such window, then double-click');
    console.log('     setup-and-run.bat again.');
    console.log('');
    console.log('  2. Antivirus / Windows Defender is scanning the project');
    console.log('     folder in real time and briefly locking new files.');
    console.log('     Add an exclusion for this folder in Windows Security');
    console.log('     (Virus & threat protection > Manage settings >');
    console.log('     Exclusions), then try again.');
    console.log('');
    console.log('  3. This project folder is inside a OneDrive-synced folder');
    console.log('     and OneDrive is syncing it while npm writes files.');
    console.log('     Move the whole project folder outside OneDrive (e.g. to');
    console.log('     C:\\Projects\\nirbana-united-efc) and run it from there.');
    console.log('');
    console.log('After trying one of the above, double-click clean-and-retry.bat');
    console.log('to remove node_modules completely and reinstall from scratch.');
    console.log('============================================');
    process.exit(1);
  }
}

// Download acceptance test: click the primary download button on every locale's home page in a
// real browser and check that the file is the configured app archive, not a source zip or a
// placeholder.
//
//   BASE_URL=https://yomado.app/ npm run test:download
//   npm run test:download                  (builds nothing; serves dist/ like npm test)
//
// Verifies the SHA-256 and size, that the archive contains Yomado.app with the expected bundle
// identifier and version, and that the app executable is an arm64 Mach-O binary. The English page's
// archive is inspected in full; the Chinese and Japanese pages must deliver the identical file.

// Each locale's home below the site root (src/lib/site.ts).
const PAGES = ['', 'zh-cn/', 'ja/'];
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import assert from 'node:assert/strict';

const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
const RELEASE = config.release;

let server;
let base = process.env.BASE_URL;
if (!base) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  server = createServer(async (req, res) => {
    let file = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': extname(file) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
}

/** Minimal ZIP reader: the central directory, then stored or deflated entries. */
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  assert.ok(eocd >= 0, 'not a zip archive');
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    assert.equal(buf.readUInt32LE(offset), 0x02014b50, 'corrupt central directory');
    const method = buf.readUInt16LE(offset + 10);
    const compressed = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const local = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + compressed);
      return method === 0 ? data : inflateRawSync(data);
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function plistString(xml, key) {
  return xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1];
}

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const fetched = [];
for (const path of PAGES) {
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  const button = page.locator('a[data-download="hero"]');
  assert.equal(await button.getAttribute('href'), RELEASE.url, `/${path}: hero button points at the configured release`);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), button.click()]);
  const failure = await download.failure();
  assert.equal(failure, null, `/${path}: download failed: ${failure}`);
  fetched.push({ path, download, file: await readFile(await download.path()) });
}
const digest = (buf) => createHash('sha256').update(buf).digest('hex');
const [{ download, file }] = fetched;

const sha256 = digest(file);
const zip = readZip(file);
const plistEntry = zip.get('Yomado.app/Contents/Info.plist');
assert.ok(plistEntry, 'archive contains Yomado.app/Contents/Info.plist');
const plist = plistEntry().toString('utf8');
const executable = zip.get('Yomado.app/Contents/MacOS/Yomado')?.();
assert.ok(executable, 'archive contains the Yomado executable');
const arm64 = executable.readUInt32LE(0) === 0xfeedfacf && executable.readUInt32LE(4) === 0x0100000c;

const report = {
  page: base,
  clicked: RELEASE.url,
  finalUrlHost: new URL(download.url()).host,
  suggestedFilename: download.suggestedFilename(),
  bytes: file.length,
  sha256,
  bundleIdentifier: plistString(plist, 'CFBundleIdentifier'),
  version: plistString(plist, 'CFBundleShortVersionString'),
  build: plistString(plist, 'CFBundleVersion'),
  minimumSystemVersion: plistString(plist, 'LSMinimumSystemVersion'),
  executable: arm64 ? 'Mach-O 64-bit arm64' : 'unexpected',
  entries: zip.size,
  pages: fetched.map((f) => ({ page: base + f.path, suggestedFilename: f.download.suggestedFilename(), bytes: f.file.length, sha256: digest(f.file) })),
};

await browser.close();
server?.close();

console.log(JSON.stringify(report, null, 2));
assert.equal(report.suggestedFilename, RELEASE.fileName);
assert.equal(report.bytes, RELEASE.bytes, 'size');
assert.equal(report.sha256, RELEASE.sha256, 'SHA-256');
assert.equal(report.bundleIdentifier, RELEASE.bundleIdentifier, 'bundle identifier');
assert.equal(report.version, RELEASE.version, 'version');
assert.equal(report.build, RELEASE.build, 'build');
assert.equal(report.minimumSystemVersion, RELEASE.minimumSystemVersion, 'minimum macOS');
assert.ok(arm64, 'arm64 executable');
for (const f of report.pages) {
  assert.equal(f.suggestedFilename, RELEASE.fileName, `${f.page} file name`);
  assert.equal(f.sha256, RELEASE.sha256, `${f.page} SHA-256`);
}
console.log(`download: ok — the primary button on ${report.pages.length} pages delivers the configured app archive`);

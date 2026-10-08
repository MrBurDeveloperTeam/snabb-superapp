import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Exercise the actual loader emitted by the production build.
const loader = readFileSync(new URL('../dist/games/mole-game/index.js', import.meta.url), 'utf8');
const start = loader.indexOf('const chunkCounts = ');
const end = loader.indexOf('return responsePromise.then(function (response) {', start);
assert.ok(start >= 0 && end > start, 'Build the host before checking chunk loading.');
const download = new Function('file', 'location', 'fetch', loader.slice(start, end) + 'return responsePromise;');
const location = { href: 'https://game.example/games/cat-kart/index.html', origin: 'https://game.example' };
const requests = [];
const mockFetch = async url => {
  requests.push(url);
  return new Response(Uint8Array.of(Number(String(url).match(/part(\d+)/)?.[1] ?? 9)));
};
for (const [file, parts, mime] of [
  ['index.pck?v=53', 3, 'application/octet-stream'],
  ['/games/mole-game/index.wasm', 2, 'application/wasm'],
]) {
  requests.length = 0;
  const response = await download(file, location, mockFetch);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], Array.from({ length: parts }, (_, i) => i));
  assert.equal(response.headers.get('Content-Type'), mime);
  assert.equal(requests.length, parts);
  if (file.includes('?')) assert.ok(requests.every(url => url.endsWith('?v=53')));
}
requests.length = 0;
await download('/games/air-strike/index.pck', location, mockFetch);
assert.deepEqual(requests, ['/games/air-strike/index.pck']);
requests.length = 0;
await download('https://external.example/games/cat-kart/index.pck', location, mockFetch);
assert.deepEqual(requests, ['https://external.example/games/cat-kart/index.pck']);
await assert.rejects(download('index.pck', location, async () => new Response('', { status: 404 })), /Failed loading game asset chunk/);
console.log('Verified production chunk loader: PCK, WASM, query strings, ordinary files, external URLs and failed chunks.');

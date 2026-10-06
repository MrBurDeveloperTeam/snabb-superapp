import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const host = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const root = dirname(require.resolve('@mrburdeveloperteam/pet-function/package.json'));
const manifest = JSON.parse(readFileSync(join(root, 'package.json')));
const declared = JSON.parse(readFileSync(join(host, 'package.json'))).dependencies['@mrburdeveloperteam/pet-function'];
const expectedVersion = declared.startsWith('file:')
  ? JSON.parse(readFileSync(join(resolve(host, declared.slice(5)), 'package.json'))).version
  : declared.split('#v').at(-1);
assert.equal(manifest.version, expectedVersion);
assert.ok(!existsSync(join(host, 'public/games')), 'Host must not retain executable game copies.');
const canonical = join(root, 'public/games');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const files = walk(canonical);
for (const file of files) {
  const target = join(host, 'dist/games', relative(canonical, file));
  if (file.endsWith('.wasm') && !existsSync(target)) {
    const parts = [];
    for (let i = 0; existsSync(`${target}.part${i}`); i++) parts.push(readFileSync(`${target}.part${i}`));
    assert.ok(parts.length, `Missing WASM chunks: ${target}`);
    assert.ok(Buffer.concat(parts).equals(readFileSync(file)), `WASM content mismatch: ${target}`);
  } else if (file.endsWith('.js') && existsSync(`${target.slice(0, -3)}.wasm.part0`)) {
    const loader = readFileSync(target, 'utf8');
    assert.ok(loader.includes('Failed loading WASM chunk'), `Missing chunk loader: ${target}`);
  } else {
    assert.ok(readFileSync(target).equals(readFileSync(file)), `Game content mismatch: ${target}`);
  }
}
const expected = new Set(files.flatMap(file => {
  const name = relative(canonical, file);
  const target = join(host, 'dist/games', name);
  if (file.endsWith('.wasm') && !existsSync(target)) {
    const chunks = [];
    for (let i = 0; existsSync(`${target}.part${i}`); i++) chunks.push(`${name}.part${i}`);
    return chunks;
  }
  return [name];
}));
assert.deepEqual(new Set(walk(join(host, 'dist/games')).map(file => relative(join(host, 'dist/games'), file))), expected);
for (const game of ['flappy-cat', 'pac-cat', 'tetris', 'meowdoku', 'mole-game', 'stadium-football', 'stadium-hurdles']) {
  assert.ok(existsSync(join(host, 'dist/games', game, 'index.html')));
}
const gameCount = readdirSync(canonical, { withFileTypes: true }).filter(entry => entry.isDirectory()).length;
console.log(`Verified pet-function ${manifest.version}: ${files.length} canonical game files across ${gameCount} games, including reconstructed WASM chunks.`);

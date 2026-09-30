import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the build patches Godot to load every split WASM chunk in the browser', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');

  assert.match(config, /file\.endsWith\('index\.wasm'\)/);
  assert.match(config, /new Blob\(chunks, \{ type: 'application\/wasm' \}\)/);
  assert.match(config, /loaderSource\.replace\(fetchStatement, chunkFetchStatement\)/);
});

test('the Pages worker rebuilds the WASM response without cross-request streams', async () => {
  const worker = await readFile(new URL('../public/_worker.js', import.meta.url), 'utf8');

  assert.match(worker, /\['GET', 'HEAD'\]\.includes\(request\.method\)/);
  assert.match(worker, /partBuffers\.push\(await response\.arrayBuffer\(\)\)/);
  assert.match(worker, /'Content-Length': String\(body\.size\)/);
  assert.doesNotMatch(worker, /response\.body\.getReader\(\)/);
});

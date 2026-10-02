import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client() {
  const entries = new Map();
  const exports = {};
  const source = fs.readFileSync(new URL('../sharedPet/localPetRepository.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports, localStorage: { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) } });
  return exports.localGameClient;
}

test('local rankings keep only the best run, deduplicate runs, and survive reads', async () => {
  const game = client();
  assert.equal((await game.rpc('cat_dash_leaderboard')).data.entries.length, 0);
  await game.rpc('cat_dash_submit_run', { p_run_id: 'one', p_teeth: 80, p_elapsed_seconds: 30 });
  await game.rpc('cat_dash_submit_run', { p_run_id: 'one', p_teeth: 100, p_elapsed_seconds: 30 });
  await game.rpc('cat_dash_submit_run', { p_run_id: 'two', p_teeth: 30, p_elapsed_seconds: 15 });
  let ranking = (await game.rpc('cat_dash_leaderboard')).data;
  assert.equal(ranking.scope, 'local');
  assert.equal(ranking.entries.length, 1);
  assert.equal(ranking.entries[0].teeth, 80);
  await game.rpc('cat_dash_submit_run', { p_run_id: 'three', p_teeth: 110, p_elapsed_seconds: 50 });
  assert.equal((await game.rpc('cat_dash_leaderboard')).data.entries[0].teeth, 110);
});

test('invalid scores do not change rankings', async () => {
  const game = client();
  for (const score of [-1, NaN, 1.5]) assert.ok((await game.rpc('cat_dash_submit_run', { p_run_id: 'bad', p_teeth: score, p_elapsed_seconds: 20 })).error);
  assert.equal((await game.rpc('cat_dash_leaderboard')).data.entries.length, 0);
});

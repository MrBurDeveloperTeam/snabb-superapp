import { createRequire } from 'node:module';
import { readFileSync as readResource } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';

const require = createRequire(import.meta.url);
const host = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = dirname(require.resolve('@mrburdeveloperteam/pet-function/package.json'));
// Use an explicitly enabled sibling build for local development fixes.
if (process.env.SNABBB_USE_LOCAL_PET === '1') {
  const local = resolve(host, '../pet-function');
  const installedVersion = JSON.parse(readResource(join(root, 'package.json'))).version;
  if (JSON.parse(readResource(join(local, 'package.json'))).version !== installedVersion) throw new Error('Local pet-function version must match the installed release.');
  if (!existsSync(join(local, 'dist/pet.js'))) throw new Error('Build ../pet-function before enabling the local pet runtime.');
  function copyBuild(dir = '') {
    for (const entry of readdirSync(join(local, 'dist', dir), { withFileTypes: true })) {
      const name = join(dir, entry.name);
      if (entry.isDirectory()) copyBuild(name);
      else { const target = join(root, 'dist', name); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(local, 'dist', name), target); }
    }
  }
  copyBuild();
  copyFileSync(join(local, 'public/games/stadium-football/index.html'), join(root, 'public/games/stadium-football/index.html'));
  copyFileSync(join(local, 'public/games/stadium-football/index.pck'), join(root, 'public/games/stadium-football/index.pck'));
  copyFileSync(join(local, 'public/pet-function/rooms-wide/sports-ground-kart.png'), join(root, 'public/pet-function/rooms-wide/sports-ground-kart.png'));
  for (const file of readdirSync(join(local, 'public/games/cat-kart'))) {
    const target = join(root, 'public/games/cat-kart', file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(local, 'public/games/cat-kart', file), target);
  }
  console.log('Using local pet-function build:', local);
}
if (!existsSync(join(root, 'public'))) throw new Error('Installed pet-function package has no public resources: ' + root);
rmSync(join(host, 'public', 'molar-experience'), { recursive: true, force: true });
rmSync(join(host, 'public', 'images', 'cat-meow.mp3'), { force: true });
function copyResources(relative = '') {
  for (const entry of readdirSync(join(root, 'public', relative), { withFileTypes: true })) {
    const name = join(relative, entry.name);
    const parts = name.split(/[\\/]/);
    if (parts[0] === 'games' || parts[0] === 'pets') continue;
    if (parts[0] === 'images' && parts.at(-1) !== 'cat-meow.mp3') continue;
    if (entry.isDirectory()) copyResources(name);
    else {
      const target = join(host, 'public', name);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, 'public', name), target);
      if (!readResource(join(root, 'public', name)).equals(readResource(target))) throw new Error('Shared resource copy mismatch: ' + target);
    }
  }
}
copyResources();
for (const required of ['pet-function/pet/grey_bed.png', 'pet-function/pet/red_bed.png', 'pet-function/pet/purple_bed.png', 'pet-function/pets/mallow-spritesheet.webp']) {
  if (!existsSync(join(host, 'public', required))) throw new Error('Missing prepared pet-function resource: public/' + required);
}
console.log('Pet resources prepared from:', root);

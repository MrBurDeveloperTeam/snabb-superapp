import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const targets = [
  'components/CatMascot.tsx',
  'petExperience/AppGalleryVirtualPet.tsx',
  'petExperience/appGalleryPetRepository.ts',
  'aiExperience/appGalleryMolarAdapter.ts',
  'features/aiExperience/contracts/insightCandidate.ts',
  'features/petDialogue/appointmentTimeUtils.ts',
  'features/petDialogue/dateUtils.ts',
  'features/petDialogue/dialogueFlag.ts',
  'features/petDialogue/knownRoutes.ts',
  'features/petDialogue/nameResolution.ts',
  'features/petDialogue/resolveDialogue.ts',
  'features/petDialogue/safeTaskTitle.ts',
  'features/petDialogue/selectDialogueCandidate.ts',
  'features/petDialogue/sessionDedupe.ts',
  'features/petDialogue/types.ts',
  'features/petDialogue/usePersonalizedPetDialogue.ts',
  'features/petDialogue/providers/appointmentSnapshotProvider.ts',
  'features/petDialogue/providers/appointmentSoonProvider.ts',
  'features/petDialogue/providers/expiredInventoryProvider.ts',
  'features/petDialogue/providers/expiringSoonInventoryProvider.ts',
  'features/petDialogue/providers/inventorySnapshotProvider.ts',
  'features/petDialogue/providers/legacyIntroProvider.ts',
  'features/petDialogue/providers/lowStockInventoryProvider.ts',
  'features/petDialogue/providers/overdueTaskProvider.ts',
  'features/petDialogue/providers/profileProvider.ts',
  'features/petDialogue/providers/taskTodayProvider.ts',
  'features/petDialogue/providers/todoSnapshotProvider.ts',
  'features/petDialogue/providers/todoTaskFilters.ts',
];

for (const relativePath of targets) {
  const file = resolve(root, relativePath);
  const source = readFileSync(file, 'utf8');
  if (source.startsWith('// LEGACY CAT CODE: inactive')) continue;
  const archived = source.split(/\r?\n/).map((line) => `// legacy-line: ${JSON.stringify(line)}`).join('\n');
  writeFileSync(
    file,
    `// LEGACY CAT CODE: inactive; preserved reversibly as JSON-encoded comment lines.\n// Active implementation now comes from @mrburdeveloperteam/pet-function/apps/superapp via sharedPet/.\n${archived}\n`,
    'utf8',
  );
}

console.log(`Archived ${targets.length} Superapp cat source files as comments.`);

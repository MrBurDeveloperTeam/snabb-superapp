// Small typed helper so the raw env check lives in exactly one place instead
// of being scattered across CatMascot/App as inline `import.meta.env` reads.
export function isPersonalizedPetDialogueEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_PERSONALIZED_PET_DIALOGUE === 'true';
}

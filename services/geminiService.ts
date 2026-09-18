import { createSuperappSNAIService } from '@mrburdeveloperteam/pet-function/apps/superapp';
import { supabase } from './supabaseClient';
export const { chatWithGemini } = createSuperappSNAIService(supabase);
export type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] };

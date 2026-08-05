import { supabase } from '@/services/supabaseClient';
import { DIALOGUE_ID, PET_DIALOGUE_RULE_VERSION } from '../types';
import type { DialogueCandidate } from '../types';

export interface LegacyIntroResult {
  candidate: DialogueCandidate | null;
  steps: string[];
}

/**
 * Mirrors the existing Post-Login Intro query in CatMascot's legacy
 * `initDialog()` effect (module_name='Snabbb.io', is_post_login=true for
 * logged-in users). This is an intentional, small duplication of that query
 * rather than a shared extraction: the legacy (flag-disabled) code path in
 * CatMascot must stay completely untouched by this feature, so its
 * Supabase calls are left exactly as they were. See the Phase 1A
 * implementation report for this trade-off.
 */
export async function fetchLegacyIntroCandidate(
  userId: string,
  alreadyCompleted: boolean,
  signal?: AbortSignal
): Promise<LegacyIntroResult> {
  if (!userId || alreadyCompleted) return { candidate: null, steps: [] };

  try {
    const { data: configs, error: configsError } = await supabase
      .from('aiboard_simulator_configs')
      .select('id')
      .eq('module_name', 'Snabbb.io')
      .limit(1)
      .abortSignal(signal as AbortSignal);

    if (configsError || !configs || configs.length === 0) {
      return { candidate: null, steps: [] };
    }

    const configId = configs[0].id;

    const { data, error } = await supabase
      .from('aiboard_simulator_dialog_steps')
      .select('step_text, sort_order')
      .eq('config_id', configId)
      .eq('is_post_login', true)
      .order('sort_order', { ascending: true })
      .abortSignal(signal as AbortSignal);

    if (error) return { candidate: null, steps: [] };

    const steps = (data || [])
      .map((d: { step_text: unknown }) => d.step_text)
      .filter((text: unknown): text is string => typeof text === 'string' && text.trim().length > 0);

    if (steps.length === 0) return { candidate: null, steps: [] };

    const candidate: DialogueCandidate = {
      userState: 'LEGACY_POST_LOGIN_INTRO',
      dialogueId: DIALOGUE_ID.LEGACY_POST_LOGIN_INTRO,
      priority: 'LEGACY_INTRO',
      message: steps[0],
      source: { app: 'aiboard', recordId: String(configId), evaluatedAt: new Date().toISOString() },
      dedupeKey: `legacy_intro:${userId}`,
      ruleVersion: PET_DIALOGUE_RULE_VERSION,
      recordId: String(configId),
    };

    return { candidate, steps };
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return { candidate: null, steps: [] };
    console.warn('[petDialogue] legacy intro check failed');
    return { candidate: null, steps: [] };
  }
}

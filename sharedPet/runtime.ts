import { configureSuperappHostDependencies } from '@mrburdeveloperteam/pet-function/apps/superapp';
import { supabase } from '../services/supabaseClient';
import { useCreateAppLink } from '../mutation/useCreateAppLink';
import { getAuthUser } from '../utils/authStorage';
import { MINI_APPS } from '../constants';

configureSuperappHostDependencies({
  supabase,
  useCreateAppLink,
  getAuthUser,
  miniApps: MINI_APPS,
  personalizedDialogueEnabled: import.meta.env.VITE_ENABLE_PERSONALIZED_PET_DIALOGUE === 'true',
});

import { SharedMeowdokuLauncher } from '@mrburdeveloperteam/pet-function/pet';
import { createAppGalleryPetRepository } from '@mrburdeveloperteam/pet-function/apps';
import { supabase } from '../services/supabaseClient';

const appGalleryPetRepository = createAppGalleryPetRepository(supabase);

interface MeowdokuLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function MeowdokuLauncher(props: MeowdokuLauncherProps) {
  return <SharedMeowdokuLauncher key={props.userId} {...props} repository={appGalleryPetRepository} rpcClient={supabase} />;
}

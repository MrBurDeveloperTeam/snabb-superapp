import { SharedMeowdokuLauncher } from '@mrburdeveloperteam/pet-function/pet';
import { supabase } from '../services/supabaseClient';
import { appGalleryPetRepository } from './appGalleryPetRepository';

interface MeowdokuLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function MeowdokuLauncher(props: MeowdokuLauncherProps) {
  return <SharedMeowdokuLauncher key={props.userId} {...props} repository={appGalleryPetRepository} rpcClient={supabase} />;
}

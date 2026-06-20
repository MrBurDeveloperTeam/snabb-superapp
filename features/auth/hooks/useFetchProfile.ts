import { supabase } from "@/services/supabaseClient"
import { Profile } from "@/types/Profile"
import { normalizePrivateProfile } from "../helper/Normalize"

export async function fetchProfile(userId: string) {
  const [{ data: profile, error: profileError }, { count, error: countError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', userId)
        .eq('status', 'published'),
    ])

  if (profileError) throw profileError
  if (countError) throw countError
  if (!profile) return null

  return normalizePrivateProfile({
    ...profile,
    video_count: count ?? profile.video_count ?? 0,
  } as Profile)
}
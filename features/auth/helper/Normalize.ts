import { Profile } from "@/types/Profile"

export function normalizePrivateProfile(profile: Profile | null): Profile | null {
  if (!profile) return null

  return {
    ...profile,
    video_count: profile.video_count ?? 0,
  }
}
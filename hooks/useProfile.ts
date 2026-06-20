import { fetchProfile } from "@/features/auth/hooks/useFetchProfile";
import { useQuery } from "@tanstack/react-query";

export function useProfile(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: enabled && !!userId,
  })
}
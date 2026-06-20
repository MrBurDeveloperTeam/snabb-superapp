export interface Profile {
  user_id: string
  email: string
  name: string | null
  full_name: string | null
  username: string | null
  account_type:
    | 'individual'
    | 'company'
    | 'admin'
    | null
  plan: string | null
  role: 'member' | 'creator' | 'admin'
  phone: string | null
  position: string | null
  company_name: string | null
  avatar_url: string | null
  background_url: string | null
  clinic_id: string | null
  status: string | null
  specialty: string | null
  bio: string | null
  registration_number: string | null
  institution: string | null
  is_verified: boolean
  is_creator: boolean
  follower_count: number
  following_count: number
  video_count: number
  created_at: string
  updated_at: string
}
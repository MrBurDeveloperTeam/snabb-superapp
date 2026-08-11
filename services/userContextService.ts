/**
 * userContextService.ts
 *
 * Fetches personalized user data from the APP Gallery Supabase project
 * to enrich the Molar AI chat system prompt.
 */
import { supabase } from './supabaseClient';

export interface UserChatContext {
  profile: {
    name: string | null;
    email: string;
    role: string | null;
    specialty: string | null;
    accountType: string | null;
    isVerified: boolean;
    isCreator: boolean;
    followerCount: number;
    videoCount: number;
    bio: string | null;
    institution: string | null;
    registrationNumber: string | null;
  } | null;
  appointments: Array<{
    date: string;
    startTime: string;
    status: string | null;
    notes: string | null;
  }>;
  inventoryRooms: Array<{
    id: string;
    name: string;
  }>;
  inventoryItems: Array<{
    name: string;
    brand: string | null;
    quantity: number;
    category: string | null;
    expiryDate: string | null;
    uom: string | null;
  }>;
  clinicMemberships: Array<{
    clinicName: string;
    role: string;
  }>;
  profitPlans: Array<{
    name: string;
    type: string;
    date: string;
  }>;
  profitProcedures: Array<{
    name: string;
    price: number;
    duration: number;
  }>;
}

/**
 * Fetches all relevant user data from Supabase given the user's auth email.
 * Returns null fields gracefully if data doesn't exist.
 */
export async function fetchUserChatContext(userEmail: string): Promise<UserChatContext> {
  const ctx: UserChatContext = {
    profile: null,
    appointments: [],
    inventoryRooms: [],
    inventoryItems: [],
    clinicMemberships: [],
    profitPlans: [],
    profitProcedures: [],
  };

  if (!userEmail) return ctx;

  try {
    // 1. Fetch profile by email
    const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, name, email, account_type, role, specialty, is_verified, is_creator, follower_count, video_count, bio, institution, registration_number')
        .limit(1);
        
      // Get the FIRST item if array, or use directly if single object
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        
      if (!profile) return ctx; // This checks if profile exists after indexing
        
      ctx.profile = {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        specialty: profile.specialty,
        accountType: profile.account_type,
        isVerified: profile.is_verified,
        isCreator: profile.is_creator,
        followerCount: profile.follower_count,
        videoCount: profile.video_count,
        bio: profile.bio,
        institution: profile.institution,
        registrationNumber: profile.registration_number,
      };

    const userId = profile.user_id;

    // 2. Fetch clinic memberships
    const { data: membershipData } = await supabase
      .from('apt_clinic_members')
      .select('role, apt_clinics(name)')
      .eq('user_id', userId);

    if (membershipData) {
      ctx.clinicMemberships = membershipData.map((m: any) => ({
        clinicName: m.apt_clinics?.name ?? 'Unknown Clinic',
        role: m.role,
      }));
    }

    // 3. Fetch upcoming / recent appointments via the user's clinics
    // We'll fetch appointments across all clinics the user belongs to
    const clinicIds = membershipData?.map((m: any) => m.apt_clinics?.id).filter(Boolean) ?? [];

    if (clinicIds.length > 0) {
      const { data: apptData } = await supabase
        .from('appointments')
        .select('date, start_time, status, notes')
        .in('clinic_id', clinicIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // last 30 days
        .order('date', { ascending: false })
        .limit(20);

      if (apptData) ctx.appointments = apptData.map((a: any) => ({
        date: a.date,
        startTime: a.start_time,
        status: a.status,
        notes: a.notes,
      }));
    }

    // 4. Fetch inventory rooms owned by this user
    const { data: roomData } = await supabase
      .from('inventory_rooms')
      .select('id, name')
      .eq('user_id', userId);

    if (roomData) ctx.inventoryRooms = roomData.map((r: any) => ({ id: r.id, name: r.name }));

    // 5. Fetch inventory items owned by this user
    if (roomData && roomData.length > 0) {
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('name, brand, quantity, category, expiry_date, uom')
        .eq('user_id', userId)
        .limit(100);

      if (itemData) ctx.inventoryItems = itemData.map((i: any) => ({
        name: i.name,
        brand: i.brand,
        quantity: Number(i.quantity),
        category: i.category,
        expiryDate: i.expiry_date,
        uom: i.uom,
      }));
    }

    // 6. Fetch Profit Calculator context
    const { data: planData } = await supabase
      .from('calc_saved_plans')
      .select('name, type, date')
      .eq('user_id', userId)
      .limit(5);
    
    if (planData) ctx.profitPlans = planData.map(p => ({
      name: p.name,
      type: p.type,
      date: p.date
    }));

    const { data: procData } = await supabase
      .from('calc_saved_procedures')
      .select('name, price, duration')
      .eq('user_id', userId)
      .limit(10);
    
    if (procData) ctx.profitProcedures = procData.map(p => ({
      name: p.name,
      price: Number(p.price),
      duration: Number(p.duration)
    }));

  } catch (err) {
    console.warn('[MolarAI] Could not fetch user context:', err);
  }

  return ctx;
}

/**
 * Converts the UserChatContext into a clean string block
 * to be injected into the Gemini system prompt.
 */
export function buildUserContextString(ctx: UserChatContext): string {
  if (!ctx.profile) {
    return 'No user profile found. The user is browsing as a guest.';
  }

  const lines: string[] = [];

  const p = ctx.profile;
  lines.push(`## User Profile`);
  lines.push(`- **Name**: ${p.name || 'Not set'}`);
  lines.push(`- **Email**: ${p.email}`);
  lines.push(`- **Role**: ${p.role || 'member'}`);
  lines.push(`- **Specialty**: ${p.specialty || 'Not specified'}`);
  lines.push(`- **Account Type**: ${p.accountType || 'individual'}`);
  lines.push(`- **Verified**: ${p.isVerified ? 'Yes ✅' : 'No'}`);
  lines.push(`- **Creator**: ${p.isCreator ? 'Yes' : 'No'} (${p.videoCount} videos, ${p.followerCount} followers)`);
  if (p.institution) lines.push(`- **Institution**: ${p.institution}`);
  if (p.registrationNumber) lines.push(`- **Registration No.**: ${p.registrationNumber}`);
  if (p.bio) lines.push(`- **Bio**: ${p.bio}`);

  if (ctx.clinicMemberships.length > 0) {
    lines.push(`\n## Clinic Memberships`);
    ctx.clinicMemberships.forEach(m => {
      lines.push(`- ${m.clinicName} (Role: **${m.role}**)`);
    });
  }

  if (ctx.appointments.length > 0) {
    lines.push(`\n## Recent / Upcoming Appointments (last 30 days)`);
    ctx.appointments.slice(0, 10).forEach(a => {
      lines.push(`- ${a.date} at ${a.startTime} — Status: **${a.status || 'unknown'}**${a.notes ? ` — Note: ${a.notes}` : ''}`);
    });
  }

  if (ctx.inventoryRooms.length > 0) {
    lines.push(`\n## Inventory Rooms (${ctx.inventoryRooms.length} total)`);
    ctx.inventoryRooms.forEach(r => lines.push(`- ${r.name} (ID: ${r.id})`));
  }

  if (ctx.inventoryItems.length > 0) {
    lines.push(`\n## Inventory Items (${ctx.inventoryItems.length} total)`);
    const now = new Date();
    ctx.inventoryItems.forEach(item => {
      let expNote = '';
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        const daysLeft = Math.floor((exp.getTime() - now.getTime()) / (1000 * 86400));
        if (daysLeft < 0) expNote = ' **(EXPIRED)**';
        else if (daysLeft <= 30) expNote = ` **(expires in ${daysLeft}d)**`;
      }
      lines.push(`- **${item.name}** (${item.brand || 'no brand'}): ${item.quantity} ${item.uom || 'pcs'}, category: ${item.category || 'N/A'}${expNote}`);
    });
  }

  if (ctx.profitPlans.length > 0) {
    lines.push(`\n## Profit Calculator Plans`);
    ctx.profitPlans.forEach(p => {
      lines.push(`- **${p.name}** (${p.type}) — Saved on: ${p.date.split('T')[0]}`);
    });
  }

  if (ctx.profitProcedures.length > 0) {
    lines.push(`\n## Profit Calculator Procedures`);
    ctx.profitProcedures.forEach(p => {
      lines.push(`- **${p.name}**: Price: RM${p.price}, Duration: ${p.duration} mins`);
    });
  }

  return lines.join('\n');
}

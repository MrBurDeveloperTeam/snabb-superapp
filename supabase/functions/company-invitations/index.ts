import { createClient } from 'npm:@supabase/supabase-js@2.103.3';

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json'}});
const hash = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:cors});
  try {
    const body=await req.json();
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(url,service);
    const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});

    if (body.action==='get' || body.action==='accept') {
      const tokenHash=await hash(String(body.token||''));
      const {data:invite}=await admin.from('company_invitations').select('*').eq('token_hash',tokenHash).eq('status','pending').gt('expires_at',new Date().toISOString()).maybeSingle();
      if(!invite) return reply({ok:false,message:'This invitation is invalid or expired.'},404);
      if(body.action==='get') {
        const {data:owner}=await admin.from('profiles').select('company_name,name,full_name').eq('user_id',invite.company_owner_user_id).single();
        return reply({ok:true,invitation:{email:invite.email,role:invite.role,companyName:owner?.company_name||owner?.name||owner?.full_name||'the company',expiresAt:invite.expires_at}});
      }
      const {data:member}=await admin.from('profiles').select('user_id').ilike('email',invite.email).maybeSingle();
      if(!member) return reply({ok:false,message:'Create the invited account before accepting this invitation.'},409);
      const {data:companyOwner,error:ownerError}=await admin.from('profiles').select('company_name').eq('user_id',invite.company_owner_user_id).single();
      if(ownerError) throw ownerError;
      const {error:profileError}=await admin.from('profiles').update({account_type:'company_member',company_name:companyOwner.company_name}).eq('user_id',member.user_id);
      if(profileError) throw profileError;
      const {error:memberError}=await admin.from('company_members').insert({company_owner_user_id:invite.company_owner_user_id,member_user_id:member.user_id,role:invite.role,status:'active'});
      if(memberError && memberError.code!=='23505') throw memberError;
      const {error:inviteError}=await admin.from('company_invitations').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',invite.id).eq('status','pending');
      if(inviteError) throw inviteError;
      return reply({ok:true});
    }

    const {data:auth}=await caller.auth.getUser();
    if(!auth.user) return reply({ok:false,message:'Authentication required.'},401);
    const {data:owner}=await admin.from('profiles').select('user_id,email,name,full_name,company_name,account_type').eq('user_id',auth.user.id).single();
    if(owner?.account_type!=='company') return reply({ok:false,message:'Only company accounts can manage members.'},403);

    if(body.action==='list') {
      const {data:rows,error}=await admin.from('company_members').select('*').eq('company_owner_user_id',auth.user.id).eq('status','active').order('joined_at');
      if(error) throw error;
      const ids=(rows||[]).map(r=>r.member_user_id);
      const {data:profiles}=ids.length?await admin.from('profiles').select('user_id,email,name,full_name').in('user_id',ids):{data:[]};
      const map=new Map((profiles||[]).map(p=>[p.user_id,p]));
      const members=(rows||[]).map(r=>({...r,email:map.get(r.member_user_id)?.email||'',name:map.get(r.member_user_id)?.full_name||map.get(r.member_user_id)?.name||''}));
      const {data:invitations,error:inviteError}=await admin.from('company_invitations').select('id,email,role,status,created_at,expires_at').eq('company_owner_user_id',auth.user.id).eq('status','pending').order('created_at',{ascending:false});
      if(inviteError) throw inviteError;
      return reply({ok:true,members,invitations:invitations||[]});
    }

    if(body.action==='create') {
      const email=String(body.email||'').trim().toLowerCase(), role=String(body.role||'').toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(email)) return reply({ok:false,message:'Enter a valid email address.'},400);
      if(!['admin','dentist','nurse','reception'].includes(role)) return reply({ok:false,message:'Select a valid role.'},400);
      const raw=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''), expiresAt=new Date(Date.now()+7*86400000).toISOString();
      const {error}=await admin.from('company_invitations').insert({company_owner_user_id:auth.user.id,email,role,token_hash:await hash(raw),status:'pending',invited_by_user_id:auth.user.id,expires_at:expiresAt});
      if(error) throw error;
      const inviteUrl=`${Deno.env.get('APP_URL')||'https://app.snabbb.com'}/company-member-signup?token=${encodeURIComponent(raw)}`;
      const companyName=owner.company_name||owner.name||owner.full_name||'your company';
      // The browser opens the owner's own email client. No sender is impersonated
      // and no email-provider credentials are stored in this function.
      return reply({ok:true,inviteUrl,companyName});
    }
    return reply({ok:false,message:'Unknown action.'},400);
  } catch(error) { console.error(error); return reply({ok:false,message:error instanceof Error?error.message:'Unexpected server error.'},500); }
});

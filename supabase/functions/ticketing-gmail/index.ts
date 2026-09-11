import { createClient } from 'npm:@supabase/supabase-js@2.103.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ticketing-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const gmailBase = 'https://gmail.googleapis.com/gmail/v1/users/me';

type SupabaseAdmin = ReturnType<typeof createClient>;
type GmailPart = { mimeType?: string; filename?: string; headers?: Array<{ name?: string; value?: string }>; body?: { data?: string; attachmentId?: string; size?: number }; parts?: GmailPart[] };
type GmailMessage = { id: string; threadId?: string; internalDate?: string; snippet?: string; payload?: GmailPart };

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function fromBase64Url(value = '') {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function headers(payload?: GmailPart) {
  return Object.fromEntries((payload?.headers || []).map((item) => [String(item.name || '').toLowerCase(), String(item.value || '')]));
}

function parseAddress(value: string) {
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim() || match[2].trim(), email: match[2].trim().toLowerCase() };
  const email = value.trim().replace(/^mailto:/i, '').toLowerCase();
  return { name: email, email };
}

function messageText(payload?: GmailPart) {
  const plain: string[] = [], html: string[] = [];
  const visit = (part?: GmailPart) => {
    if (!part) return;
    const body = part.body?.data ? fromBase64Url(part.body.data) : '';
    if (body && part.mimeType === 'text/plain') plain.push(body);
    if (body && part.mimeType === 'text/html') html.push(body.replace(/<[^>]*>/g, ' '));
    (part.parts || []).forEach(visit);
  };
  visit(payload);
  return (plain.length ? plain.join('\n\n') : html.join('\n\n')).replace(/\s+\n/g, '\n').trim();
}

function attachmentParts(payload?: GmailPart) {
  const result: GmailPart[] = [];
  const visit = (part?: GmailPart) => {
    if (!part) return;
    if (part.filename && (part.body?.attachmentId || part.body?.data)) result.push(part);
    (part.parts || []).forEach(visit);
  };
  visit(payload);
  return result;
}

async function accessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GMAIL_CLIENT_ID'), client_secret: env('GMAIL_CLIENT_SECRET'),
      refresh_token: env('GMAIL_REFRESH_TOKEN'), grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Unable to refresh Gmail access token.');
  return String(data.access_token);
}

async function gmail<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gmailBase}${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Gmail API error ${response.status}`);
  return data as T;
}

async function findUser(admin: SupabaseAdmin, email: string) {
  const { data } = await admin.from('profiles').select('user_id').ilike('email', email).limit(1).maybeSingle();
  return data?.user_id || null;
}

async function importAttachments(admin: SupabaseAdmin, token: string, gmailMessage: GmailMessage, ticketId: string, messageId: string | null) {
  let total = 0;
  for (const part of attachmentParts(gmailMessage.payload)) {
    let encoded = part.body?.data || '';
    if (part.body?.attachmentId) {
      const fetched = await gmail<{ data?: string }>(token, `/messages/${gmailMessage.id}/attachments/${part.body.attachmentId}`);
      encoded = fetched.data || '';
    }
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
    total += bytes.byteLength;
    if (bytes.byteLength > 10 * 1024 * 1024 || total > 25 * 1024 * 1024) throw new Error('Gmail attachments exceed the configured size limit.');
    const original = String(part.filename || 'attachment').slice(0, 255);
    const safe = original.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${ticketId}/gmail/${crypto.randomUUID()}-${safe}`;
    const { error: uploadError } = await admin.storage.from('ticket-attachments').upload(path, bytes, { contentType: part.mimeType || 'application/octet-stream' });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await admin.from('support_ticket_attachments').insert({ ticket_id: ticketId, message_id: messageId, uploaded_by: null, storage_path: path, file_name: original, mime_type: part.mimeType || null, file_size: bytes.byteLength });
    if (metadataError) throw metadataError;
  }
}

async function processIncoming(admin: SupabaseAdmin, token: string, message: GmailMessage, mailbox: string) {
  if (!message.id) return false;
  const { data: duplicate } = await admin.from('support_ticket_messages').select('id').eq('gmail_message_id', message.id).maybeSingle();
  const { data: initialDuplicate } = await admin.from('support_tickets').select('id').eq('initial_gmail_message_id', message.id).maybeSingle();
  if (duplicate || initialDuplicate) return false;
  const h = headers(message.payload), sender = parseAddress(h.from || '');
  if (!sender.email || sender.email === mailbox.toLowerCase()) return false;
  const body = messageText(message.payload) || message.snippet || 'Email message has no text body.';
  const createdBy = await findUser(admin, sender.email);
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
  const { data: existing } = message.threadId ? await admin.from('support_tickets').select('*').eq('gmail_thread_id', message.threadId).maybeSingle() : { data: null };
  if (existing) {
    const { data: inserted, error } = await admin.from('support_ticket_messages').insert({ ticket_id: existing.id, author_id: createdBy, author_name: sender.name, author_email: sender.email, body, is_internal: false, direction: 'incoming', source: 'gmail', gmail_message_id: message.id, gmail_thread_id: message.threadId || null, rfc_message_id: h['message-id'] || null, delivery_status: 'received', gmail_received_at: receivedAt }).select('id').single();
    if (error) throw error;
    await importAttachments(admin, token, message, existing.id, inserted.id);
  } else {
    const { data: ticket, error } = await admin.from('support_tickets').insert({ created_by: createdBy, requester_name: sender.name, requester_email: sender.email, subject: h.subject || 'Email support request', description: body, category: null, priority: '1', status: 'request', source: 'email', gmail_thread_id: message.threadId || null, initial_gmail_message_id: message.id, last_gmail_message_id: message.id, created_at: receivedAt, last_activity_at: receivedAt }).select('id').single();
    if (error) throw error;
    await importAttachments(admin, token, message, ticket.id, null);
  }
  return true;
}

async function syncInbox(admin: SupabaseAdmin) {
  const mailbox = env('GMAIL_SUPPORT_EMAIL').toLowerCase(), token = await accessToken();
  const { data: state } = await admin.from('support_gmail_sync_state').select('*').eq('mailbox_email', mailbox).maybeSingle();
  if (!state) {
    const { error } = await admin.from('support_gmail_sync_state').insert({ mailbox_email: mailbox, last_sync_at: new Date().toISOString(), last_success_at: new Date().toISOString() });
    if (error) throw error;
    return { initialized: true, processed: 0, message: 'Checkpoint created. Only email received after this point will be imported.' };
  }
  const cutoff = Math.floor(new Date(state.created_at).getTime() / 1000);
  let processed = 0;
  try {
    const listing = await gmail<{ messages?: Array<{ id: string }> }>(token, `/messages?labelIds=INBOX&maxResults=100&q=${encodeURIComponent(`after:${cutoff}`)}`);
    for (const item of [...(listing.messages || [])].reverse()) {
      const message = await gmail<GmailMessage>(token, `/messages/${item.id}?format=full`);
      processed += Number(await processIncoming(admin, token, message, mailbox));
    }
    await admin.from('support_gmail_sync_state').update({ last_sync_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null }).eq('mailbox_email', mailbox);
    return { initialized: false, processed };
  } catch (error) {
    await admin.from('support_gmail_sync_state').update({ last_sync_at: new Date().toISOString(), last_error_at: new Date().toISOString(), last_error: error instanceof Error ? error.message : String(error) }).eq('mailbox_email', mailbox);
    throw error;
  }
}

async function sendReply(admin: SupabaseAdmin, userId: string, ticketId: string, body: string) {
  const { data: profile } = await admin.from('profiles').select('account_type').eq('user_id', userId).single();
  if (profile?.account_type !== 'admin') throw new Error('Admin access required.');
  const { data: ticket, error } = await admin.from('support_tickets').select('*').eq('id', ticketId).single();
  if (error || !ticket) throw error || new Error('Ticket not found.');
  if (!ticket.gmail_thread_id) throw new Error('This ticket did not originate from Gmail.');
  if (!ticket.requester_email) throw new Error('This Gmail ticket has no requester email.');
  const token = await accessToken(), mailbox = env('GMAIL_SUPPORT_EMAIL');
  const subject = /^re:/i.test(ticket.subject) ? ticket.subject : `Re: ${ticket.subject}`;
  const raw = [`From: ${mailbox}`, `To: ${ticket.requester_email}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', body].join('\r\n');
  const sent = await gmail<{ id: string; threadId: string }>(token, '/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: toBase64Url(raw), threadId: ticket.gmail_thread_id }) });
  const { data: inserted, error: insertError } = await admin.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_id: userId, body, is_internal: false, direction: 'outgoing', source: 'gmail', gmail_message_id: sent.id, gmail_thread_id: sent.threadId, delivery_status: 'sent' }).select('*').single();
  if (insertError) throw insertError;
  return inserted;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ ok: false, message: 'Method not allowed.' }, 405);
  try {
    const url = env('SUPABASE_URL'), serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await request.json().catch(() => ({}));
    if (body.action === 'sync') {
      if (request.headers.get('x-ticketing-cron-secret') !== env('TICKETING_GMAIL_CRON_SECRET')) return json({ ok: false, message: 'Unauthorized.' }, 401);
      return json({ ok: true, ...(await syncInbox(admin)) });
    }
    if (body.action === 'send_reply') {
      const caller = createClient(url, env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: request.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
      const { data: auth } = await caller.auth.getUser();
      if (!auth.user) return json({ ok: false, message: 'Authentication required.' }, 401);
      const ticketId = String(body.ticket_id || ''), messageBody = String(body.body || '').trim();
      if (!ticketId || !messageBody || messageBody.length > 20000) return json({ ok: false, message: 'A valid ticket and reply are required.' }, 400);
      return json({ ok: true, message: await sendReply(admin, auth.user.id, ticketId, messageBody) });
    }
    return json({ ok: false, message: 'Unknown action.' }, 400);
  } catch (error) {
    console.error('[ticketing-gmail]', error);
    return json({ ok: false, message: error instanceof Error ? error.message : 'Unexpected Gmail synchronization error.' }, 500);
  }
});

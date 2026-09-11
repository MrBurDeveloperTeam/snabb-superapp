import { supabase } from '../services/supabaseClient';

export type TicketStatusCode = 'request' | 'waiting' | 'replied' | 'done' | 'expired';
export type TicketPriority = '0' | '1' | '2' | '3';

export type TicketRow = {
  id: string; ticket_no: number; created_by: string; requester_name: string | null;
  requester_email: string | null; assigned_to: string | null; subject: string;
  description: string; category: string | null; priority: TicketPriority;
  status: TicketStatusCode; source: string; first_response_at: string | null;
  replied_at: string | null; completed_at: string | null; expired_at: string | null;
  gmail_thread_id: string | null; initial_gmail_message_id: string | null;
  last_gmail_message_id: string | null;
  last_activity_at: string; created_at: string; updated_at: string;
};

export type TicketMessage = {
  id: string; ticket_id: string; author_id: string; author_name: string | null;
  author_email: string | null; body: string; is_internal: boolean; created_at: string;
};

export type TicketAttachment = {
  id: string; ticket_id: string; message_id: string | null; uploaded_by: string;
  storage_path: string; file_name: string; mime_type: string | null;
  file_size: number | null; created_at: string; signed_url?: string;
};

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Please sign in again.');
  return data.user.id;
}

export async function fetchTickets(): Promise<TicketRow[]> {
  const { data, error } = await supabase.from('support_tickets').select('*')
    .order('last_activity_at', { ascending: false }).order('id', { ascending: false });
  if (error) throw error;
  return (data || []) as TicketRow[];
}

export async function createTicket(input: { subject: string; description: string; category?: string; priority: TicketPriority }): Promise<TicketRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('support_tickets').insert({
    created_by: userId, subject: input.subject.trim(), description: input.description.trim(),
    category: input.category?.trim() || null, priority: input.priority,
    status: 'request', source: 'app_snabbb',
  }).select('*').single();
  if (error) throw error;
  return data as TicketRow;
}

export async function fetchMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase.from('support_ticket_messages').select('*')
    .eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as TicketMessage[];
}

export async function addMessage(ticketId: string, body: string, isInternal = false): Promise<TicketMessage> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId, author_id: userId, body: body.trim(), is_internal: isInternal,
  }).select('*').single();
  if (error) throw error;
  return data as TicketMessage;
}

export async function sendGmailReply(ticketId: string, body: string): Promise<TicketMessage> {
  const { data, error } = await supabase.functions.invoke('ticketing-gmail', {
    body: { action: 'send_reply', ticket_id: ticketId, body: body.trim() },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Unable to send Gmail reply.');
  return data.message as TicketMessage;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatusCode): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

export async function uploadTicketFiles(ticketId: string, files: File[], messageId: string | null = null): Promise<void> {
  if (!files.length) return;
  const userId = await requireUserId();
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds the 10 MB file limit.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${ticketId}/${userId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('ticket-attachments')
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await supabase.from('support_ticket_attachments').insert({
      ticket_id: ticketId, message_id: messageId, uploaded_by: userId,
      storage_path: storagePath, file_name: file.name, mime_type: file.type || null, file_size: file.size,
    });
    if (metadataError) {
      await supabase.storage.from('ticket-attachments').remove([storagePath]);
      throw metadataError;
    }
  }
}

export async function fetchAttachments(ticketId: string): Promise<TicketAttachment[]> {
  const { data, error } = await supabase.from('support_ticket_attachments').select('*')
    .eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return Promise.all(((data || []) as TicketAttachment[]).map(async (attachment) => {
    const { data: signed } = await supabase.storage.from('ticket-attachments')
      .createSignedUrl(attachment.storage_path, 600);
    return { ...attachment, signed_url: signed?.signedUrl };
  }));
}

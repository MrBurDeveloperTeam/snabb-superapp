import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, CircleCheck, Clock3, Download, FileUp, Inbox, LifeBuoy, LoaderCircle, MessageSquare, Plus, RefreshCw, Search, Send, TicketCheck, X } from 'lucide-react';
import { addMessage, createTicket, fetchAttachments, fetchMessages, fetchTickets, sendGmailReply, updateTicketStatus, uploadTicketFiles, type TicketAttachment, type TicketMessage, type TicketPriority, type TicketRow, type TicketStatusCode } from './ticketingService';

type Props = { isAdmin: boolean; userName: string; userEmail?: string; onNavigate: (path: string) => void };
const statusMeta: Record<TicketStatusCode, { label: string; color: string; icon: React.ElementType }> = {
  request: { label: 'Request', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Inbox },
  waiting: { label: 'Waiting', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Clock3 },
  replied: { label: 'Replied', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: LifeBuoy },
  done: { label: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CircleCheck },
  expired: { label: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
};
const priorityLabel: Record<TicketPriority, string> = { '0': 'Low', '1': 'Normal', '2': 'High', '3': 'Urgent' };
const formatTicket = (number: number) => `ST-${String(number).padStart(6, '0')}`;
const formatDate = (value?: string | null) => !value ? '—' : new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function TicketingDashboard({ isAdmin, userName, onNavigate }: Props) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [filter, setFilter] = useState<TicketStatusCode | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ subject: '', description: '', category: '', priority: '1' as TicketPriority });
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const createFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const loadTickets = async () => {
    setLoading(true); setError('');
    try { setTickets(await fetchTickets()); }
    catch (err: any) { setError(err?.message || 'Unable to load support tickets.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadTickets(); }, [isAdmin]);

  const openTicket = async (ticket: TicketRow) => {
    setSelected(ticket); setDetailLoading(true); setReply(''); setReplyFiles([]); setInternalNote(false);
    try {
      const [nextMessages, nextAttachments] = await Promise.all([fetchMessages(ticket.id), fetchAttachments(ticket.id)]);
      setMessages(nextMessages); setAttachments(nextAttachments);
    } catch (err: any) { setError(err?.message || 'Unable to load ticket details.'); }
    finally { setDetailLoading(false); }
  };

  const counts = useMemo(() => {
    const value: Record<TicketStatusCode, number> = { request: 0, waiting: 0, replied: 0, done: 0, expired: 0 };
    tickets.forEach((ticket) => { value[ticket.status] += 1; }); return value;
  }, [tickets]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => (filter === 'all' || ticket.status === filter) && (!q || [formatTicket(ticket.ticket_no), ticket.subject, ticket.requester_name, ticket.requester_email].some((item) => String(item || '').toLowerCase().includes(q))));
  }, [filter, search, tickets]);

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const ticket = await createTicket(form);
      await uploadTicketFiles(ticket.id, createFiles);
      setForm({ subject: '', description: '', category: '', priority: '1' }); setCreateFiles([]); setShowCreate(false);
      await loadTickets(); await openTicket(ticket);
    } catch (err: any) { setError(err?.message || 'Unable to create ticket.'); }
    finally { setSaving(false); }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return; setSaving(true); setError('');
    try {
      if (isAdmin && selected.gmail_thread_id && !internalNote && replyFiles.length) {
        throw new Error('Gmail reply attachments are not enabled yet. Remove the files and send the text reply.');
      }
      const message = isAdmin && selected.gmail_thread_id && !internalNote
        ? await sendGmailReply(selected.id, reply)
        : await addMessage(selected.id, reply, isAdmin && internalNote);
      await uploadTicketFiles(selected.id, replyFiles, message.id);
      setReply(''); setReplyFiles([]); setInternalNote(false);
      const refreshed = await fetchTickets(); setTickets(refreshed);
      const current = refreshed.find((ticket) => ticket.id === selected.id) || selected;
      await openTicket(current);
    } catch (err: any) { setError(err?.message || 'Unable to send reply.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status: TicketStatusCode) => {
    if (!selected || !isAdmin) return; setSaving(true);
    try {
      await updateTicketStatus(selected.id, status); const refreshed = await fetchTickets(); setTickets(refreshed);
      setSelected(refreshed.find((ticket) => ticket.id === selected.id) || null);
    } catch (err: any) { setError(err?.message || 'Unable to update ticket status.'); }
    finally { setSaving(false); }
  };

  const cards = (isAdmin ? ['request', 'waiting', 'replied', 'done', 'expired'] : ['request', 'waiting', 'replied', 'done']) as TicketStatusCode[];
  return <main className="min-h-[calc(100vh-88px)] bg-slate-50 text-slate-900">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <button onClick={() => onNavigate('/')} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"><ArrowLeft size={16}/> Back to App.Snabbb</button>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-extrabold uppercase tracking-[.18em] text-blue-600">{isAdmin ? 'Customer inquiries' : 'Support center'}</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {userName || 'there'}</h1><p className="mt-2 text-sm font-medium text-slate-500">{isAdmin ? 'Manage every new support request stored in Supabase.' : 'Create and track your support requests in App.Snabbb.'}</p></div><div className="flex gap-3"><button onClick={() => void loadTickets()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</button>{!isAdmin && <button onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20"><Plus size={17}/> Create ticket</button>}</div></section>
      {error && <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle size={18}/><span className="flex-1">{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      <section className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>{cards.map((code) => { const meta=statusMeta[code], Icon=meta.icon; return <button key={code} onClick={() => setFilter(filter===code?'all':code)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${filter===code?'border-blue-400 ring-2 ring-blue-100':'border-slate-200'}`}><span className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${meta.color}`}><Icon size={19}/></span><span className="flex items-end justify-between"><span className="text-sm font-bold text-slate-600">{meta.label}</span><strong className="text-3xl font-black">{counts[code]}</strong></span></button>; })}</section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h2 className="text-lg font-black">{isAdmin?'All inquiries':'My tickets'}</h2><p className="text-xs font-semibold text-slate-400">{visible.length} tickets shown</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search tickets" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-400"/></div></div>
        {loading?<div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin text-blue-600"/> Loading tickets…</div>:visible.length===0?<div className="flex min-h-64 flex-col items-center justify-center text-center"><TicketCheck className="mb-3 text-slate-300" size={40}/><h3 className="font-black">No tickets found</h3></div>:<div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Subject</th>{isAdmin&&<th className="px-5 py-3">Customer</th>}<th className="px-5 py-3">Priority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th/></tr></thead><tbody>{visible.map((ticket)=>{const meta=statusMeta[ticket.status];return <tr key={ticket.id} onClick={()=>void openTicket(ticket)} className="cursor-pointer border-t border-slate-100 text-sm hover:bg-blue-50/40"><td className="px-5 py-4 font-extrabold text-blue-600">{formatTicket(ticket.ticket_no)}</td><td className="max-w-xs truncate px-5 py-4 font-bold text-slate-700">{ticket.subject}</td>{isAdmin&&<td className="px-5 py-4 text-slate-500">{ticket.requester_name||ticket.requester_email||'—'}</td>}<td className="px-5 py-4 text-xs font-bold text-slate-500">{priorityLabel[ticket.priority]}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${meta.color}`}>{meta.label}</span></td><td className="px-5 py-4 text-xs text-slate-400">{formatDate(ticket.last_activity_at)}</td><td><ChevronRight size={16}/></td></tr>})}</tbody></table></div>}
      </section>
    </div>

    {showCreate&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={()=>setShowCreate(false)}><form onSubmit={submitTicket} onClick={(e)=>e.stopPropagation()} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">New request</p><h2 className="mt-1 text-2xl font-black">Create support ticket</h2></div><button type="button" onClick={()=>setShowCreate(false)}><X/></button></div><div className="space-y-4"><label className="block text-sm font-bold">Subject<input required maxLength={200} value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400"/></label><label className="block text-sm font-bold">Description<textarea required maxLength={20000} rows={6} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-4 font-normal outline-none focus:border-blue-400"/></label><div className="grid grid-cols-2 gap-4"><label className="text-sm font-bold">Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal"/></label><label className="text-sm font-bold">Priority<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value as TicketPriority})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal"><option value="0">Low</option><option value="1">Normal</option><option value="2">High</option><option value="3">Urgent</option></select></label></div><input ref={createFileRef} type="file" multiple className="hidden" onChange={(e)=>setCreateFiles(Array.from(e.target.files||[]).slice(0,5))}/><button type="button" onClick={()=>createFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-500"><FileUp size={17}/>{createFiles.length?`${createFiles.length} file(s) selected`:'Attach up to 5 files'}</button></div><button disabled={saving} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white disabled:opacity-60">{saving?<LoaderCircle className="animate-spin"/>:<Plus size={18}/>} Create ticket</button></form></div>}

    {selected&&<div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={()=>setSelected(null)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-8" onClick={(e)=>e.stopPropagation()}><div className="mb-6 flex items-start justify-between"><div><span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">{formatTicket(selected.ticket_no)}</span><h2 className="mt-2 text-2xl font-black">{selected.subject}</h2><p className="mt-1 text-xs text-slate-400">Created {formatDate(selected.created_at)}</p></div><button onClick={()=>setSelected(null)} className="rounded-xl bg-slate-100 p-2"><X size={19}/></button></div>{isAdmin&&<div className="mb-5"><p className="mb-2 text-xs font-bold uppercase text-slate-400">Change status</p><div className="flex flex-wrap gap-2">{Object.keys(statusMeta).map((code)=><button disabled={saving} onClick={()=>void changeStatus(code as TicketStatusCode)} key={code} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${selected.status===code?statusMeta[code as TicketStatusCode].color:'border-slate-200 text-slate-500'}`}>{statusMeta[code as TicketStatusCode].label}</button>)}</div></div>}<div className="rounded-2xl bg-slate-50 p-5"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{selected.description}</p></div>
      <div className="mt-7"><h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400"><MessageSquare size={16}/> Conversation</h3>{detailLoading?<LoaderCircle className="animate-spin text-blue-600"/>:<div className="space-y-3">{messages.length===0&&<p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">No replies yet.</p>}{messages.map((message)=><article key={message.id} className={`rounded-2xl border p-4 ${message.is_internal?'border-amber-200 bg-amber-50':'border-slate-200'}`}><div className="mb-2 flex justify-between gap-3"><b className="text-sm">{message.author_name||message.author_email||'Snabbb User'}{message.is_internal&&<span className="ml-2 text-[10px] text-amber-700">INTERNAL NOTE</span>}</b><time className="text-[10px] text-slate-400">{formatDate(message.created_at)}</time></div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{message.body}</p>{attachments.filter((a)=>a.message_id===message.id).map((a)=><a key={a.id} href={a.signed_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600"><Download size={14}/>{a.file_name}</a>)}</article>)}{attachments.filter((a)=>!a.message_id).map((a)=><a key={a.id} href={a.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-600"><Download size={14}/>{a.file_name}</a>)}</div>}</div>
      {!['done','expired'].includes(selected.status)&&<form onSubmit={submitReply} className="mt-6 border-t border-slate-100 pt-6"><textarea required maxLength={20000} rows={4} value={reply} onChange={(e)=>setReply(e.target.value)} placeholder={isAdmin?'Write a reply to the customer…':'Add a reply…'} className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-400"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><input ref={replyFileRef} type="file" multiple className="hidden" onChange={(e)=>setReplyFiles(Array.from(e.target.files||[]).slice(0,5))}/><button type="button" onClick={()=>replyFileRef.current?.click()} className="flex items-center gap-2 text-xs font-bold text-slate-500"><FileUp size={16}/>{replyFiles.length?`${replyFiles.length} file(s)`:'Attach files'}</button>{isAdmin&&<label className="flex items-center gap-2 text-xs font-bold text-amber-700"><input type="checkbox" checked={internalNote} onChange={(e)=>setInternalNote(e.target.checked)}/> Internal note</label>}</div><button disabled={saving||!reply.trim()} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"><Send size={15}/> Send</button></div></form>}</aside></div>}
  </main>;
}

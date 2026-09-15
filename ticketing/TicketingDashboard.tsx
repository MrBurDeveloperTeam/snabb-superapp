import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarDays, ChevronRight, CircleCheck, Clock3, Download, FileUp, Inbox, LifeBuoy, LoaderCircle, Mail, MessageSquare, Plus, RefreshCw, Search, Send, TicketCheck, UserRound, X } from 'lucide-react';
import { addMessage, createTicket, fetchAttachments, fetchMessages, fetchTickets, sendGmailReply, updateTicketStatus, uploadTicketFiles, type TicketAttachment, type TicketMessage, type TicketPriority, type TicketRow, type TicketStatusCode } from './ticketingService';

type Props = { isAdmin: boolean; ticketId?: string | null; userName: string; userEmail?: string; onNavigate: (path: string) => void };
const statusMeta: Record<TicketStatusCode, { label: string; color: string; icon: React.ElementType }> = {
  request: { label: 'Request', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Inbox },
  waiting: { label: 'Waiting', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: Clock3 },
  replied: { label: 'Replied', color: 'bg-tiffany-50 text-tiffany-800 border-tiffany-200', icon: LifeBuoy },
  done: { label: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CircleCheck },
  expired: { label: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle },
};
const priorityLabel: Record<TicketPriority, string> = { '0': 'Low', '1': 'Normal', '2': 'High', '3': 'Urgent' };
const formatTicket = (number: number) => `ST-${String(number).padStart(6, '0')}`;
const formatDate = (value?: string | null) => !value ? '—' : new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function TicketingDashboard({ isAdmin, ticketId, userName, userEmail, onNavigate }: Props) {
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

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/user/dashboard';
  const ticketPath = (id: string) => `${dashboardPath}/tickets/${encodeURIComponent(id)}`;

  useEffect(() => {
    if (!ticketId) {
      setSelected(null);
      setMessages([]);
      setAttachments([]);
      setDetailLoading(false);
      return;
    }
    if (loading) return;

    const ticket = tickets.find((candidate) => candidate.id === ticketId) || null;
    setSelected(ticket);
    setReply(''); setReplyFiles([]); setInternalNote(false);
    if (!ticket) {
      setDetailLoading(false);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setError('');
    void Promise.all([fetchMessages(ticket.id), fetchAttachments(ticket.id)])
      .then(([nextMessages, nextAttachments]) => {
        if (!active) return;
        setMessages(nextMessages);
        setAttachments(nextAttachments);
      })
      .catch((err: any) => {
        if (active) setError(err?.message || 'Unable to load ticket details.');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => { active = false; };
  }, [loading, ticketId, tickets]);

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
      await loadTickets(); onNavigate(ticketPath(ticket.id));
    } catch (err: any) { setError(err?.message || 'Unable to create ticket.'); }
    finally { setSaving(false); }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !reply.trim()) return; setSaving(true); setError('');
    try {
      const message = isAdmin && selected.gmail_thread_id && !internalNote
        ? await sendGmailReply(selected.id, reply, replyFiles)
        : await addMessage(selected.id, reply, isAdmin && internalNote);
      await uploadTicketFiles(selected.id, replyFiles, message.id);
      setReply(''); setReplyFiles([]); setInternalNote(false);
      const refreshed = await fetchTickets(); setTickets(refreshed);
    } catch (err: any) { setError(err?.message || 'Unable to send reply.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (status: TicketStatusCode) => {
    if (!selected || !isAdmin) return; setSaving(true);
    try {
      await updateTicketStatus(selected.id, status); const refreshed = await fetchTickets(); setTickets(refreshed);
    } catch (err: any) { setError(err?.message || 'Unable to update ticket status.'); }
    finally { setSaving(false); }
  };

  const cards = (isAdmin ? ['request', 'waiting', 'replied', 'done', 'expired'] : ['request', 'waiting', 'replied', 'done']) as TicketStatusCode[];
  return <main className="ticketing-theme min-h-[calc(100vh-88px)] bg-slate-50 text-slate-900">
    <style>{`
      .ticketing-theme {
        background-image:
          radial-gradient(circle at 8% 0%, rgb(94 234 212 / 0.12), transparent 30rem),
          radial-gradient(circle at 92% 12%, rgb(204 251 244 / 0.42), transparent 34rem);
      }
      .ticketing-theme .text-blue-600 { color: #0a7a78 !important; }
      .ticketing-theme .bg-blue-600 { background-color: #089a98 !important; }
      .ticketing-theme .bg-blue-600:hover { background-color: #0a7a78 !important; }
      .ticketing-theme .bg-blue-50 { background-color: #f0fdfb !important; }
      .ticketing-theme .border-blue-400 { border-color: #2dd4bf !important; }
      .ticketing-theme .ring-blue-100 { --tw-ring-color: #ccfbf4 !important; }
      .ticketing-theme .focus\\:border-blue-400:focus { border-color: #2dd4bf !important; }
      .ticketing-theme .focus\\:ring-blue-400:focus { --tw-ring-color: #2dd4bf !important; }
      .ticketing-theme .focus\\:bg-blue-50:focus { background-color: #f0fdfb !important; }
      .ticketing-theme .hover\\:text-blue-600:hover { color: #089a98 !important; }
      .ticketing-theme .hover\\:bg-blue-50\\/40:hover { background-color: rgb(240 253 251 / 0.7) !important; }
      .ticketing-theme .shadow-blue-600\\/20 { --tw-shadow-color: rgb(10 191 188 / 0.2) !important; }
    `}</style>
    <div className={ticketId ? 'hidden' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10'}>
      <button onClick={() => onNavigate('/')} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"><ArrowLeft size={16}/> Back to App.Snabbb</button>
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-extrabold uppercase tracking-[.18em] text-blue-600">{isAdmin ? 'Customer inquiries' : 'Support center'}</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {userName || 'there'}</h1><p className="mt-2 text-sm font-medium text-slate-500">{isAdmin ? 'Manage every new support request stored in Supabase.' : 'Create and track your support requests in App.Snabbb.'}</p></div><div className="flex gap-3"><button onClick={() => void loadTickets()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</button>{!isAdmin && <button onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20"><Plus size={17}/> Create ticket</button>}</div></section>
      {error && <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle size={18}/><span className="flex-1">{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      <section className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>{cards.map((code) => { const meta=statusMeta[code], Icon=meta.icon; return <button key={code} onClick={() => setFilter(filter===code?'all':code)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${filter===code?'border-blue-400 ring-2 ring-blue-100':'border-slate-200'}`}><span className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl border ${meta.color}`}><Icon size={19}/></span><span className="flex items-end justify-between"><span className="text-sm font-bold text-slate-600">{meta.label}</span><strong className="text-3xl font-black">{counts[code]}</strong></span></button>; })}</section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h2 className="text-lg font-black">{isAdmin?'All inquiries':'My tickets'}</h2><p className="text-xs font-semibold text-slate-400">{visible.length} tickets shown</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search tickets" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-400"/></div></div>
        {loading?<div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin text-blue-600"/> Loading tickets…</div>:visible.length===0?<div className="flex min-h-64 flex-col items-center justify-center text-center"><TicketCheck className="mb-3 text-slate-300" size={40}/><h3 className="font-black">No tickets found</h3></div>:<div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Ticket</th><th className="px-5 py-3">Subject</th>{isAdmin&&<th className="px-5 py-3">Customer</th>}<th className="px-5 py-3">Priority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th/></tr></thead><tbody>{visible.map((ticket)=>{const meta=statusMeta[ticket.status];const open=()=>onNavigate(ticketPath(ticket.id));return <tr key={ticket.id} onClick={open} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}}} tabIndex={0} role="link" className="cursor-pointer border-t border-slate-100 text-sm outline-none hover:bg-blue-50/40 focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400"><td className="px-5 py-4 font-extrabold text-blue-600">{formatTicket(ticket.ticket_no)}</td><td className="max-w-xs truncate px-5 py-4 font-bold text-slate-700">{ticket.subject}</td>{isAdmin&&<td className="px-5 py-4 text-slate-500">{ticket.requester_name||ticket.requester_email||'—'}</td>}<td className="px-5 py-4 text-xs font-bold text-slate-500">{priorityLabel[ticket.priority]}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${meta.color}`}>{meta.label}</span></td><td className="px-5 py-4 text-xs text-slate-400">{formatDate(ticket.last_activity_at)}</td><td><ChevronRight size={16}/></td></tr>})}</tbody></table></div>}
      </section>
    </div>

    {!ticketId&&showCreate&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={()=>setShowCreate(false)}><form onSubmit={submitTicket} onClick={(e)=>e.stopPropagation()} className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">New request</p><h2 className="mt-1 text-2xl font-black">Create support ticket</h2></div><button type="button" onClick={()=>setShowCreate(false)}><X/></button></div><div className="space-y-4"><label className="block text-sm font-bold">Subject<input required maxLength={200} value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-blue-400"/></label><label className="block text-sm font-bold">Description<textarea required maxLength={20000} rows={6} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-4 font-normal outline-none focus:border-blue-400"/></label><div className="grid grid-cols-2 gap-4"><label className="text-sm font-bold">Category<input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal"/></label><label className="text-sm font-bold">Priority<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value as TicketPriority})} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 font-normal"><option value="0">Low</option><option value="1">Normal</option><option value="2">High</option><option value="3">Urgent</option></select></label></div><input ref={createFileRef} type="file" multiple className="hidden" onChange={(e)=>setCreateFiles(Array.from(e.target.files||[]).slice(0,5))}/><button type="button" onClick={()=>createFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-500"><FileUp size={17}/>{createFiles.length?`${createFiles.length} file(s) selected`:'Attach up to 5 files'}</button></div><button disabled={saving} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white disabled:opacity-60">{saving?<LoaderCircle className="animate-spin"/>:<Plus size={18}/>} Create ticket</button></form></div>}

    {ticketId&&!selected&&(loading||tickets.some((ticket)=>ticket.id===ticketId))&&<div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm font-bold text-slate-500" aria-busy="true"><LoaderCircle className="animate-spin text-blue-600"/> Loading ticket…</div>}
    {ticketId&&!loading&&!selected&&!tickets.some((ticket)=>ticket.id===ticketId)&&<div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center"><AlertCircle className="mb-4 text-rose-400" size={42}/><h1 className="text-2xl font-black">Ticket not found</h1><p className="mt-2 text-sm font-medium text-slate-500">This ticket may have been removed, or you may not have permission to view it.</p><button type="button" onClick={()=>onNavigate(dashboardPath)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"><ArrowLeft size={16}/> Back to tickets</button></div>}
    {selected&&<div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 py-6 sm:px-6 lg:h-[calc(100vh-88px)] lg:overflow-hidden lg:px-10 lg:py-7">
      <button type="button" onClick={()=>onNavigate(dashboardPath)} className="group mb-5 inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-bold text-slate-500 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-tiffany-200 hover:text-blue-600 hover:shadow-md"><ArrowLeft size={15} className="transition group-hover:-translate-x-0.5"/> Back to tickets</button>
      <article className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(440px,1.14fr)]">
        <section className="min-h-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 lg:overflow-y-auto">
          <div className="relative overflow-hidden border-b border-slate-100 px-6 pb-7 pt-7 sm:px-8 sm:pt-8">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-tiffany-100/50 blur-3xl"/>
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row"><div><span className="inline-flex rounded-full border border-tiffany-200 bg-tiffany-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.16em] text-blue-600">{formatTicket(selected.ticket_no)}</span><h1 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-[-.035em] text-slate-950 sm:text-[34px]">{selected.subject}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-400"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/> {formatDate(selected.created_at)}</span><span>{priorityLabel[selected.priority]} priority</span></div></div><span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-extrabold shadow-sm ${statusMeta[selected.status].color}`}>{React.createElement(statusMeta[selected.status].icon,{size:14})}{statusMeta[selected.status].label}</span></div>
          </div>
          <div className="p-6 sm:p-8">
          {error&&<div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle size={18}/><span className="flex-1">{error}</span><button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
          {isAdmin&&<div className="mb-7"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">Ticket actions</p>{!['done','expired'].includes(selected.status)&&<button type="button" disabled={saving} onClick={()=>void changeStatus('done')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:translate-y-0 disabled:opacity-50"><CircleCheck size={15}/> Mark as done</button>}</div>{!['done','expired'].includes(selected.status)&&<button type="button" disabled={saving||selected.status==='waiting'} onClick={()=>void changeStatus('waiting')} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition ${selected.status==='waiting'?statusMeta.waiting.color:'border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700'} disabled:pointer-events-none disabled:opacity-70`}><Clock3 size={14}/>{selected.status==='waiting'?'Waiting for customer':'Request more information'}</button>}{selected.status==='done'&&<div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-700"><CircleCheck size={15}/> This ticket is complete and replies are now closed.</div>}{selected.status==='expired'&&<div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-bold text-rose-700"><AlertCircle size={15}/> This ticket expired without an admin response.</div>}</div>}
          <div><p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">Original request</p><div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-6"><span className="absolute bottom-0 left-0 top-0 w-1 bg-tiffany-400"/><p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-600">{selected.description}</p></div></div>
          {(selected.requester_name||selected.requester_email)&&<div className="mt-7 border-t border-slate-100 pt-6"><p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">Customer</p><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-tiffany-50 text-blue-600 ring-1 ring-tiffany-100"><UserRound size={18}/></span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-700">{selected.requester_name||'Customer'}</p>{selected.requester_email&&<p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-400"><Mail size={12}/>{selected.requester_email}</p>}</div></div></div>}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70">
          <div className="shrink-0 border-b border-slate-100 bg-white/90 px-6 py-5 backdrop-blur sm:px-7"><div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2.5 text-sm font-black tracking-tight text-slate-700"><span className="grid h-8 w-8 place-items-center rounded-xl bg-tiffany-50 text-blue-600"><MessageSquare size={16}/></span> Conversation</h3><p className="ml-[42px] mt-0.5 text-xs font-medium text-slate-400">Customer communication history</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-500">{messages.length} {messages.length===1?'reply':'replies'}</span></div></div>
          <div className="min-h-[260px] flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 lg:min-h-0" tabIndex={0} aria-label="Ticket conversation">
            {detailLoading?<div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin text-blue-600"/></div>:<div className="space-y-2.5">{messages.length===0&&<div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-tiffany-50 text-blue-600 ring-1 ring-tiffany-100"><MessageSquare size={20}/></span><p className="text-sm font-extrabold text-slate-700">No replies yet</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Start the conversation by sending a helpful response below.</p></div>}{messages.map((message)=>{const emailMatchesRequester=Boolean(message.author_email&&selected.requester_email&&message.author_email.toLowerCase()===selected.requester_email.toLowerCase());const emailMatchesViewer=Boolean(message.author_email&&userEmail&&message.author_email.toLowerCase()===userEmail.toLowerCase());const fromCustomer=message.direction==='incoming'||message.author_id===selected.created_by||emailMatchesRequester;const fromAdmin=message.direction==='outgoing'||message.is_internal||(!fromCustomer&&message.author_id!==selected.created_by);const alignRight=isAdmin?fromAdmin:(fromCustomer||emailMatchesViewer);return <div key={message.id} className={`flex ${alignRight?'justify-end':'justify-start'}`}><article className={`w-fit max-w-[84%] rounded-2xl border px-4 py-3 shadow-sm ${message.is_internal?'border-amber-200 bg-amber-50':alignRight?'border-tiffany-200 bg-tiffany-50/80':'border-slate-200 bg-white'}`}><div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><b className="text-xs text-slate-700">{alignRight?'You':message.author_name||message.author_email||(fromCustomer?'Customer':'Snabbb Support')}{message.is_internal&&<span className="ml-2 text-[9px] text-amber-700">INTERNAL NOTE</span>}</b><time className="text-[9px] text-slate-400">{formatDate(message.created_at)}</time></div><p className="whitespace-pre-wrap text-[13px] leading-5 text-slate-600">{message.body}</p>{attachments.filter((a)=>a.message_id===message.id).map((a)=><a key={a.id} href={a.signed_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 text-[11px] font-bold text-blue-600"><Download size={13}/>{a.file_name}</a>)}</article></div>})}{attachments.filter((a)=>!a.message_id).map((a)=><a key={a.id} href={a.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-600"><Download size={14}/>{a.file_name}</a>)}</div>}
          </div>
          {!['done','expired'].includes(selected.status)&&<form onSubmit={submitReply} className="shrink-0 border-t border-slate-100 bg-white p-5 sm:px-7"><div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2 transition focus-within:border-tiffany-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-tiffany-50"><textarea required maxLength={20000} rows={3} value={reply} onChange={(e)=>setReply(e.target.value)} placeholder={isAdmin?'Write a reply to the customer…':'Add a reply…'} className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-400"/><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 px-2 pt-2"><div className="flex items-center gap-3"><input ref={replyFileRef} type="file" multiple className="hidden" onChange={(e)=>setReplyFiles(Array.from(e.target.files||[]).slice(0,5))}/><button type="button" onClick={()=>replyFileRef.current?.click()} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-blue-600"><FileUp size={15}/>{replyFiles.length?`${replyFiles.length} file(s)`:'Attach files'}</button>{isAdmin&&<label className="flex items-center gap-2 text-xs font-bold text-amber-700"><input type="checkbox" checked={internalNote} onChange={(e)=>setInternalNote(e.target.checked)} className="accent-amber-600"/> Internal note</label>}</div><button disabled={saving||!reply.trim()} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-tiffany-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50"><Send size={15}/> Send</button></div></div></form>}
          {['done','expired'].includes(selected.status)&&<div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4"><div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-xs font-bold text-slate-500"><CircleCheck size={15}/> This conversation is closed.</div></div>}
        </section>
      </article>
    </div>}
  </main>;
}

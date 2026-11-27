import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CreditCard, Download, FileText, LoaderCircle, RefreshCw } from 'lucide-react';
import InvoiceAccessDialog from './InvoiceAccessDialog';
import { downloadInvoice, fetchInvoicePayUrl, fetchInvoicePreview, fetchInvoices, InvoiceApiError, type Invoice, type InvoicePage, type InvoicePreview } from './invoiceApi';

const action = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiffany-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';
const statuses: Record<string, string> = { paid: 'Paid', partial: 'Partially paid', not_paid: 'Unpaid', in_payment: 'Processing', reversed: 'Reversed', blocked: 'On hold', invoicing_legacy: 'Invoiced' };
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—';
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
const readPage = () => Math.max(1, Math.floor(Number(new URLSearchParams(window.location.search).get('page')) || 1));

export default function MyInvoicesPage({ signedIn, onNavigate, verifySession }: {
  signedIn: boolean;
  onNavigate: (path: string) => void;
  verifySession: () => Promise<boolean | null>;
}) {
  const [page, setPage] = useState(readPage);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<InvoicePage | null>(null);
  const [error, setError] = useState<InvoiceApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [dialogPurpose, setDialogPurpose] = useState<'invoice' | 'track' | null>(null);
  const [activationToken, setActivationToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('activate'));
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('inv');
  const previewToken = params.get('t');
  const linkedInvoice = previewToken ? invoiceId : null;

  const discardActivationToken = () => {
    setActivationToken(null);
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(window.history.state, '', url);
  };

  const finishSignIn = async () => {
    if (!await verifySession()) throw new Error('Your session could not be verified.');
    setDialogPurpose(null);
    setRevision(v => v + 1);
  };

  const payInvoice = async (invoiceId: number) => {
    setPayingId(invoiceId); setActionError(null);
    try {
      window.location.assign(await fetchInvoicePayUrl(invoiceId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'We couldn’t open the payment page. Please try again.');
      setPayingId(null);
    }
  };

  const savePdf = async (invoice: Invoice) => {
    setDownloading(invoice.id);
    setActionError(null);
    try {
      await downloadInvoice(invoice);
    } catch (err) {
      if (err instanceof InvoiceApiError && err.status === 401) setError(err);
      else setActionError('We couldn’t download the invoice. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => { heading.current?.focus(); }, []);
  const needsLogin = !signedIn || error?.status === 401;
  // Not signed in but opened from the shipping e-mail (?inv=&t=): show just that invoice.
  useEffect(() => {
    if (!needsLogin || !linkedInvoice || !previewToken) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    const controller = new AbortController();
    setPreviewLoading(true);
    fetchInvoicePreview(linkedInvoice, previewToken, controller.signal)
      .then(result => { if (!controller.signal.aborted) setPreview(result); })
      .catch(() => { if (!controller.signal.aborted) setPreview(null); })
      .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false); });
    return () => controller.abort();
  }, [needsLogin, linkedInvoice, previewToken]);
  useEffect(() => {
    const restore = () => setPage(readPage());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!signedIn) { setLoading(false); setData(null); return; }
    const controller = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    setLoading(true); setError(null); setData(null);
    fetchInvoices(page, controller.signal, linkedInvoice).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(err => {
      if (!controller.signal.aborted || timedOut) setError(err instanceof InvoiceApiError ? err : new InvoiceApiError('We couldn’t load your invoices. Check your connection and try again.', 0));
    }).finally(() => {
      window.clearTimeout(timer);
      if (!controller.signal.aborted || timedOut) setLoading(false);
    });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, revision, signedIn, linkedInvoice]);

  const changePage = (next: number) => {
    const url = new URL(window.location.href);
    if (next === 1) url.searchParams.delete('page'); else url.searchParams.set('page', String(next));
    window.history.pushState({}, '', url);
    setPage(next);
  };
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <button type="button" onClick={() => onNavigate('/')} className={`${action} mb-6 -ml-3 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}><ArrowLeft size={16} /> Back to App Gallery</button>
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-tiffany-700 dark:text-tiffany-300">Your account</p><h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-slate-900 outline-none dark:text-white">My Invoice</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">View your invoices and credit notes in one place. Purchases with separate brand invoices appear individually.</p></div>
      {!needsLogin && <button type="button" disabled={loading} onClick={() => setRevision(v => v + 1)} className={`${action} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800`}><RefreshCw size={15} /> Refresh</button>}
    </div>
    <section aria-label="Your invoices" aria-busy={loading} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {needsLogin && previewLoading ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" /> Loading your invoice…</div>
      : needsLogin && preview ? <>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your invoice. Sign in to see the full details.</caption>
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"><tr><th scope="col" className="px-5 py-4">Invoice number</th><th scope="col" className="hidden px-5 py-4 md:table-cell">Date</th><th scope="col" className="hidden px-5 py-4 sm:table-cell">Status</th><th scope="col" className="px-3 py-4">Invoice</th></tr></thead>
            <tbody><tr className="text-slate-700 dark:text-slate-300">
              <th scope="row" className="max-w-64 px-3 py-5 sm:px-5 font-normal"><span className="block break-words font-bold text-slate-900 dark:text-white">{preview.number}</span><span className="mt-1 block text-xs text-slate-500">{preview.brands.join(' · ') || preview.company}</span>{preview.tracking?.map(t => <span key={t.number} className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{t.courier ? `${t.courier}:` : 'Tracking:'}</span>
                <span className="select-all break-all font-semibold text-slate-700 dark:text-slate-200">{t.number}</span>
                {/^https?:\/\//.test(t.url) && (preview.can_activate === true
                  ? <a href={t.url} target="_blank" rel="noopener noreferrer" aria-label={`Track parcel ${t.number} (opens in a new tab)`} className="whitespace-nowrap font-semibold text-tiffany-700 hover:underline dark:text-tiffany-300">Track ↗</a>
                  : <button type="button" onClick={() => setDialogPurpose('track')} aria-label={`Track parcel ${t.number} (sign in required)`} className="whitespace-nowrap rounded font-semibold text-tiffany-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiffany-600 dark:text-tiffany-300">Track ↗</button>)}
              </span>)}<span className="mt-1 block text-xs text-slate-500 md:hidden">{dateLabel(preview.date)}</span><span className="mt-1 block text-xs sm:hidden">{statuses[preview.payment_state] || 'Pending'}</span></th>
              <td className="hidden whitespace-nowrap px-5 py-5 md:table-cell">{dateLabel(preview.date)}</td>
              <td className="hidden px-5 py-5 sm:table-cell"><span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{statuses[preview.payment_state] || 'Pending'}</span></td>
              <td className="px-3 py-5"><button type="button" onClick={() => setDialogPurpose('invoice')} className={`${action} text-tiffany-800 hover:underline dark:text-tiffany-300`}>Sign in to view Invoice</button></td>
            </tr></tbody>
          </table>
        </div>
      </>
      : needsLogin ? <div className="px-6 py-16 text-center"><FileText className="mx-auto mb-4 text-tiffany-600" size={32} /><h2 className="font-bold text-slate-900 dark:text-white">Sign in to view your invoices</h2><p className="mt-2 text-sm text-slate-500">Your invoices are only available to your account.</p><button type="button" onClick={() => setDialogPurpose('invoice')} className={`${action} mt-5 bg-tiffany-700 text-white hover:bg-tiffany-800`}>Sign in</button></div>
      : loading ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" /> Loading your invoices…</div>
      : error ? <div role="alert" className="px-6 py-16 text-center"><h2 className="font-bold text-slate-900 dark:text-white">Invoices couldn’t be loaded</h2><p className="mt-2 text-sm text-slate-500">{error.message}</p><button type="button" onClick={() => setRevision(v => v + 1)} className={`${action} mt-5 bg-tiffany-700 text-white hover:bg-tiffany-800`}>Try again</button></div>
      : !data?.invoices.length ? <div className="px-6 py-16 text-center"><FileText className="mx-auto mb-4 text-slate-300" size={36} /><h2 className="font-bold text-slate-900 dark:text-white">{linkedInvoice ? 'Invoice unavailable' : 'No invoices yet'}</h2><p className="mt-2 text-sm text-slate-500">{linkedInvoice ? 'This invoice is unavailable for the signed-in account.' : 'Your invoices will appear here once they’re issued.'}</p></div>
      : <>
        {actionError && <div role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{actionError}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Issued invoices and credit notes, newest first. Use Download invoice to save a PDF.</caption>
            <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"><tr><th scope="col" className="px-5 py-4">Invoice number</th><th scope="col" className="hidden px-5 py-4 md:table-cell">Date / Due</th><th scope="col" className="px-5 py-4 text-right">Amount</th><th scope="col" className="hidden px-5 py-4 sm:table-cell">Status</th><th scope="col" className="px-5 py-4">Invoice</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.invoices.map(invoice => <tr key={invoice.id} className="text-slate-700 hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/40">
              <th scope="row" className="max-w-64 px-3 py-5 sm:px-5 font-normal"><span className="block break-words font-bold text-slate-900 dark:text-white">{invoice.number}</span><span className="mt-1 block text-xs text-slate-500">{invoice.brands.join(' · ') || invoice.company}</span>{invoice.type === 'out_refund' && <span className="mt-1 block text-xs font-semibold text-tiffany-700 dark:text-tiffany-300">Credit note</span>}{invoice.tracking?.map(t => <span key={t.number} className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{t.courier ? `${t.courier}:` : 'Tracking:'}</span>
                <span className="select-all break-all font-semibold text-slate-700 dark:text-slate-200">{t.number}</span>
                {/^https?:\/\//.test(t.url) && <a href={t.url} target="_blank" rel="noopener noreferrer" aria-label={`Track parcel ${t.number} (opens in a new tab)`} className="whitespace-nowrap font-semibold text-tiffany-700 hover:underline dark:text-tiffany-300">Track ↗</a>}
              </span>)}<span className="mt-1 block text-xs text-slate-500 md:hidden">{dateLabel(invoice.date)}</span><span className="mt-1 block text-xs sm:hidden">{statuses[invoice.payment_state] || 'Pending'}</span></th>
              <td className="hidden whitespace-nowrap px-5 py-5 md:table-cell">{dateLabel(invoice.date)}<span className="mt-1 block text-xs text-slate-500">Due {dateLabel(invoice.due_date)}</span></td>
              <td className="whitespace-nowrap px-2 py-5 text-right sm:px-5 tabular-nums"><span className="font-bold">{money(invoice.total, invoice.currency)}</span><span className="mt-1 block text-xs text-slate-500">{money(invoice.amount_due, invoice.currency)} due</span></td>
              <td className="hidden px-5 py-5 sm:table-cell"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${invoice.payment_state === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{statuses[invoice.payment_state] || 'Pending'}</span></td>
              <td className="px-1 py-5 sm:px-3"><button type="button" disabled={downloading !== null} onClick={() => savePdf(invoice)} aria-label={`Download invoice ${invoice.number}`} className={`${action} text-tiffany-800 hover:underline dark:text-tiffany-300`}><Download size={15} aria-hidden="true" /> {downloading === invoice.id ? 'Downloading…' : 'Download invoice'}</button></td>
              <td className="px-1 py-5 sm:px-3"><div className="flex flex-col items-start gap-1">{invoice.can_pay && <button type="button" disabled={payingId !== null} onClick={() => payInvoice(invoice.id)} aria-label={`Pay invoice ${invoice.number}`} className={`${action} whitespace-nowrap bg-tiffany-700 text-white hover:bg-tiffany-800`}>{payingId === invoice.id ? <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" /> : <CreditCard size={14} />} Pay</button>}<a href={`/api/my/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer" aria-label={`View invoice ${invoice.number} (opens in a new tab)`} className={`${action} whitespace-nowrap text-tiffany-700 hover:bg-tiffany-50 dark:text-tiffany-300 dark:hover:bg-slate-800`}>View <ArrowUpRight size={14} /></a></div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800"><p role="status" className="text-xs text-slate-500">{((data.page - 1) * data.page_size) + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total} documents</p><nav aria-label="Invoice pages" className="flex gap-2"><button type="button" disabled={data.page <= 1} onClick={() => changePage(data.page - 1)} className={`${action} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Previous</button><button type="button" disabled={data.page * data.page_size >= data.total} onClick={() => changePage(data.page + 1)} className={`${action} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>Next</button></nav></div>
      </>}
    </section>
    {linkedInvoice && !needsLogin && <a href="/my-invoices" className={`${action} mt-4 text-tiffany-800 dark:text-tiffany-300`}>View all invoices</a>}
    {dialogPurpose && <InvoiceAccessDialog purpose={dialogPurpose} invoice={preview} token={activationToken} onConsumed={discardActivationToken}
      onSignedIn={finishSignIn} onClose={() => setDialogPurpose(null)} />}
  </main>;
}

export interface Invoice {
  id: number;
  number: string;
  date: string | null;
  due_date: string | null;
  company: string;
  brands: string[];
  type: 'out_invoice' | 'out_refund';
  currency: string;
  total: number;
  amount_due: number;
  payment_state: string;
  can_pay?: boolean;
  tracking?: { number: string; courier: string; url: string }[];
}

/** What a visitor who is not signed in may see: no amounts, PDF or payment. */
export interface InvoicePreview {
  can_activate?: boolean;
  id: number;
  number: string;
  date: string | null;
  company: string;
  brands: string[];
  type: 'out_invoice' | 'out_refund';
  payment_state: string;
  tracking?: { number: string; courier: string; url: string }[];
}

export interface InvoicePage {
  invoices: Invoice[];
  total: number;
  page: number;
  page_size: number;
}

export class InvoiceApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function downloadInvoice(invoice: Invoice) {
  const response = await fetch(`/api/my/invoices/${invoice.id}/pdf?download=1`, {
    credentials: 'include', cache: 'no-store', headers: { Accept: 'application/pdf' },
  });
  if (!response.ok || !response.headers.get('Content-Type')?.startsWith('application/pdf')) {
    throw new InvoiceApiError('We couldn’t download this PDF. Please try again.', response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = invoice.number.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fetchInvoices(page: number, signal: AbortSignal, invoiceId?: string | null): Promise<InvoicePage> {
  const params = new URLSearchParams({ page: String(page) });
  if (invoiceId) params.set('invoice_id', invoiceId);
  const response = await fetch(`/api/my/invoices?${params}`, {
    credentials: 'include', signal, cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) throw new InvoiceApiError('Your session has expired. Please sign in to view your invoices.', 401);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok || !Array.isArray(body.invoices)) {
    throw new InvoiceApiError('We couldn’t load your invoices. Please try again.', response.status);
  }
  return body;
}

export async function fetchInvoicePayUrl(invoiceId: number): Promise<string> {
  const response = await fetch(`/api/my/invoices/${invoiceId}/pay-url`, {
    credentials: 'include', cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) throw new InvoiceApiError('Your session has expired. Please sign in again.', 401);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok || typeof body.url !== 'string') {
    throw new InvoiceApiError(
      response.status === 409 ? 'This invoice can no longer be paid online.' : 'We couldn’t open the payment page. Please try again.',
      response.status,
    );
  }
  return body.url;
}

/** One invoice from the shipping e-mail link (?inv=<id>&t=<token>), no session needed. */
export async function fetchInvoicePreview(id: string, token: string, signal: AbortSignal): Promise<InvoicePreview> {
  const params = new URLSearchParams({ inv: id, t: token });
  const response = await fetch(`/api/my/invoices?${params}`, {
    credentials: 'omit', signal, cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok || !body.invoice) throw new InvoiceApiError('This link is no longer valid.', response.status);
  return body.invoice;
}

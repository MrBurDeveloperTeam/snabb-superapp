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

export async function fetchInvoices(page: number, signal: AbortSignal): Promise<InvoicePage> {
  const response = await fetch(`/api/my/invoices?page=${page}`, {
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

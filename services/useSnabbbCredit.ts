import { useState, useEffect } from 'react'

const ODOO_BASE = 'https://mrbur.odoo.com' // or your Odoo instance URL

async function odooCall(model: string, method: string, args: any[], kwargs: any = {}) {
  const res = await fetch(`${ODOO_BASE}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends the Odoo session cookie
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Math.floor(Math.random() * 1e9),
      params: { model, method, args, kwargs },
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.data?.message || 'Odoo RPC error')
  return data.result
}

export function useSnabbbCredit(partnerId?: number) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!partnerId) return
    setLoading(true)

    fetch(`https://my.mrbur.shop/api/snabbb/wallet?partner_id=${partnerId}`, {
      credentials: 'include', // sends the mrbur.odoo.com session cookie
    })
      .then(r => r.json())
      .then(data => setBalance(data.balance ?? null))
      .catch(() => setBalance(null))
      .finally(() => setLoading(false))
  }, [partnerId])

  return { balance, loading }
}
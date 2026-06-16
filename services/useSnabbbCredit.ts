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

    odooCall('snabbb.wallet', 'search_read', [
      [['partner_id', '=', partnerId]],
      ['snabbb_balance'],
    ])
      .then((records: any[]) => {
        if (records.length > 0) {
          setBalance(records[0].snabbb_balance ?? 0)
        } else {
          setBalance(0)
        }
      })
      .catch(() => setBalance(null))
      .finally(() => setLoading(false))
  }, [partnerId])

  return { balance, loading }
}
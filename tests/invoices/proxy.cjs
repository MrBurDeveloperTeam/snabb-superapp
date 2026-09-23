const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('worker.js', 'utf8');
const start = source.indexOf('// Private invoice list and PDF documents;');
const end = source.indexOf('if (CHECKOUT_API_PATHS.has', start);
const run = new (Object.getPrototypeOf(async function(){}).constructor)('request', 'url', 'fetch', 'ODOO_DEV_HOST', source.slice(start, end));
(async () => {
 const request = new Request('https://app.snabbb.com/api/my/invoices/42/pdf?download=1', {headers:{Cookie:'session_id=test'}});
 const bytes = new Uint8Array([37,80,68,70,0,255]);
 const response = await run(request, new URL(request.url), async (url, init) => {
   assert.equal(url, 'https://example.odoo.com/api/my/invoices/42/pdf?download=1');
   assert.equal(init.headers.Cookie, 'session_id=test');
   return new Response(bytes, {headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="invoice.pdf"'}});
 }, 'example.odoo.com');
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
 assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
 assert.equal(response.headers.get('Content-Type'), 'application/pdf');
 const expired = await run(request, new URL(request.url), async () => new Response(null,{status:302,headers:{Location:'/web/login'}}),'example.odoo.com');
 assert.equal(expired.status,401);
 const invalid = await run(new Request(request.url,{method:'POST'}),new URL(request.url),()=>{throw Error('must not forward');},'example.odoo.com');
 assert.equal(invalid.status,405);
 console.log('PASS: proxy forwards session, preserves PDF bytes, prevents caching, handles expiry, rejects writes');
})().catch(e=>{console.error(e);process.exitCode=1});

// Run against a local Vite server. PLAYWRIGHT_MODULE may point to a bundled runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { readFile } = require('node:fs/promises');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
 const page = await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[]; page.on('pageerror',e=>{ if(e.message === 'WebSocket closed without opened.') return; errors.push(e.message); });
 const fixture='http://127.0.0.1:3011/tests/invoices/fixture.html';
 let mode='success'; let calls=0;
 await page.route('**/api/my/invoices?*',async route=>{
   calls++;
   if(mode==='loading') await new Promise(r=>setTimeout(r,700));
   const p=Number(new URL(route.request().url()).searchParams.get('page'));
   const invoice={id:p,number:p===1?'INV/2026/0042':'INV/2026/0043',date:'2026-09-23',due_date:'2026-10-23',company:'MR.BUR',brands:p===1?['MR.BUR']:['Kaneiko'],type:'out_invoice',currency:'MYR',total:1280,amount_due:0,payment_state:'paid'};
   await route.fulfill({status:mode==='error'?500:mode==='auth'?401:200,contentType:'application/json',body:JSON.stringify({ok:!['error','auth'].includes(mode),invoices:mode==='empty'?[]:[invoice],total:mode==='empty'?0:21,page:p,page_size:20})});
 });
 await page.goto(fixture); await page.getByText('INV/2026/0042').waitFor();
 assert.equal(await page.getByRole('link',{name:'View invoice INV/2026/0042 (opens in a new tab)'}).getAttribute('href'),'/api/my/invoices/1/pdf');
 await page.getByRole('button',{name:'Next',exact:true}).click(); await page.getByText('INV/2026/0043').waitFor();
 assert.match(page.url(),/page=2/); await page.goBack(); await page.getByText('INV/2026/0042').waitFor();
 await page.screenshot({path:join(tmpdir(), 'my-invoices-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:join(tmpdir(), 'my-invoices-mobile.png'),fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.screenshot({path:join(tmpdir(), 'my-invoices-dark.png'),fullPage:true});
 mode='empty'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByText('No invoices yet').waitFor();
 mode='error'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByRole('alert').waitFor();
 mode='success'; await page.getByRole('button',{name:'Try again'}).click(); await page.getByText('INV/2026/0042').waitFor();
 mode='loading'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByText('Loading your invoices…').waitFor(); await page.getByText('INV/2026/0042').waitFor();
 mode='auth'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 const before=calls; await page.goto(fixture+'?guest=1'); await page.getByRole('button',{name:'Sign in',exact:true}).waitFor(); assert.equal(calls,before);
 await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Sign in');
 // Follow a receipt through first-time activation and an actual local PDF download.
 const buyer = await browser.newPage({viewport:{width:390,height:844}});
 const invoice = {id:42,number:'INV/0042',company:'MR.BUR',brands:[],type:'out_invoice',
   date:'2026-09-23',due_date:null,currency:'MYR',total:50,amount_due:0,payment_state:'paid'};
 const entry = fixture+'?guest=1&inv=42&t=preview';
 let canActivate = true;
 let confirmFails = false;
 let signInFails = false;
 let confirmed = 0;
 let signIns = 0;
 let ownsInvoice = true;
 const pdfBytes = Buffer.from('%PDF-1.4\nfixture\n%%EOF');
 const json = (route, data) => route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 await buyer.route('**/api/my/invoices?*', route => {
   const query = new URL(route.request().url()).searchParams;
   if (query.has('t')) return json(route, {ok:true,invoice:{...invoice,can_activate:canActivate}});
   assert.equal(query.get('invoice_id'), '42');
   return json(route,{ok:true,invoices:ownsInvoice?[invoice]:[],page:1,page_size:20,total:ownsInvoice?1:0});
 });
 await buyer.route('**/api/web/reset_password/confirm', route => {
   confirmed++;
   const params = route.request().postDataJSON().params;
   assert.deepEqual(params,{token:'one-time',password:'fixture-password',invoice_id:42});
   return json(route,{result:confirmFails?{ok:false,error:'This link has expired.'}:{ok:true,login:'buyer@example.test'}});
 });
 await buyer.route('**/api/web/session/authenticate', route => {
   signIns++;
   const {login,password} = route.request().postDataJSON().params;
   assert.equal(login,'buyer@example.test');
   assert.equal(password,'fixture-password');
   return json(route, signInFails?{error:{message:'Denied'}}:{result:{uid:6}});
 });
 await buyer.route('**/api/web/reset_password', route => {
   assert.deepEqual(route.request().postDataJSON().params,{login:'buyer@example.test',invoice_id:42});
   return json(route,{result:{ok:true}});
 });
 await buyer.route('**/api/my/invoices/42/pdf?download=1', route =>
   route.fulfill({contentType:'application/pdf',body:pdfBytes}));
 const startAccess = async (url) => {
   await buyer.goto('about:blank');
   await buyer.goto(url);
   await buyer.getByRole('button',{name:'sign in to view Invoice',exact:true}).click();
 };
 const activate = async () => {
   await buyer.getByRole('button',{name:'Activate',exact:true}).click();
   await buyer.getByLabel('New password (at least 8 characters)').fill('fixture-password');
   await buyer.getByLabel('Confirm new password').fill('fixture-password');
 };
 await startAccess(entry+'#activate=one-time');
 await activate();
 await buyer.getByLabel('Confirm new password').fill('different-password');
 await buyer.getByRole('button',{name:'Activate',exact:true}).click();
 await buyer.getByRole('alert').getByText(/passwords don’t match/).waitFor();
 assert.equal(confirmed,0);
 await buyer.getByLabel('Confirm new password').fill('fixture-password');
 await buyer.getByRole('button',{name:'Activate',exact:true}).click();
 await buyer.getByRole('button',{name:'Download invoice INV/0042'}).waitFor();
 assert.equal(await buyer.getByRole('dialog').count(),0);
 assert.equal(new URL(buyer.url()).hash,'');
 const saved = buyer.waitForEvent('download');
 await buyer.getByRole('button',{name:'Download invoice INV/0042'}).click();
 const download = await saved;
 assert.equal(download.suggestedFilename(),'INV-0042.pdf');
 assert.deepEqual(await readFile(await download.path()),pdfBytes);
 assert.equal(confirmed,1);
 assert.equal(signIns,1);

 confirmFails = true;
 await startAccess(entry+'#activate=one-time');
 await activate();
 await buyer.getByRole('button',{name:'Activate',exact:true}).click();
 await buyer.getByRole('alert').getByText(/expired/).waitFor();
 assert.equal(signIns,1);
 await buyer.getByRole('button',{name:'Request a new email'}).click();
 await buyer.getByLabel('Purchase email').waitFor();
 await buyer.keyboard.press('Escape');
 assert.equal(await buyer.getByRole('dialog').count(),0);
 await startAccess(entry);
 await buyer.getByRole('button',{name:'Activate',exact:true}).click();
 await buyer.getByLabel('Purchase email').fill('buyer@example.test');
 await buyer.getByRole('button',{name:'Send email'}).click();
 await buyer.getByRole('heading',{name:'Check your inbox'}).waitFor();

 confirmFails = false;
 signInFails = true;
 await startAccess(entry+'#activate=one-time');
 await activate();
 await buyer.getByRole('button',{name:'Activate',exact:true}).click();
 await buyer.getByRole('alert').getByText(/password was saved/).waitFor();
 assert.equal(await buyer.getByLabel('Password',{exact:true}).inputValue(),'');
 assert.equal(new URL(buyer.url()).hash,'');

 canActivate = false;
 signInFails = false;
 ownsInvoice = false;
 await startAccess(entry);
 assert.equal(await buyer.getByRole('button',{name:'Activate',exact:true}).count(),0);
 await buyer.getByRole('button',{name:'Sign in',exact:true}).click();
 await buyer.getByLabel('Email or username').fill('buyer@example.test');
 await buyer.getByLabel('Password',{exact:true}).fill('fixture-password');
 await buyer.getByRole('button',{name:'Sign in',exact:true}).click();
 await buyer.getByRole('heading',{name:'Invoice unavailable'}).waitFor();
 assert.equal(await buyer.getByRole('button',{name:/Download invoice/}).count(),0);
 await buyer.close();
 console.log('PASS: email activation, password mismatch, automatic sign-in, PDF bytes and filename, expired and legacy links, sign-in recovery and wrong-account view');
 // Verify the actual application's menu and internal route as well as the isolated page.
 const app = await browser.newPage();
 let appSignedIn = true;
 await app.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.pathname === '/api/partner/profile') return json(route,{profileComplete:true});
   if (url.pathname === '/api/web/session/get_session_info') return json(route,appSignedIn
     ? {result:{uid:42,partner_id:42,name:'Invoice Test',username:'invoice-test@example.test',company_id:1}}
     : {error:{message:'Not signed in'}});
   if (url.pathname === '/api/web/session/authenticate') {
     appSignedIn = true;
     return json(route,{result:{uid:42}});
   }
   if (url.pathname === '/api/my/invoices') {
     if (url.searchParams.has('t')) return json(route,{ok:true,invoice:{...invoice,can_activate:false}});
     const rows = appSignedIn && url.searchParams.get('invoice_id') === '42' ? [invoice] : [];
     return json(route,{ok:true,invoices:rows,total:rows.length,page:1,page_size:20});
   }
   if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return route.fulfill({contentType:'application/json',body:'{}'});
   return route.continue();
 });
 await app.goto('http://127.0.0.1:3011/');
 await app.getByRole('button',{name:'Open profile menu'}).click();
 const channel = app.getByRole('button',{name:'My Channel Manage your channel'});
 const invoices = app.getByRole('button',{name:'My Invoice View and download invoices'});
 await invoices.waitFor();
 assert.ok((await invoices.boundingBox()).y > (await channel.boundingBox()).y);
 await invoices.click();
 await app.getByRole('heading',{name:'My Invoice',exact:true}).waitFor();
 assert.equal(new URL(app.url()).pathname,'/my-invoices');
 await app.getByText('No invoices yet').waitFor();
 await app.getByRole('button',{name:'Back to App Gallery'}).click();
 assert.equal(new URL(app.url()).pathname,'/');
 appSignedIn = false;
 await app.goto('http://127.0.0.1:3011/my-invoices?inv=42&t=preview');
 await app.getByRole('button',{name:'sign in to view Invoice',exact:true}).click();
 await app.getByRole('dialog').getByRole('button',{name:'Sign in',exact:true}).click();
 await app.getByLabel('Email or username').fill('invoice-test@example.test');
 await app.getByLabel('Password',{exact:true}).fill('fixture-password');
 await app.getByRole('dialog').getByRole('button',{name:'Sign in',exact:true}).click();
 await app.getByRole('button',{name:'Download invoice INV/0042'}).waitFor();
 assert.equal(new URL(app.url()).searchParams.get('inv'),'42');
 await app.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: invoice list, PDF link, pagination/history, mobile overflow, dark theme, empty, error/retry, loading, session expiry, guest no-fetch, keyboard, no runtime errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

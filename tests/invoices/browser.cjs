// Run against a local Vite server. PLAYWRIGHT_MODULE may point to a bundled runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
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
 await page.screenshot({path:'/private/tmp/my-invoices-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'/private/tmp/my-invoices-mobile.png',fullPage:true});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.screenshot({path:'/private/tmp/my-invoices-dark.png',fullPage:true});
 mode='empty'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByText('No invoices yet').waitFor();
 mode='error'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByRole('alert').waitFor();
 mode='success'; await page.getByRole('button',{name:'Try again'}).click(); await page.getByText('INV/2026/0042').waitFor();
 mode='loading'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByText('Loading your invoices…').waitFor(); await page.getByText('INV/2026/0042').waitFor();
 mode='auth'; await page.getByRole('button',{name:'Refresh'}).click(); await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 const before=calls; await page.goto(fixture+'?guest=1'); await page.getByRole('button',{name:'Sign in',exact:true}).waitFor(); assert.equal(calls,before);
 await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Sign in');
 // Verify the actual application's menu and internal route as well as the isolated page.
 const app = await browser.newPage();
 await app.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.pathname === '/api/web/session/get_session_info') return route.fulfill({contentType:'application/json',body:JSON.stringify({result:{uid:42,partner_id:42,name:'Invoice Test',username:'invoice-test@example.test',company_id:1}})});
   if (url.pathname === '/api/my/invoices') return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,invoices:[],total:0,page:1,page_size:20})});
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
 await app.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: invoice list, PDF link, pagination/history, mobile overflow, dark theme, empty, error/retry, loading, session expiry, guest no-fetch, keyboard, no runtime errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

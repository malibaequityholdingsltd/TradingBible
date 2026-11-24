const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
const page=await context.newPage();
page.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE',m.text().slice(0,300)); });
page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
const res=await page.goto('http://localhost:3002/app/terminal-pro',{waitUntil:'networkidle',timeout:60000});
console.log('status',res.status(),'url',page.url());
await page.waitForTimeout(3000);
console.log('title',await page.title());
console.log('html len',(await page.content()).length);
console.log('body text',(await page.locator('body').innerText()).slice(0,400).replace(/\n/g,' | '));
await page.screenshot({path:'.tmp/state-1440.png',fullPage:false});
await browser.close();
})();

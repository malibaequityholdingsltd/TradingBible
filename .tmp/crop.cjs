const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(3000);
const el=await page.$('.tb-desk-header');
await el.screenshot({path:'.tmp/crop-desk-header.png'});
const info=await page.evaluate(()=>[...document.querySelectorAll('.tb-desk-header__actions .tb-desk-action')].map(e=>({html:e.innerHTML.slice(0,80),label:e.getAttribute('aria-label'),title:e.getAttribute('title'),text:e.textContent.trim()})));
console.log(JSON.stringify(info,null,2));
await browser.close();
})();

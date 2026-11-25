const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');localStorage.setItem('tb:tour-dismissed','1');},{session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(5000);
console.log('url',page.url());
console.log('text',(await page.locator('body').innerText()).slice(0,500).replace(/\n/g,' | '));
console.log('focus',await page.locator('.tb-focus-root').count(),'term',await page.locator('.tb-term').count());
console.log('ls',await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('sb-')||k.startsWith('tb:'))));
await page.screenshot({path:'.tmp/debug-auth.png'});
await browser.close();
})();

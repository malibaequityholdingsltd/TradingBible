const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:390,height:844}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');localStorage.setItem('tb:tour-dismissed','1');},{session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(4000);
console.log('sym before',await page.locator('.tb-focus-symbol-picker').first().innerText());
await page.locator('button[aria-label="Open market and order panel"]').click();
await page.waitForTimeout(700);
console.log('rows',await page.locator('.tb-focus-drawer .tb-focus-market').allInnerTexts());
const xau=page.locator('.tb-focus-drawer .tb-focus-market').filter({hasText:'XAUUSD'}).first();
if(await xau.count()){await xau.click();await page.waitForTimeout(1000);}
console.log('drawer after',await page.locator('.tb-focus-drawer').count(),'sym',await page.locator('.tb-focus-symbol-picker').first().innerText());
await browser.close();
})();

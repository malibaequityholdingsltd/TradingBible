const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');localStorage.setItem('tb:tour-dismissed','1');},{session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(3500);
console.log('open',page.url(),await page.locator('.tb-focus-root').count());
await page.click('[aria-label="Exit fullscreen"]');
await page.waitForTimeout(800);
console.log('exited',page.url(),await page.locator('.tb-focus-root').count());
await page.reload({waitUntil:'domcontentloaded'}); await page.waitForTimeout(4000);
await page.waitForTimeout(2500);
console.log('reloaded',page.url(),await page.locator('.tb-focus-root').count());
// click Terminal nav from dashboard
const nav=page.locator('a[href*="/app/terminal-pro"]').first();
console.log('navhref',await nav.getAttribute('href'));
await nav.click();
await page.waitForTimeout(2500);
console.log('renav',page.url(),await page.locator('.tb-focus-root').count());
await browser.close();
})();

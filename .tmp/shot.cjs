const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
const key='sb-yxuzrishocchfbofqazt-auth-token';
await context.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {key,session});
const page=await context.newPage();
page.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE',m.text().slice(0,200)); });
await page.goto('https://tradingbible.app/app/terminal-pro?fullscreen=1',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(6000);
console.log('URL',page.url());
console.log('TITLE',await page.title());
await page.screenshot({path:'.tmp/terminal-desktop.png',fullPage:false});
const txt=await page.locator('body').innerText();
console.log(txt.slice(0,3000));
await browser.close();
})();

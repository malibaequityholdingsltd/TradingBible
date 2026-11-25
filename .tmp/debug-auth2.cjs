const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');localStorage.setItem('tb:tour-dismissed','1');},{session});
const page=await context.newPage();
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200));});
page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('NAV',f.url());});
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(8000);
console.log('url',page.url(),'title',await page.title());
console.log('root children',await page.evaluate(()=>document.getElementById('root')?.children.length));
console.log('has app',await page.evaluate(()=>({exapp:!!document.querySelector('.ex-app'),appshell:!!document.querySelector('.tb-app-shell'),header:document.querySelector('header')?.innerText.slice(0,80),path:location.pathname})));
await page.screenshot({path:'.tmp/debug-auth2.png'});
await browser.close();
})();

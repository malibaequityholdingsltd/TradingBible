const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(4000);
const data=await page.evaluate(()=>{
 const legend=document.querySelector('.tb-chart-legend');
 const old=document.querySelector('.tb-chart-fullscreen [class*="left-2"][class*="top-2"]');
 const top=document.querySelector('.tb-focus-top');
 const rail=document.querySelector('.tb-focus-rail');
 return {
  legend: legend ? {cls:legend.className, html:legend.outerHTML.slice(0,500), rect:legend.getBoundingClientRect().toJSON()} : null,
  old: old ? {cls:old.className, html:old.outerHTML.slice(0,300)} : null,
  top: top ? top.getBoundingClientRect().toJSON() : null,
  rail: rail ? rail.getBoundingClientRect().toJSON() : null,
  css: [...document.styleSheets].map(s=>s.href).filter(Boolean).slice(-8),
 };
});
console.log(JSON.stringify(data,null,2));
await browser.close();
})();

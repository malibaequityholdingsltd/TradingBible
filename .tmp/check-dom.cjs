const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(3000);
const data=await page.evaluate(()=>{
  const count=(s)=>document.querySelectorAll(s).length;
  const all=[...document.querySelectorAll('[class*="tb-term"], [class*="tb-desk"]')].slice(0,25).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,140),h:Math.round(e.getBoundingClientRect().height)}));
  return {counts:{term:count('.tb-term'),fixed:count('.tb-term--fixed'),tabs:count('.tb-term-tabs'),stage:count('.tb-term-stage'),desk:count('.tb-desk-grid'),chart:count('[data-tb-chart-root]')},all};
});
console.log(JSON.stringify(data,null,2));
await browser.close();
})();

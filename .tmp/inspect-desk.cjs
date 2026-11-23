const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yuzrishocchfbofqazt-auth-token',JSON.stringify(session));}, {session});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
const page=await context.newPage();
await page.goto('http://localhost:3002/app/terminal-pro',{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(4000);
const data=await page.evaluate(()=>{
 const q=(s)=>{const el=document.querySelector(s); return el?{rect:el.getBoundingClientRect().toJSON(), cls:el.className, scrollW:el.scrollWidth, clientW:el.clientWidth, overflow:getComputedStyle(el).overflow}:null;};
 return {
  body:{scrollH:document.body.scrollHeight, clientH:document.body.clientHeight, overflow:getComputedStyle(document.body).overflow},
  inner:q('.ex-main--terminal .ex-main__inner'),
  term:q('.tb-term--fixed'),
  header:q('.tb-desk-header'),
  grid:q('.tb-desk-grid'),
  center:q('.tb-desk-center'),
  stageCard:q('.tb-desk-stage'),
  tabs:q('.tb-term-tabs'),
  stage:q('.tb-term-stage'),
  chart:q('.tb-term-stage [data-tb-chart-root]'),
  rail:q('.tb-desk-rail--left'),
 };
});
console.log(JSON.stringify(data,null,2));
await browser.close();
})();

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
 const el=document.querySelector('.tb-term-tabs');
 const btn=document.querySelector('.tb-term-tab');
 const s=getComputedStyle(el); const b=getComputedStyle(btn);
 return {
  tabs:{display:s.display,padding:s.padding,border:s.border,borderRadius:s.borderRadius,background:s.backgroundColor,gap:s.gap,margin:s.margin,height:s.height,overflow:s.overflow},
  btn:{display:b.display,minHeight:b.minHeight,background:b.backgroundColor,color:b.color,borderRadius:b.borderRadius,padding:b.padding,fontSize:b.fontSize},
  rules:[...document.styleSheets].flatMap(sh=>{try{return [...sh.cssRules].filter(r=>r.selectorText&&r.selectorText.includes('tb-term-tabs')).map(r=>r.cssText.slice(0,300))}catch{return[]}}).slice(-10)
 };
});
console.log(JSON.stringify(data,null,2));
await browser.close();
})();

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
 const cs=getComputedStyle(el);
 const parent=el.parentElement;
 const pcs=getComputedStyle(parent);
 return {cs:{height:cs.height,minHeight:cs.minHeight,maxHeight:cs.maxHeight,padding:cs.padding,flex:cs.flex,overflow:cs.overflow,boxSizing:cs.boxSizing,alignItems:cs.alignItems,display:cs.display,marginBottom:cs.marginBottom,border:cs.border},
 parent:{cls:String(parent.className).slice(0,120),display:pcs.display,flexDirection:pcs.flexDirection,height:pcs.height,overflow:pcs.overflow,rowGap:pcs.rowGap},
 rect:el.getBoundingClientRect().toJSON(),children:[...el.children].map(c=>({cls:c.className,h:c.getBoundingClientRect().height}))};
});
console.log(JSON.stringify(data,null,2));
await browser.close();
})();

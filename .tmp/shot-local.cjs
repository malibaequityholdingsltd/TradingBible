const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const key='sb-yxuzrishocchfbofqazt-auth-token';
async function shot(width,height,url,name){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 await context.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {key,session});
 const page=await context.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket')) errors.push(m.text().slice(0,180));});
 await page.goto(url,{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(5000);
 await page.screenshot({path:`.tmp/${name}.png`,fullPage:false});
 console.log(name, page.url(), 'errors', errors.slice(0,3));
 await context.close();
}
await shot(1440,960,'http://localhost:3002/app/terminal-pro?fullscreen=1','v2-focus-desktop');
await shot(390,844,'http://localhost:3002/app/terminal-pro?fullscreen=1','v2-focus-mobile');
await shot(1440,960,'http://localhost:3002/app/terminal-pro','v2-desk-desktop');
await shot(390,844,'http://localhost:3002/app/terminal-pro','v2-desk-mobile');
await browser.close();
})();

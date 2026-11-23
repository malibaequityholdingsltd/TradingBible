const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const key='sb-yxuzrishocchfbofqazt-auth-token';
async function shot(width,height,url,name,fullPage=false){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 await context.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {key,session});
 const page=await context.newPage();
 await page.goto(url,{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(5000);
 await page.screenshot({path:`.tmp/${name}.png`,fullPage});
 console.log(name, page.url(), await page.locator('body').innerText().then(t=>t.slice(0,400).replace(/\n+/g,' | ')));
 await context.close();
}
await shot(390,844,'https://tradingbible.app/app/terminal-pro?fullscreen=1','terminal-mobile');
await shot(1440,960,'https://tradingbible.app/app/terminal-pro','terminal-dashboard');
await shot(390,844,'https://tradingbible.app/app/terminal-pro','terminal-dashboard-mobile');
await browser.close();
})();

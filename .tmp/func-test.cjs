const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
const session=JSON.parse(fs.readFileSync('/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');localStorage.setItem('tb:tour-dismissed','1');},{session});
const page=await context.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,180)));
await page.goto('http://localhost:3002/app/terminal-pro',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(4500);
const desk=await page.evaluate(()=>({tabs:document.querySelector('.tb-term-tabs')?.getBoundingClientRect().height,stage:document.querySelector('.tb-term-stage')?.getBoundingClientRect().toJSON(),chart:document.querySelector('.tb-desk-stage [data-tb-chart-root]')?.getBoundingClientRect().toJSON()}));
await page.screenshot({path:'.tmp/final-desk-1440.png'});
// command palette
await page.keyboard.press('Meta+k');
await page.waitForTimeout(600);
const cmdOpen=await page.locator('[role="dialog"]').count();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
// data drawer
const dataBtn=page.locator('button[aria-label="Show market data"]');
let dataOpened=false;
if(await dataBtn.count()){ await dataBtn.first().click(); await page.waitForTimeout(700); dataOpened=await page.locator('.tb-term-drawer, .tb-desk-drawer, [role="dialog"]').count()>0; }
// fullscreen + rail select
await page.goto('http://localhost:3002/app/terminal-pro?fullscreen=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(4500);
const beforeSym=await page.locator('.tb-focus-symbol-picker').first().innerText();
const btc=page.locator('.tb-focus-market').filter({hasText:'BTCUSD'}).first();
let afterSym=beforeSym;
if(await btc.count()){ await btc.click(); await page.waitForTimeout(1200); afterSym=await page.locator('.tb-focus-symbol-picker').first().innerText(); }
// trade tab
await page.getByRole('tab',{name:'Trade'}).click();
await page.waitForTimeout(500);
const trade=await page.locator('.tb-focus-ticket-actions').count();
await page.screenshot({path:'.tmp/final-focus-1440.png'});
// mobile drawer
await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(1200);
const marketBtn=page.locator('button[aria-label="Open market and order panel"]');
await marketBtn.click();
await page.waitForTimeout(800);
const drawer=await page.locator('.tb-focus-drawer .tb-focus-rail').count();
const eth=page.locator('.tb-focus-drawer .tb-focus-market').filter({hasText:'ETHUSD'}).first();
if(await eth.count()){await eth.click();await page.waitForTimeout(1200);}
const drawerClosed=await page.locator('.tb-focus-drawer').count();
const mobileSym=await page.locator('.tb-focus-symbol-picker').first().innerText();
await page.screenshot({path:'.tmp/final-focus-390.png'});
console.log(JSON.stringify({desk,cmdOpen,dataOpened,beforeSym,afterSym,trade,drawer,drawerClosed,mobileSym,errs},null,2));
await browser.close();
})();

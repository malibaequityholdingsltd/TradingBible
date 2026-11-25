const { chromium } = require('playwright');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:960}});
const page=await context.newPage();
page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
await page.goto('http://localhost:3002/terminal?fullscreen=1',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForTimeout(4500);
console.log('open',page.url(),await page.locator('.tb-focus-root').count());
await page.click('[aria-label="Exit fullscreen"]');
await page.waitForTimeout(800);
console.log('exited',page.url(),await page.locator('.tb-focus-root').count());
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForTimeout(3000);
console.log('reloaded',page.url(),await page.locator('.tb-focus-root').count());
await browser.close();
})();

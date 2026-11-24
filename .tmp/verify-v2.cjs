const { chromium } = require('playwright');
const fs = require('fs');
const SESSION='/private/var/folders/d8/r_3bqr_d3s38sf940z6fnn6w0000gn/T/opencode/admin-session.json';
const session=JSON.parse(fs.readFileSync(SESSION,'utf8'));
async function shot(browser, w, h, url, name, wait=3500){
  const context=await browser.newContext({viewport:{width:w,height:h}});
  await context.addInitScript(({session})=>{localStorage.setItem('sb-yxuzrishocchfbofqazt-auth-token',JSON.stringify(session));localStorage.setItem('tb:admin-preview','1');}, {session});
  const page=await context.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(wait);
  const data=await page.evaluate(()=>{
    const r=(s)=>{const el=document.querySelector(s); if(!el) return null; const b=el.getBoundingClientRect(); const cs=getComputedStyle(el); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),display:cs.display,visible:!!(b.width&&b.height),overflow:cs.overflow};};
    const btn=(label)=>{const el=[...document.querySelectorAll('button,a')].find(e=>(e.getAttribute('aria-label')||'')===label); if(!el) return null; const b=el.getBoundingClientRect(); const cs=getComputedStyle(el); return {w:Math.round(b.width),h:Math.round(b.height),display:cs.display,visible:!!(b.width&&b.height)};};
    return {
      vw:innerWidth, vh:innerHeight,
      doc:{sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, sh:document.documentElement.scrollHeight, ch:document.documentElement.clientHeight, bodyOverflow:getComputedStyle(document.body).overflow},
      root:r('.tb-focus-root'), top:r('.tb-focus-top'), body:r('.tb-focus-body'), stage:r('.tb-focus-stage'), chart:r('.tb-focus-stage .tb-focus-chart, .tb-focus-stage [data-tb-chart-root]'), rail:r('.tb-focus-rail:not(.is-mobile)'), status:r('.tb-focus-status'), legend:r('.tb-chart-legend'), tabs:r('.tb-term-tabs'), deskStage:r('.tb-desk-stage'), deskChart:r('.tb-desk-stage [data-tb-chart-root]'),
      controls:{exit:btn('Exit fullscreen'),market:btn('Open market and order panel'),snapshot:btn('Snapshot to journal'),share:btn('Share this view'),alerts:btn('Price alerts')},
      tabsText:[...document.querySelectorAll('.tb-term-tab')].map(e=>e.textContent.trim()).slice(0,8),
    };
  });
  await page.screenshot({path:name,fullPage:false});
  await context.close();
  return {data,errs};
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const out={};
  out.desk1440=await shot(browser,1440,960,'http://localhost:3002/app/terminal-pro','.tmp/v2b-desk-1440.png');
  out.focus1440=await shot(browser,1440,960,'http://localhost:3002/app/terminal-pro?fullscreen=1','.tmp/v2b-focus-1440.png',4500);
  out.focus390=await shot(browser,390,844,'http://localhost:3002/app/terminal-pro?fullscreen=1','.tmp/v2b-focus-390.png',4500);
  out.desk390=await shot(browser,390,844,'http://localhost:3002/app/terminal-pro','.tmp/v2b-desk-390.png');
  out.focus820=await shot(browser,820,1180,'http://localhost:3002/app/terminal-pro?fullscreen=1','.tmp/v2b-focus-820.png',4500);
  console.log(JSON.stringify(out,null,2));
  await browser.close();
})();

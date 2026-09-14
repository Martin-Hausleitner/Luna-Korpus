#!/usr/bin/env python3
"""Exercise the real themed Aster and its real upstream applications in an isolated browser."""
import asyncio,json,hashlib,threading,functools,argparse,traceback,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main(url,out):
 out.mkdir(parents=True,exist_ok=True); report={'url':url,'viewport':{'width':1920,'height':1080},'checks':[],'apps':{},'pageErrors':[],'requestFailures':[]}
 def check(name,ok,details=None):
  row={'name':name,'pass':bool(ok),'details':details};report['checks'].append(row);print(('PASS ' if ok else 'FAIL ')+name+' '+str(details or '')[:400],flush=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=CHROME,headless=True,args=['--enable-webgpu','--enable-unsafe-webgpu'])
  context=await browser.new_context(viewport=report['viewport'],locale='de-AT',timezone_id='Europe/Vienna',accept_downloads=True)
  page=await context.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('requestfailed',lambda r:report['requestFailures'].append({'url':r.url[:240],'error':r.failure}))
  start=time.time()
  try:
   await page.goto(url,wait_until='domcontentloaded',timeout=120000)
   await page.wait_for_function('window.Aster?.booted && window.Aster?.luna?.ready',timeout=120000)
   await page.wait_for_timeout(1200)
   report['bootSeconds']=round(time.time()-start,2)
   inventory=await page.evaluate('''() => ({catalog:Aster.webCatalog.apps.map(a=>({id:a.id,title:a.title,repo:a.repo})),registry:[...Aster.apps.values()].map(a=>({id:a.id,title:a.title,custom:!!a.custom,webApp:!!a.webApp,hidden:!!a.hidden})),installed:Aster.appLibrary.records,shortcuts:Aster.desktopShortcuts,profile:document.body.dataset.profile,theme:Aster.themes.current,storage:Aster.db.mode,renderer:Aster.metrics})''')
   report['inventory']=inventory
   check('Real Aster boot',True,{'version':await page.evaluate('Aster.version'),'seconds':report['bootSeconds']})
   check('Windows profile and Luna selected',inventory['profile']=='windows' and inventory['theme']['id']=='luna-korpus')
   check('Nineteen native HTML installations',len([a for a in inventory['installed'] if a['id'].startswith('custom-luna-')])==19)
   check('Exactly thirteen desktop pins',len(inventory['shortcuts'])==13)
   check('Desktop names have original parentheses',all(' (' in a['title'] and a['title'].endswith(')') for a in inventory['shortcuts']))
   check('Mines and Win32 kept off desktop',not any(a['app'] in ('mines','win32') for a in inventory['shortcuts']))
   registry={a['id']:a for a in inventory['registry']}
   check('Every catalog entry registered',all(a['id'] in registry for a in inventory['catalog']),len(inventory['catalog']))
   check('Mines and Win32 visible in Store',all(x in registry and not registry[x]['hidden'] for x in ['mines','win32']))
   check('German-pattern launcher titles',all(' (' in a['title'] for a in inventory['registry'] if not a['hidden']))
   sources=await page.evaluate('''async()=>{const out=[];for(const a of Aster.luna.manifest){const f=await Aster.fs.read('/'+a.localPath),text=await Aster.fs.text(f);out.push({id:a.id,expected:a.sha256,actual:await Aster.luna.hash(text),bytes:new TextEncoder().encode(text).length});}return out;}''')
   report['sourceHashes']=sources
   check('Nineteen workspace files equal upstream bytes',all(a['expected']==a['actual'] for a in sources))
   async def hide():
    await page.evaluate('''()=>{Aster.closePanels();for(const w of Aster.windows.values())if(!w.minimized)w.minimize();}''');await page.wait_for_timeout(200)
   async def openapp(id,options=None,maximize=True):
    await hide()
    wid=await page.evaluate('''async([id,options,maximize])=>{const w=Aster.launch(id,options||{});await w.ready;if(w.minimized)w.restore();if(maximize&&!w.maximized)w.toggleMaximize();window.__qaWindow=w;return w.id;}''',[id,options,maximize])
    await page.wait_for_timeout(1400)
    return page.locator('[data-window="'+wid+'"]')
   await hide();await page.screenshot(path=str(out/'01-desktop.png'))
   store=await openapp('store')
   count=await store.locator('[data-library-app]').count();visible=len([a for a in inventory['registry'] if not a['hidden']])
   check('Native full App Center inventory',count==visible,{'cards':count,'visibleRegistry':visible})
   await page.screenshot(path=str(out/'02-appstore.png'))
   for term,name in [('Minen','02b-mines-in-store.png'),('Win32','02c-win32-in-store.png'),('Office','02d-unpinned-in-store.png')]:
    await store.locator('input[type="search"]').fill(term);await page.wait_for_timeout(150);await page.screenshot(path=str(out/name))
   await store.locator('input[type="search"]').fill('')
   explorer=await openapp('files',{'path':'/Apps'})
   check('Original Aster Explorer',await explorer.locator('.file-explorer,.explorer-layout,.explorer').count()>0 or 'tabelle.html' in await explorer.inner_text())
   await page.screenshot(path=str(out/'03-explorer.png'))
   essential=[('tabelle','04-tabelle.png'),('mail','05-mail.png'),('korpus','06-korpus.png')]
   for slug,shot in essential:
    w=await openapp('custom-luna-'+slug)
    await w.locator('iframe.app-frame').wait_for(timeout=45000)
    h=await w.locator('iframe.app-frame').element_handle();frame=await h.content_frame();await frame.wait_for_load_state('domcontentloaded');await page.wait_for_timeout(3000)
    info=await frame.evaluate('''()=>({title:document.title,text:document.body.innerText.slice(0,16000),buttons:document.querySelectorAll('button').length,canvas:document.querySelectorAll('canvas').length,inputs:document.querySelectorAll('input').length,ids:[...document.querySelectorAll('[id]')].map(e=>e.id).slice(0,120)})''')
    info['sha256']=await w.locator('iframe.app-frame').get_attribute('data-upstream-sha256');report['apps'][slug]=info
    check(slug+' original UI mounted',info['buttons']>8 and len(info['text'])>100,{'title':info['title'],'buttons':info['buttons'],'canvas':info['canvas']})
    if slug=='tabelle':
     lower=info['text'].lower();check('Gridline is not rejected toy',all(s not in lower for s in ['30 spalten','40 zeilen','keine xlsx']))
     check('Gridline formula bar and sheets',any('formula' in s.lower() for s in info['ids']) and any('sheet' in s.lower() for s in info['ids']),info['ids'])
    await page.screenshot(path=str(out/shot))
   cal=await openapp('calendar')
   check('Original Aster Calendar mounted',await cal.locator('button').count()>5 and ('2026' in await cal.inner_text()))
   await page.screenshot(path=str(out/'07-kalender.png'))
   settings=await openapp('settings',{'section':'themes'})
   await page.wait_for_timeout(700)
   settings_text=await settings.inner_text()
   check('Theme library retains Windows macOS Ubuntu Luna',all(x in settings_text for x in ['Luna','Windows','macOS','Ubuntu']))
   await page.screenshot(path=str(out/'08-themes.png'))
   theme=await page.evaluate("async()=>await(await Aster.themes.exportTheme('astertheme')).text()")
   (ROOT/'Luna-Korpus.astertheme').write_text(theme)
   await hide()
   await page.evaluate('''async()=>{let i=0;for(const id of ['custom-luna-korpus','custom-luna-mail','custom-luna-tabelle']){const w=[...Aster.windows.values()].find(w=>w.appId===id)||Aster.launch(id);await w.ready;if(w.maximized)w.toggleMaximize();w.rect={x:35+i*360,y:40+i*110,w:1080,h:715};w.restoreRect={...w.rect};w.restore();w.sync();w.onResize?.();i++;}}''')
   await page.wait_for_timeout(2000);await page.screenshot(path=str(out/'09-multiwindow.png'))
   caption=await page.locator('.window:not(.inactive):not(.minimized) .titlebar').last.evaluate('(e)=>({color:getComputedStyle(e).backgroundColor,controls:e.querySelector(".window-controls").getBoundingClientRect().x,left:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width})')
   check('Focused caption Luna blue',caption['color']=='rgb(0, 120, 200)',caption)
   check('Caption controls remain on right',caption['controls']>caption['left']+caption['width']/2)
   check('Taskbar product word LUNA', 'LUNA' in await page.locator('#taskbar').inner_text())
   # No test fixture is injected into any app. These are original upstream UIs.
   check('No shell boot exception',not any('Luna' in e or 'Aster startup' in e for e in report['pageErrors']),report['pageErrors'])
  except Exception as exc:
   report['fatal']=str(exc);report['traceback']=traceback.format_exc();print(report['traceback'],flush=True)
   try:await page.screenshot(path=str(out/'failure.png'))
   except:pass
  finally:
   (out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str))
   await browser.close()
 return 0 if not report.get('fatal') and all(x['pass'] for x in report['checks']) else 1
if __name__=='__main__':
 args=argparse.ArgumentParser();args.add_argument('--url');args.add_argument('--out',default=str(ROOT/'qa/local'));opts=args.parse_args();server=None
 if not opts.url:
  server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();opts.url='http://127.0.0.1:'+str(server.server_port)+'/Luna-Korpus.html'
 try:raise SystemExit(asyncio.run(main(opts.url,Path(opts.out))))
 finally:
  if server:server.shutdown()

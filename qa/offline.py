#!/usr/bin/env python3
import asyncio,json,threading,functools,time
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
async def main(url):
 report={'url':url,'offlineAfterBoot':True,'apps':[],'checks':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True,args=['--enable-webgpu','--enable-unsafe-webgpu'])
  ctx=await browser.new_context(viewport={'width':1920,'height':1080},locale='de-AT');page=await ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto(url,wait_until='domcontentloaded',timeout=120000);await page.wait_for_function('Aster.booted && Aster.luna.ready',timeout=120000)
  await page.evaluate('''async()=>{for(const w of [...Aster.windows.values()]){w.beforeClose=null;await w.close();}}''')
  await ctx.set_offline(True)
  manifest=json.loads((ROOT/'app-mapping.json').read_text())
  for app in manifest:
   error_start=len(errors);t=time.time();row={'id':app['id'],'title':app['title']}
   try:
    wid=await page.evaluate('''async(id)=>{const w=Aster.launch(id);await w.ready;if(!w.maximized)w.toggleMaximize();return w.id;}''',app['installedId'])
    outer=page.locator('[data-window="'+wid+'"]');iframe=outer.locator('iframe.app-frame');await iframe.wait_for(timeout=45000)
    handle=await iframe.element_handle();frame=await handle.content_frame();await frame.wait_for_load_state('domcontentloaded');await page.wait_for_timeout(3500)
    row.update(await frame.evaluate('''()=>({documentTitle:document.title,text:document.body.innerText.slice(0,16000),buttons:document.querySelectorAll('button').length,canvas:document.querySelectorAll('canvas').length,bodyChildren:document.body.children.length})'''))
    row['sha256']=await iframe.get_attribute('data-upstream-sha256');row['pass']=row['sha256']==app['sha256'] and row['buttons']>=5 and (len(row['text'])>=100 or app['id']=='text')
    if app['id']=='tabelle':
     box=frame.locator('#name-box');formula=frame.locator('#formula-input')
     await box.fill('Z100');await box.press('Enter');await formula.fill('=SUM(2,3)');await formula.press('Enter');await box.fill('Z100');await box.press('Enter');await page.wait_for_timeout(200)
     row['formulaRoundtrip']=await formula.input_value();report['checks'].append({'name':'Original Gridline formula editor commit and readback','pass':row['formulaRoundtrip']=='=SUM(2,3)','value':row['formulaRoundtrip']})
    if app['id']=='mail':row['editableRegions']=await frame.locator('[contenteditable="true"]').count()
    row['errors']=errors[error_start:];row['pass']=row['pass'] and not row['errors'];row['seconds']=round(time.time()-t,2)
    print(('PASS ' if row['pass'] else 'FAIL ')+app['title']+' '+str(row['buttons'])+' buttons '+str(row['seconds'])+'s errors='+str(row['errors'])[:500],flush=True)
    if not row['pass'] or row['errors']:
     await page.screenshot(path=str(ROOT/('qa/offline-'+app['id']+'.png')))
    await page.evaluate('''async()=>{for(const w of [...Aster.windows.values()]){w.beforeClose=null;await w.close();}}''')
   except Exception as e:
    row.update({'pass':False,'error':str(e)});print('FAIL '+app['id']+' '+str(e),flush=True)
   report['apps'].append(row)
   (ROOT/'qa/offline-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  # The native catalog entry must resolve to the same installed original, offline.
  wid=await page.evaluate("async()=>{const w=Aster.launch('web-gridline');await w.ready;return w.id;}")
  fr=page.locator('[data-window="'+wid+'"] iframe');await fr.wait_for();same=await fr.get_attribute('data-upstream-sha256')==manifest[0]['sha256'];report['checks'].append({'name':'Catalog Gridline launches local original offline','pass':same})
  report['errors']=errors;report['pass']=all(a['pass'] for a in report['apps']) and all(c['pass'] for c in report['checks'])
  (ROOT/'qa/offline-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));await browser.close()
 return 0 if report['pass'] else 1
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:raise SystemExit(asyncio.run(main('http://127.0.0.1:'+str(server.server_port)+'/Luna-Korpus.html')))
 finally:server.shutdown()

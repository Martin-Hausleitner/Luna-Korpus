#!/usr/bin/env python3
"""Real-browser integration QA. No app fixtures, no remote site replacements."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading, json, sys, time, hashlib, argparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--url');parser.add_argument('--output',default='qa');parser.add_argument('--screens',action='store_true');args=parser.parse_args()
OUT=ROOT/args.output;OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if args.url:URL=args.url
else:
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}/Luna-Korpus.html'
report={'url':URL,'viewport':[1920,1080],'fixtures':False,'checks':[],'apps':[],'errors':[],'request_failures':[],'screenshots':[]}
def check(name,ok,details=None):
 report['checks'].append({'name':name,'pass':bool(ok),'details':details});print(('PASS ' if ok else 'FAIL ')+name+' '+str(details or '')[:800],flush=True)
def save():
 report['passed']=sum(x['pass'] for x in report['checks']);report['failed']=sum(not x['pass'] for x in report['checks']);(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1,locale='de-AT',timezone_id='Europe/Vienna',accept_downloads=True)
 page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('requestfailed',lambda r:report['request_failures'].append({'url':r.url,'failure':r.failure}));
 page.on('response',lambda r:report['request_failures'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 try:
  page.goto(URL,wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.Aster?.booted && window.Aster?.luna?.verified===19',timeout=90000);page.wait_for_timeout(1000)
  state=page.evaluate('''() => ({apps:[...Aster.apps.values()].map(a=>({id:a.id,title:a.title,hidden:!!a.hidden,custom:!!a.custom,webApp:!!a.webApp})),catalog:Aster.webCatalog.apps.map(a=>({id:a.id,repo:a.repo,title:a.title})),installed:Aster.appLibrary.records,desktop:Aster.desktopShortcuts,profile:Aster.themes.current.profile,theme:Aster.themes.current.title,storage:Aster.db.mode,bar:document.querySelector('#taskbar').innerText,root:document.body.className,gpu:!!navigator.gpu})''')
  report['boot']=state
  check('Aster boots with 19 byte-verified installed original apps',len(state['installed'])==19,len(state['apps']))
  check('Complete original catalog retained',len(state['catalog'])==84,len(state['catalog']))
  check('Mines and Win32 remain available',all(any(a['id']==id and not a['hidden'] for a in state['apps']) for id in ['mines','win32']))
  check('All visible application launcher titles use parentheses',all(' (' in a['title'] and a['title'].endswith(')') for a in state['apps'] if not a['hidden']))
  check('Exactly 13 requested desktop pins',len(state['desktop'])==13 and not any(x['app'] in ['mines','win32'] for x in state['desktop']),state['desktop'])
  check('Luna is selected on the actual Windows profile',state['profile']=='windows' and state['theme']=='Luna Korpus')
  check('Taskbar product word is LUNA, not Aster','LUNA' in state['bar'] and 'Aster' not in state['bar'],state['bar'])
  page.evaluate('window.dispatchEvent(new Event("resize"))')
  check('Taskbar branding survives native taskbar rerender',page.locator('#taskbar .luna-product-word').inner_text()=='LUNA')
  check('Durable IndexedDB is available',state['storage']=='IndexedDB',state['storage'])
  check('One Aster shell, no second desktop',page.locator('#taskbar').count()==1 and page.locator('#desktop').count()==1)
  def shot(name):
   if args.screens:
    page.screenshot(path=str(OUT/name));report['screenshots'].append(name)
  def clear():
   # Teardown only: bypass close prompts in this disposable test profile. Product safeguards are unchanged.
   page.evaluate('''() => {Aster.closePanels();for(const w of [...Aster.windows.values()]){w.beforeClose=null;w.close();}}''');page.wait_for_timeout(150)
  def openapp(id,options=None,maximize=True):
   page.evaluate('''({id,options})=>{Aster.openApp(id,options||{});}''',{'id':id,'options':options})
   page.wait_for_function('''id=>[...Aster.windows.values()].some(w=>w.appId===id&&!w.closed)''',arg=id,timeout=20000)
   page.wait_for_timeout(450)
   w=page.locator('.window').last
   if maximize:
    page.evaluate('''id=>{const w=[...Aster.windows.values()].find(w=>w.appId===id&&!w.closed);if(!w.maximized)w.toggleMaximize();}''',id)
   page.wait_for_timeout(400);return w
  shot('01-desktop.png')
  page.locator('#desktop-icons').get_by_role('button',name='Tabelle (Gridline)',exact=True).dblclick()
  page.wait_for_function("[...Aster.windows.values()].some(w=>w.appId==='custom-luna-tabelle')",timeout=20000)
  check('Real desktop double-click launches the installed Gridline original',page.locator('.window iframe.web-app-frame').count()==1)
  clear()
  # Real App Center views, not a replacement app list.
  openapp('store');shot('02-appstore.png')
  check('App Center has full discovery, installed and built-in views',page.locator('.library-tab').count()>=4,page.locator('.library-tab').all_text_contents())
  page.get_by_role('button',name='Aster-Programme',exact=True).click();page.wait_for_timeout(200);shot('02b-appstore-builtins.png')
  check('App Store built-in view includes Mines and Win32','Minen (Mines)' in page.locator('.library-content').inner_text() and 'Win32 (Win32 Lab)' in page.locator('.library-content').inner_text())
  page.get_by_role('button',name='Installiert',exact=True).click();page.wait_for_timeout(200);shot('02c-appstore-installed.png')
  check('App Store installed view contains all 19 originals',page.locator('.library-card').count()==19,page.locator('.library-card').count())
  clear();openapp('files',{'path':'/Apps'});shot('03-explorer.png')
  check('Explorer uses the upstream Aster File Explorer DOM',page.locator('.explorer').count()>0 or page.locator('.explorer-sidebar').count()>0)
  report['explorer_text']=page.locator('.window').inner_text()[:1800];clear()
  mapped=json.loads((ROOT/'app-mapping.json').read_text())
  shots={'tabelle':'04-tabelle.png','mail':'05-mail.png','korpus':'06-korpus.png'}
  for a in mapped:
   errors0=len(report['errors']);failures0=len(report['request_failures'])
   id='custom-luna-'+a['id'];openapp(id)
   handle=page.locator('.window iframe.web-app-frame').last.element_handle();frame=handle.content_frame()
   frame.wait_for_selector('body',timeout=20000);page.wait_for_timeout(1300)
   info=frame.evaluate('''() => ({title:document.title,text:document.body.innerText.slice(0,2200),elements:document.querySelectorAll('*').length,controls:document.querySelectorAll('button,input,select,textarea,[contenteditable]').length,canvases:document.querySelectorAll('canvas').length,url:location.href,ribbon:!!document.querySelector('.ribbon,#ribbon,[role=tablist],.ribbon-tabs'),inputs:[...document.querySelectorAll('input,textarea')].slice(0,15).map(e=>({id:e.id,cls:e.className,placeholder:e.placeholder})),classes:[...document.querySelectorAll('[class]')].slice(0,40).map(e=>e.className)})''')
   info.update({'repo':a['repo'],'file':a['path'],'sha256':a['sha256'],'errors':report['errors'][errors0:],'request_failures':report['request_failures'][failures0:]});report['apps'].append(info)
   actual_sha=frame.evaluate("""async()=>{const bytes=await(await fetch(location.href)).arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}""")
   info['executed_html_sha256']=actual_sha
   check('Executed HTML is byte-identical to upstream: '+a['repo'],actual_sha==a['sha256'],actual_sha)
   check('Original app mounts: '+a['repo'],info['elements']>30 and info['controls']>=5 and not any(t in info['text'] for t in ["Failed to construct 'URL'",'could not start','Initialization failed']),{'title':info['title'],'elements':info['elements'],'controls':info['controls'],'errors':info['errors']})
   check('Original app loads locally: '+a['repo'],(info['url'].startswith('blob:') or '/Apps/resources/' in info['url']) and not any('wieslawsoltes.github.io' in x.get('url','') for x in info['request_failures']))
   if a['id']=='tabelle':
    check('Tabelle == Gridline original HTML',a['sha256']=='31aa5e1ed31ba6e428ffd86c7ed4c734b71b3589d89a8f5d909b68e037c2d6de' and 'Gridline' in info['title'] and '30 Spalten' not in info['text'] and 'keine XLSX' not in info['text'])
    check('Gridline ribbon, formula bar and sheet tabs exist',frame.locator('#ribbon').is_visible() and frame.locator('#formula-input').is_visible() and frame.locator('#sheet-tabs .sheet-tab').count()>0,info['inputs'])
   if a['id'] in shots:shot(shots[a['id']])
   clear();save()
  openapp('calendar');shot('07-kalender.png');check('Calendar is the real Aster Calendar',bool(page.locator('.calendar-grid,.calendar-app,.cal-grid').count()),page.locator('.window').inner_text()[:700]);clear()
  openapp('settings',{'section':'themes'});shot('08-themes.png')
  check('Settings still offers Windows, macOS, Ubuntu and Luna',all(s in page.locator('.window').inner_text() for s in ['Windows','macOS','Ubuntu','Luna']))
  check('First-class Luna preset exports using Aster theme format',page.evaluate('''async()=>{const b=await Aster.themes.exportTheme();const j=JSON.parse(await b.text());return j.format==='aster-theme'&&j.theme.profile==='windows'&&j.theme.title==='Luna Korpus';}'''))
  for theme in ['macos26-light','ubuntu-light','windows-light','luna-korpus']:
   page.evaluate('''async id=>{await Aster.themes.select(id);}''',theme)
  check('Theme switching preserves the same Settings window',page.locator('.window').count()==1)
  clear()
  for id in ['custom-luna-tabelle','custom-luna-mail','custom-luna-korpus']:openapp(id,maximize=False)
  # Exercise the real Aster Snap implementation, not screenshot-only CSS.
  page.evaluate("""()=>{Aster.suppressSnapAssist=true;for(const [id,zone]of [['custom-luna-tabelle','left'],['custom-luna-mail','top-right'],['custom-luna-korpus','bottom-right']]){[...Aster.windows.values()].find(w=>w.appId===id).snap(zone);}Aster.suppressSnapAssist=false;}""")
  page.wait_for_timeout(1100)
  check('Native Aster Snap arranges three nonoverlapping original apps',page.evaluate("""()=>{const r=[...Aster.windows.values()].map(w=>w.rect);return r.every((a,i)=>r.every((b,j)=>i===j||a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y));}"""))
  # Inspect the actual Aster window geometry and native methods.
  info=page.evaluate('''()=>[...Aster.windows.values()].map(w=>({id:w.id,app:w.appId,rect:w.rect,methods:Object.getOwnPropertyNames(Object.getPrototypeOf(w))}))''');report['window_methods']=info
  shot('09-multiwindow.png')
  check('Three original programs share the Aster window manager',page.locator('.window').count()==3 and page.locator('iframe.web-app-frame').count()==3)
  color=page.locator('.window:not(.inactive)>.titlebar').last.evaluate('(el)=>getComputedStyle(el).backgroundColor')
  check('Focused caption is Luna blue #0078C8',color=='rgb(0, 120, 200)',color)
  page.keyboard.down('Alt');page.keyboard.press('Tab');page.keyboard.up('Alt');page.wait_for_timeout(150)
  check('Alt+Tab leaves the real multiwindow session alive',page.locator('.window').count()==3)
  # Persistence checks use Aster's real VFS, never host files.
  await_dummy=None
  page.evaluate('''async()=>{await Aster.fs.write('/Documents/Luna-QA.txt','Luna originals persistence check','text/plain');}''')
  clear();page.reload(wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.Aster?.booted && window.Aster?.luna?.verified===19',timeout=90000)
  check('VFS original HTML and user document survive reload',page.evaluate('''async()=>{const f=await Aster.fs.read('/Documents/Luna-QA.txt');return (await Aster.fs.text(f))==='Luna originals persistence check'&&Aster.appLibrary.records.length===19;}'''))
  check('No uncaught JavaScript exceptions',not report['errors'],report['errors'])
 except Exception as e:
  report['fatal']=str(e);check('QA execution completed',False,str(e));
  try:page.screenshot(path=str(OUT/'failure.png'));report['failure_text']=page.locator('body').inner_text()[:5000]
  except Exception:pass
 finally:
  save();print(json.dumps({'passed':report['passed'],'failed':report['failed'],'fatal':report.get('fatal'),'errors':report['errors'],'report':str(OUT/'results.json')},ensure_ascii=False),flush=True);browser.close()
if server:server.shutdown()
sys.exit(1 if report['failed'] else 0)

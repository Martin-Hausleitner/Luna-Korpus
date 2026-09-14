#!/usr/bin/env python3
"""Browser QA for the actual, single-file application. No npm or runtime dependencies.

Normal: python tests/verify.py --require-gpu --require-storage
Hosted: python tests/verify.py --url https://OWNER.github.io/Luna-Korpus/ --require-gpu --require-storage
Restricted renderer: --in-memory --chromium /usr/bin/chromium

The restricted mode uses the unchanged HTML in an opaque about:blank document.
It never labels storage test doubles or unavailable WebGPU as native E2E passes.
"""
from __future__ import annotations
import argparse, functools, hashlib, http.server, json, math, os, pathlib, platform, re, threading, time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--url')
parser.add_argument('--in-memory',action='store_true')
parser.add_argument('--chromium',default=os.environ.get('CHROME_BIN'))
parser.add_argument('--out',default=str(ROOT/'qa'))
parser.add_argument('--require-gpu',action='store_true')
parser.add_argument('--require-storage',action='store_true')
parser.add_argument('--live-only',action='store_true')
parser.add_argument('--gpu-backend',choices=['auto','native','swiftshader'],default='auto')
args=parser.parse_args()
OUT=pathlib.Path(args.out);OUT.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'Luna-Korpus.html').read_text()
report={'application':'LUNA KORPUS','source_sha256':hashlib.sha256(HTML.encode()).hexdigest(),
 'observed_at':datetime.now(timezone.utc).isoformat(),'viewport':{'width':1920,'height':1080},
 'execution':'in-memory HTML / opaque origin' if args.in_memory else 'browser navigation / real origin',
 'url':'about:blank (document.setContent, exact source bytes)' if args.in_memory else args.url,
 'checks':[],'console_errors':[],'screenshots':[],'limitations':[]}

def check(name,passed,detail='',category='browser'):
    report['checks'].append({'name':name,'status':'PASS' if passed else 'FAIL','category':category,'detail':detail})
    print(('PASS ' if passed else 'FAIL ')+name+(' — '+detail if detail else ''),flush=True)

def blocked(name,detail):
    report['checks'].append({'name':name,'status':'BLOCKED','category':'environment','detail':detail})
    print('BLOCKED '+name+' — '+detail,flush=True)

def close(a,b,tol=1e-6):return math.isclose(a,b,abs_tol=tol)
server=None
if not args.in_memory and not args.url:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*a):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    args.url=f'http://127.0.0.1:{server.server_port}/Luna-Korpus.html'
    report['url']=args.url

with sync_playwright() as p:
    backend=args.gpu_backend if args.gpu_backend!='auto' else ('native' if platform.system()=='Darwin' else 'swiftshader')
    flags=['--no-sandbox','--enable-unsafe-webgpu']
    if backend=='swiftshader':flags+=['--use-angle=swiftshader','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']
    launch={'headless':True,'args':flags}
    report['browser_launch']={'backend':backend,'flags':flags,'host':platform.system()}
    if args.chromium:launch['executable_path']=args.chromium
    browser=p.chromium.launch(**launch)
    context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1,accept_downloads=True)
    page=context.new_page();page.set_default_timeout(6000)
    page.on('pageerror',lambda e:report['console_errors'].append(str(e)))
    page.on('console',lambda m:report['console_errors'].append(m.text) if m.type=='error' else None)
    requests=[]
    page.on('request',lambda r:requests.append(r.url))
    def load():
        if args.in_memory:page.set_content(HTML,wait_until='load')
        else:page.goto(args.url,wait_until='load')
        page.wait_for_function('window.Luna && Luna.getBOM() && Luna.metrics.firstFrameMs > 0')
    def click(s):page.locator(s).click()
    def pause(ms=90):page.wait_for_timeout(ms)
    def state():return page.evaluate('Luna.getState()')
    def model():return page.evaluate('Luna.getModel()')
    def bom():return page.evaluate('Luna.getBOM()')
    def reset():
        page.evaluate("for(const id of [...Luna.wm.windows.keys()])if(id!=='korpus')Luna.wm.close(id);Luna.loadDemo('base');")
        page.evaluate("const d=Luna.getState();d.waste=false;d.settings.theme='light';d.settings.forceCanvas=false;d.view.dimensions=true;d.view.holes=false;d.view.grid=true;d.view.doorAngle=108;d.view.mode='solid';d.view.explode=.65;d.handedOff=null;Luna.importJSON(JSON.stringify(d));")
        pause()
    def shot(name):
        page.screenshot(path=str(OUT/name))
        report['screenshots'].append({'file':name,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest(),'width':page.viewport_size['width'],'height':page.viewport_size['height'],'renderer':page.evaluate("Luna.gpu.active?'WebGPU':'Canvas 2D'")})
    try:
        load();pause(900)
        metrics=page.evaluate('Luna.metrics');report['startup_metrics']=metrics
        gpu=page.evaluate('Luna.gpu.active');report['gpu']={'active':gpu,'reason':page.evaluate('Luna.gpu.reason'),'adapter':page.evaluate('Luna.gpu.adapter||null')}
        if gpu:check('Native WebGPU adapter, shader and draw',True,category='native')
        else:blocked('Native WebGPU execution',report['gpu']['reason'] or 'No adapter')
        native_storage=page.evaluate("(()=>{try{localStorage.setItem('__luna_qa','ok');let ok=localStorage.getItem('__luna_qa')==='ok';localStorage.removeItem('__luna_qa');return ok}catch{return false}})()")
        report['native_storage']=native_storage
        if native_storage:check('Native localStorage read/write',True,category='native')
        else:blocked('Native origin persistence','Opaque in-memory document has no localStorage permission; storage logic is tested separately with an explicit double.')
        check('Bootstrap <= 700 ms',metrics['bootMs']<=700,f"{metrics['bootMs']:.1f} ms")
        check('First cabinet render < 1 s',0<metrics['firstFrameMs']<1000,f"{metrics['firstFrameMs']:.1f} ms")
        check('Required architecture namespaces',page.evaluate("['theme','wm','store','cad','gpu','bom','apps'].every(k=>!!Luna[k])"),category='source')
        check('80–250 KB single runtime file',80000<=len(HTML.encode())<=250000,str(len(HTML.encode()))+' bytes',category='source')
        check('No iframe / external script / external font',not re.search(r'<iframe|<script[^>]+src=|fonts\.google|<link[^>]+href="https?://',HTML,re.I),category='source')
        check('No runtime network dependencies',not [u for u in requests if u!=args.url and not u.startswith('data:')],str(requests))
        b=bom();m=model()
        expected={'S01':[720,541,19],'S02':[720,541,19],'B01':[562,541,19],'B02':[562,541,19],'R01':[720,600,19],'F01':[560,518,19],'P01':[562,120,19],'D01':[716,596,19]}
        check('600 base: every part matches independent dimensions',all([r['L'],r['W'],r['T']]==expected[r['id']] for r in b['parts']) and len(b['parts'])==8,category='model')
        check('600 base: independently calculated totals',close(b['totals']['area'],2.60338) and close(b['totals']['edgeM'],6.31) and close(b['totals']['hardwareCost'],42.82) and close(b['totals']['total'],228.99934),json.dumps(b['totals']),category='model')
        check('BOM panel volume equals visible panel geometry',all(close(r['L']*r['W']*r['T'],math.prod(next(x['size'] for x in m['parts'] if x['id']==r['id']))) for r in b['parts']),category='model')
        check('Hole schedule: 80 holes, 32-mm steps, 37-mm front datum',len(m['holes'])==80 and all(close(h['z'],243) for h in m['holes'] if h['row']=='vorn') and all(close(b-a,32) for a,b in zip(sorted(set(h['y'] for h in m['holes']))[:-1],sorted(set(h['y'] for h in m['holes']))[1:])),category='model')
        check('Hardware: 2 hinges + 2 plates + 4 pins + 4 feet + handle',[(r['id'],r['qty']) for r in b['hardware']]==[('H01',2),('H02',2),('H03',4),('H04',4),('H05',1)],category='model')
        check('No hardware accidentally selected in initial view',page.evaluate("Luna.getState().model.doors===1 && document.querySelectorAll('#part-tree .active').length===0"))
        if not args.live_only:
            # Real parameter input events and derived BOM changes.
            page.locator('#param-width').fill('800');page.locator('#param-width').press('Tab');pause()
            check('Width input drives CAD and BOM live',state()['model']['width']==800 and next(r for r in bom()['parts'] if r['id']=='B01')['L']==762)
            page.locator('#param-width').fill('10');page.locator('#param-width').press('Tab');pause()
            check('Invalid dimension rejected without corrupting model',state()['model']['width']==800 and page.locator('#param-width').input_value()=='800')
            page.locator('#param-back').fill('6');page.locator('#param-back').press('Tab');pause()
            check('Independent back thickness changes carcass depth allocation',next(r for r in bom()['parts'] if r['id']=='S01')['W']==554)
            page.locator('#param-side').fill('15');page.locator('#param-side').press('Tab');pause()
            check('Side thickness input safely adjusts door overlay',state()['model']['side']==15 and state()['model']['overlay']==13)
            reset()
            click('[data-inspector="front"]');click('[data-doors="2"]');pause()
            check('Two real door leaves and four hinges',len([r for r in model()['parts'] if r['kind']=='door'])==2 and all(r['W']==297 for r in bom()['parts'] if r['id'].startswith('D')) and bom()['hardware'][0]['qty']==4)
            click('[data-grain="horizontal"]');pause()
            check('Door grain direction changes model and export',state()['model']['grain']=='horizontal' and all(r['grain']=='horizontal' for r in bom()['parts'] if r['id'].startswith('D')))
            click('#part-tree [data-part="S01"]');click('[data-edge="B1"]');pause()
            check('Selected-part edge override updates raw cut size',next(r for r in bom()['parts'] if r['id']=='S01')['cutL']==719)
            click('[data-doors="0"]');pause()
            check('Door removal removes door panels and door hardware',not [r for r in model()['parts'] if r['kind']=='door'] and not [r for r in bom()['hardware'] if r['id'] in ['H01','H02','H05']])
            reset();before=bom()['totals'];click('#waste-btn');pause();after=bom()['totals']
            check('12% waste applies only to panel material',close(after['materialCost'],before['materialCost']*1.12) and close(after['edgeCost'],before['edgeCost']) and close(after['hardwareCost'],before['hardwareCost']))
            click('.commandbar [data-action="undo"]');pause();check('Undo restores model/waste state',not state()['waste'])
            click('.commandbar [data-action="redo"]');pause();check('Redo restores last change',state()['waste'])
            reset()
            click('.commandbar [data-app="material"]');click('#material-window [data-material="white"]');pause()
            check('White material changes all panels and prices',state()['model']['material']=='white' and all(r['materialId']=='white' for r in bom()['parts']) and close(bom()['totals']['materialCost'],2.60338*26))
            click('#material-window [data-material="ply"]');pause()
            check('Plywood preset sets all six thicknesses to 15',all(state()['model'][k]==15 for k in ['side','top','bottom','back','shelf','front']) and state()['model']['overlay']==13)
            page.evaluate("Luna.wm.close('material')");reset()
            click('#part-tree [data-part="S02"]');pause();check('Tree selection highlights BOM row',page.locator('#bom-table tr.selected').get_attribute('data-part')=='S02')
            vp=page.locator('#viewport').bounding_box()
            pt=page.evaluate('Luna.qa.project([.3,.55,.06])')
            page.mouse.click(vp['x']+pt['x'],vp['y']+pt['y']);pause()
            check('3D ray picking selects the actual right panel',page.locator('#bom-table tr.selected').get_attribute('data-part')=='S02')
            camera_before=page.evaluate('({yaw:Luna.gpu.camera.yaw,pitch:Luna.gpu.camera.pitch,distance:Luna.gpu.camera.distance,pan:[...Luna.gpu.camera.pan]})')
            x,y=vp['x']+vp['width']*.58,vp['y']+vp['height']*.45
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+57,y+22,steps=6);page.mouse.up();pause()
            check('Orbit drag changes camera',not close(page.evaluate('Luna.gpu.camera.yaw'),camera_before['yaw']))
            distance=page.evaluate('Luna.gpu.camera.distance');page.mouse.wheel(0,-170);pause();check('Wheel zoom changes camera distance',page.evaluate('Luna.gpu.camera.distance')<distance)
            pan=page.evaluate('[...Luna.gpu.camera.pan]');page.keyboard.down('Shift');page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+25,y,steps=3);page.mouse.up();page.keyboard.up('Shift');pause();check('Shift-drag pans camera',page.evaluate('Luna.gpu.camera.pan[0]')!=pan[0])
            click('[data-camera="iso"]');page.evaluate('Luna.selectPart(null)');pause()
            assembled=page.evaluate("Luna.qa.scene().find(p=>p.id==='S01').center")
            click('[data-mode="explode"]');pause();exploded=page.evaluate("Luna.qa.scene().find(p=>p.id==='S01').center")
            check('Explode really separates side panel by 169 mm',close(assembled[0]-exploded[0],.169),category='geometry')
            check('Explode preserves exact BOM dimensions',all([r['L'],r['W'],r['T']]==expected[r['id']] for r in bom()['parts']),category='model')
            page.locator('#explode-range').focus();page.keyboard.press('End');pause();check('Explosion slider controls part separation',state()['view']['explode']==1)
            click('[data-mode="solid"]');pause();page.locator('#door-angle').focus();page.keyboard.press('Home');pause();check('Door slider rotates real geometry closed',state()['view']['doorAngle']==0 and close(page.evaluate("Luna.qa.scene().find(p=>p.id==='D01').angle"),0))
            page.keyboard.press('End');pause();check('Door slider rotates real geometry open',state()['view']['doorAngle']==120 and close(abs(page.evaluate("Luna.qa.scene().find(p=>p.id==='D01').angle")),math.radians(120)))
            reset();click('[data-inspector="system"]');click('[data-action="holes-check"]');pause()
            check('System-32 inspector and 3D hole display',state()['view']['holes'] and page.locator('.hole-list tbody tr').count()==20)
            # Every supported type, plus pure parameter-domain stress.
            for demo,typ,n in [('wall','wall',8),('tall','tall',11),('shelf','shelf',9),('corner','corner',14)]:
                page.evaluate('(d)=>Luna.loadDemo(d)',demo);pause()
                cm=model();cb=bom()
                check('Preset '+typ+': valid panels and finite totals',cm['params']['type']==typ and all(min(p['L'],p['W'],p['T'])>0 for p in cb['parts']) and math.isfinite(cb['totals']['total']),f"{len(cm['parts'])} panels",category='model')
                if typ=='tall':check('Tall unit hinge-height rule',cb['hardware'][0]['qty']==5,category='model')
                if typ=='corner':check('L-corner is two abutting rectangular arms',len(cm['parts'])==14 and cm['params']['doors']==0 and cm['bounds']['width']==1000 and cm['bounds']['depth']==1000,category='model')
            stress=page.evaluate("""()=>{const d=Luna.getState().model;let count=0,errors=[];for(const w of [300,600,900,1200])for(const h of [400,720,1500,2100])for(const depth of [300,560,700]){try{const m=Luna.cad.build({...d,type:'base',width:w,height:h,depth,doors:1,plinth:120,shelves:h>1000?3:1});const b=Luna.bom.calculate(m,true);if(!b.parts.every(p=>p.L>0&&p.W>0&&p.T>0&&p.cutL>0&&p.cutW>0)||!Number.isFinite(b.totals.total))errors.push([w,h,depth]);count++}catch(e){errors.push(e.message)}}return {count,errors}}""")
            check('48 dimension combinations: valid generated panels and totals',stress['count']==48 and not stress['errors'],str(stress),category='model')
            reset();click('.commandbar [data-app="library"]');click('#library-window [data-demo="run"]');pause()
            check('Kitchen library loads 3 base + 2 wall modules',len(state()['run'])==5 and [x['type'] for x in state()['run']]==['base','base','base','wall','wall'])
            click('[data-run="1"]');page.evaluate('Luna.setModel({width:850})');click('[data-run="3"]');click('[data-run="1"]');pause()
            check('Kitchen switcher retains per-module edits',state()['model']['width']==850 and state()['run'][3]['width']==900)
            reset()
            # Download bytes, not merely button existence.
            with page.expect_download() as dl:click('#bom-dock [data-export="csv"]')
            csv_path=OUT/'export.csv';dl.value.save_as(csv_path);csv_text=csv_path.read_text(encoding='utf-8-sig')
            check('CSV download contains actual parts, hardware and total',all(s in csv_text for s in ['S01','720','541','H01','228,9993','Fertigmaße']))
            with page.expect_download() as dl:click('#bom-dock [data-export="json"]')
            json_path=OUT/'export.json';dl.value.save_as(json_path);payload=json.loads(json_path.read_text())
            check('JSON export contains model, BOM, hole schedule, no CNC',payload['schema']=='luna.korpus/v1' and len(payload['parts'])==8 and len(payload['holeSchedule'])==80 and payload['cnc'] is False)
            click('.commandbar [data-app="drawing"]');pause()
            check('2D drawing is generated from the active model',page.locator('#drawing-window .drawing-paper svg rect').count()>10 and '600 × 720 × 560' in page.locator('#drawing-window .drawing-paper').inner_text())
            with page.expect_download() as dl:click('#drawing-window [data-export="svg"]')
            svg_path=OUT/'drawing.svg';dl.value.save_as(svg_path);check('SVG drawing export is a real standalone SVG','<svg xmlns=' in svg_path.read_text())
            with page.expect_download() as dl:click('#drawing-window [data-export="dxf"]')
            dxf_path=OUT/'drawing.dxf';dl.value.save_as(dxf_path);check('DXF export contains model-derived millimetre LINE entities','$INSUNITS' in dxf_path.read_text() and dxf_path.read_text().count('LINE')==64)
            page.evaluate("Luna.wm.close('drawing')")
            # Import validation; injected prices and totals are never trusted.
            payload['model']['width']=760;payload['totals']['total']=-100000
            page.locator('#import-file').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':json.dumps(payload).encode()});pause(250)
            check('JSON import recalculates instead of trusting supplied totals',state()['model']['width']==760 and bom()['totals']['total']>0)
            old=state()['model']['width'];page.locator('#import-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"schema":"wrong","model":{"width":1}}'});pause(200)
            check('Invalid import leaves existing model unchanged',state()['model']['width']==old)
            reset()
            if native_storage:
                page.evaluate('Luna.setModel({width:777})');click('.commandbar [data-action="handoff"]');pause()
                persisted=page.evaluate("JSON.parse(localStorage.getItem('luna.korpus.v1'))")
                check('Native handoff writes contract key and actual BOM',persisted['model']['width']==777 and len(persisted['parts'])==8 and bool(persisted['handedOff']['at']),category='native')
                page.reload(wait_until='load');pause(500);check('Native reload restores stored model',state()['model']['width']==777,category='native')
            else:
                failed=page.evaluate('Luna.store.handoff()');check('Blocked storage fails closed, does not invent handoff',failed is False and state()['handedOff'] is None)
                unit=page.evaluate("""()=>{const before=Object.getOwnPropertyDescriptor(window,'localStorage'),data=new Map();const double={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:double});let result;try{const saved=Luna.store.save(false),handoff=Luna.store.handoff(),raw=JSON.parse(data.get('luna.korpus.v1'));result={saved,handoff,key:data.has('luna.korpus.v1'),parts:raw.parts.length,total:raw.totals.total,at:!!raw.handedOff.at,loaded:Luna.store.load().model.width}}finally{Object.defineProperty(window,'localStorage',before)}return result}""")
                check('Storage contract logic with explicit memory test double',unit['saved'] and unit['handoff'] and unit['key'] and unit['parts']==8 and unit['at'] and unit['loaded']==600,str(unit),category='unit-test-double-NOT-native-E2E')
                report['limitations'].append('Storage contract unit test uses an explicit temporary Map-backed double. Native persistence and browser-reload persistence are NOT established in this environment.')
                load();pause(300)
            reset()
            click('.menubar [data-app="settings"]');click('#settings-window [data-setting="forceCanvas"]');pause()
            check('Settings force real Canvas fallback without losing model',not page.evaluate('Luna.gpu.active') and state()['model']['width']==600 and page.locator('#fallback-canvas').is_visible())
            page.locator('#settings-window [data-setting="theme"]').select_option('dark');pause();check('Theme changes shared window tokens',page.locator('body').evaluate("e=>e.classList.contains('dark')"))
            page.locator('#settings-window [data-setting="theme"]').select_option('light')
            page.evaluate("Luna.wm.close('settings')")
            click('#start-button');page.locator('#start-search').fill('Zeich');pause();check('Start search filters app registry',page.locator('#start-grid .start-app').count()==1 and 'Zeichnung' in page.locator('#start-grid').inner_text())
            click('#start-grid [data-app="drawing"]');pause();check('Start launches an in-process window',page.locator('#drawing-window').is_visible() and page.locator('iframe').count()==0)
            click('#drawing-window [data-win="minimize"]');check('Caption minimize hides window',page.locator('#drawing-window').is_hidden())
            click('#task-apps [data-task="drawing"]');check('Taskbar restores minimized window',page.locator('#drawing-window').is_visible())
            click('#drawing-window [data-win="maximize"]');check('Caption maximize changes window state',page.locator('#drawing-window').evaluate("e=>e.classList.contains('maximized')"))
            click('#drawing-window [data-win="maximize"]')
            box=page.locator('#drawing-window .caption-title').bounding_box();old_left=page.locator('#drawing-window').bounding_box()['x'];page.mouse.move(box['x']+85,box['y']+15);page.mouse.down();page.mouse.move(box['x']+125,box['y']+35,steps=4);page.mouse.up();pause();check('Caption drag moves window',not close(page.locator('#drawing-window').bounding_box()['x'],old_left))
            click('#drawing-window [data-win="close"]');check('Caption close removes auxiliary window',page.locator('#drawing-window').count()==0)
        # Eight mandatory captures, on unaltered application rendering paths.
        reset();pause(4500)
        if args.live_only:
            shot('live-01-desktop.png');click('[data-mode="explode"]');pause(300);shot('live-03-explode.png')
        else:
            shot('02-korpus-solid.png')
            click('[data-mode="explode"]');pause(230);shot('03-explode.png')
            reset();pause(4600);click('.desktop-icon[data-app="bom"]');pause(150);shot('04-bom.png');page.evaluate("Luna.wm.close('bom')")
            click('[data-inspector="system"]');click('[data-action="holes-check"]');pause(160);shot('05-32mm.png')
            click('.commandbar [data-app="library"]');click('#library-window [data-demo="run"]');pause(4500);click('[data-run="3"]');pause(250);shot('06-zeile.png')
            reset();pause(4500);click('.commandbar [data-app="material"]');pause(160);shot('07-multiwindow.png');page.evaluate("Luna.wm.close('material')")
            click('.menubar [data-app="settings"]');pause(160);shot('08-settings.png');page.evaluate("Luna.wm.close('settings')")
            click('[data-action="desktop"]');click('#start-button');pause(130);shot('01-desktop.png');page.keyboard.press('Escape');click('#task-apps [data-task="korpus"]')
            click('.commandbar [data-app="drawing"]');pause(140);shot('09-drawing.png');page.evaluate("Luna.wm.close('drawing')")
            page.set_viewport_size({'width':1440,'height':900});page.evaluate('Luna.gpu.fit()');pause(160);shot('10-korpus-1440.png')
            # Resize geometry must stay inside the viewport at the acceptance resolution.
            box=page.locator('#korpus-window').bounding_box();check('1440×900 window remains inside usable desktop',box['x']>=0 and box['y']>=0 and box['x']+box['width']<=1441 and box['y']+box['height']<=853)
            check('1440×900 footer and 3D canvas are visible',page.locator('.footer').is_visible() and page.locator('#viewport').bounding_box()['height']>=250)
            page.set_viewport_size({'width':390,'height':844});page.evaluate('Luna.gpu.fit()');pause(160);shot('11-mobile.png')
            check('Narrow-screen main window fits browser width',page.locator('#korpus-window').bounding_box()['width']<=391)
            page.set_viewport_size({'width':1920,'height':1080});page.evaluate('Luna.gpu.fit()');pause(100)
        check('No JavaScript runtime errors',not report['console_errors'],str(report['console_errors']))
        report['application_errors']=page.evaluate('Luna.qa.errors')
        check('Application error collector is empty',not report['application_errors'],str(report['application_errors']))
        report['final_metrics']=page.evaluate('Luna.metrics')
    except Exception as e:
        check('Test harness completed',False,type(e).__name__+': '+str(e))
        try:shot('FAILURE.png')
        except Exception:pass
    finally:
        browser.close()
        if server:server.shutdown()
        failures=[c for c in report['checks'] if c['status']=='FAIL']
        required_block=bool(args.require_gpu and not report.get('gpu',{}).get('active')) or bool(args.require_storage and not report.get('native_storage'))
        report['summary']={'passed':sum(c['status']=='PASS' for c in report['checks']),'failed':len(failures),'blocked':sum(c['status']=='BLOCKED' for c in report['checks']),'functional_result':'PASS' if not failures else 'FAIL','full_acceptance':'PASS' if not failures and report.get('gpu',{}).get('active') and report.get('native_storage') else 'NOT_ESTABLISHED'}
        (OUT/'results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
        print(json.dumps(report['summary']),flush=True)
        if failures or required_block:raise SystemExit(1)

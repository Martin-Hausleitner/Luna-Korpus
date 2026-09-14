from pathlib import Path
import json,subprocess,gzip,base64,shutil
BASE=Path(__file__).resolve().parent;OUT=BASE/'release';ROOT=OUT/'aster'; UP=BASE/'Aster'
manifest=json.loads((OUT/'app-mapping.json').read_text())
labels={'files':'Explorer (File Explorer)','notepad':'Notizen (Notepad)','browser':'Browser (Orbit Browser)','terminal':'Eingabe (Terminal)','paint':'Farbe (Paint)','photos':'Fotos (Photos)','media':'Medien (Media Player)','code':'Code (Code Studio)','snips':'Ausschnitt (Snips)','calculator':'Rechner (Calculator)','calendar':'Kalender (Calendar)','clock':'Uhr (Clock)','tasks':'Aufgaben (Tasks)','settings':'Einstellungen (Settings)','taskmanager':'Prozesse (Task Manager)','store':'App Store (App Center)','welcome':'Willkommen (Welcome)','mines':'Minen (Mines)','win32':'Win32 (Win32 Lab)','accessibility':'Bedienung (Accessibility Tools)','clipboard':'Zwischenablage (Clipboard History)','focus':'Fokus (Focus Sessions)','widgets':'Übersicht (Widget Board)','workspaces':'Fenstergruppen (Window Groups)','history':'Dateiverlauf (File History)','storage':'Speicher (Storage Manager)','archives':'Archive (ZIP Archives)','recorder':'Aufnahme (Screen Recorder)'}
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=UP,text=True).strip()
config='window.LUNA_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\nwindow.LUNA_BUILTIN_NAMES='+json.dumps(labels,ensure_ascii=False,separators=(',',':'))+';\nwindow.LUNA_ASTER_COMMIT='+json.dumps(revision)+';\n'
(ROOT/'src/luna-config.js').write_text(config)
packed=gzip.compress((BASE/'payload-bundled.json').read_bytes(),compresslevel=9,mtime=0)
(ROOT/'src/luna-vendor.js').write_text('/* Exact upstream packages and resource-only offline bundles. See app-mapping.json. */\nwindow.LUNA_PACK_GZIP='+json.dumps(base64.b64encode(packed).decode())+';\n')
print('Compressed app archive',len(packed),'bytes')
def patch(name,edits):
 s=(UP/name).read_text()
 for old,new in edits:
  if old not in s:raise RuntimeError('Missing patch anchor '+name+': '+old[:90])
  s=s.replace(old,new,1)
 (ROOT/name).write_text(s)
patch('src/core.js',[("indexedDB.open('aster-desktop', 2)","indexedDB.open('luna-korpus-aster', 2)")])
patch('index.html',[
 ('<html lang="en">','<html lang="de">'),('<title>Aster Desktop</title>','<title>LUNA KORPUS · EDV Hausleitner</title>'),
 ('<strong>Aster</strong>','<strong>LUNA</strong>'),('Your space. Your pace.','EDV Hausleitner · Holztechnik · Korpus · Stückliste'),
 ('</head>','<link rel="stylesheet" href="src/luna.css">\n</head>'),
 ('<script src="src/shell.js"></script>','<script src="src/luna-config.js"></script>\n<script src="src/luna-vendor.js"></script>\n<script src="src/luna.js"></script>\n<script src="src/shell.js"></script>'),
 ('<main id="desktop"','<div id="luna-wallmark" aria-hidden="true"><div class="luna-company"><b>EDV</b> Hausleitner</div><div class="luna-product">LUNA</div><div class="luna-claim">Holztechnik · Korpus · Stückliste</div><div class="luna-origin">ASTER DESKTOP · ORIGINAL APPLICATIONS</div></div>\n  <main id="desktop"')])
catmap={r['repo']:r['title'] for r in manifest}
patch('src/web-app-catalog.js',[("app.id = 'web-' + app.repo.toLowerCase();","app.originalTitle = app.title;\n        app.title = ("+json.dumps(catmap,ensure_ascii=False)+")[app.repo] || app.title + ' (' + app.repo + ')';\n        app.id = 'web-' + app.repo.toLowerCase();")])
patch('src/windows.js',[("setTitle(title) { this.title = title;","setTitle(title) { title = OS.lunaWindowTitle?.(this.appId,title) || title; this.title = title;")])
patch('src/app-library.js',[("OS.clipboardTools.attachFrame(frame,w);frame.srcdoc=OS.webIO?OS.webIO.bootstrap(html):html;w.body.append(frame);","const prepared=OS.lunaPrepareHTML?await OS.lunaPrepareHTML(html,current):{html,trusted:false};if(!alive||w.closed)return;\n                    if(prepared.trusted){frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups');frame.dataset.upstreamSha256=prepared.sha256;frame.setAttribute('allow','clipboard-read; clipboard-write; fullscreen; autoplay');if(current.id==='custom-luna-gespraech')frame.setAttribute('allow','clipboard-read; clipboard-write; fullscreen; autoplay; camera; microphone; display-capture');}\n                    OS.clipboardTools.attachFrame(frame,w);frame.srcdoc=OS.webIO?OS.webIO.bootstrap(prepared.html):prepared.html;w.body.append(frame);")])
patch('src/app-store.js',[
 ("||'discover', selected=", "||'all', selected="),
 ("el('strong',{text:'App Center'})", "el('strong',{text:'App Store (App Center)'})"),
 ("const labels={discover:'Discover',installed:'Installed',favorites:'Favorites',builtin:'Built-in apps'};","const labels={all:'Alle Apps',discover:'Katalog',installed:'Installiert',favorites:'Favoriten',builtin:'Aster-Programme'};"),
 ("all.filter(a=>view==='discover'?a.webApp:","all.filter(a=>view==='all'?true:view==='discover'?a.webApp:"),
 ("text:r?r.kind==='html'?'HTML app':'Web link':app.webApp?'Web app':'Built-in'","text:app.localPackage?'Original · lokal':r?r.kind==='html'?'Original HTML':'Web link':app.webApp?'Katalog':'Aster'"),
 ("Imported apps and web links stay in an opaque sandbox.","Ordinary imported apps and web links stay in an opaque sandbox. Only SHA-256-verified bundled Luna originals receive their browser-storage context."),
 ("Catalog apps load from reviewed project URLs when opened. They are not downloaded into this library.","Mapped Luna catalog entries open the verified local original HTML. Other catalog apps load from their original reviewed project URLs.")])
patch('src/shell.js',[
 ("<strong>${esc(now.toLocaleDateString(undefined, { weekday: 'long' }))}</strong><small>${esc(now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} · Your day</small>","<strong>LUNA</strong><small>EDV Hausleitner</small>"),
 ("'aria-label': 'Start', html:","'aria-label': 'Start (Start)', html:"),
 ("title: 'Start (Ctrl + Space)'","title: 'Start (Start) · Ctrl + Space'")])
patch('src/apps-system.js',[("<h3>Built for the browser</h3>","<h3>LUNA · gebaut auf Aster</h3><p>EDV Hausleitner · Holztechnik · Korpus · Stückliste. Unofficial skin, not licensed WAWI. All application engines are upstream originals.</p><h3>Built for the browser</h3>"),
 ("<br><br>The project uses original icons, graphics, code, and branding.","<br><br>LUNA KORPUS is an unofficial skin and German launcher layout built on Aster. Not licensed WAWI. Aster and each application retain their original authorship; see /Apps and app-mapping.json. Luna skin code is MIT; upstream notices govern each bundled application.<br><br>The project uses original icons, graphics, code, and branding.")])
luna={"shellMode":"dark","appMode":"light","accent":"#0078c8","selection":"#0078c8","accentOnTitle":True,"transparency":True,"background":{"type":"color","color":"#0b3a5b"},"colors":{"ActiveTitle":"#0078c8","TitleText":"#ffffff"},"titleHeight":36,"taskbar":{"position":"bottom","align":"center","size":40},"iconFamily":"windows"}
patch('src/theme-models.js',[("const PRESETS = [","const PRESETS = [\n        preset('luna-korpus','Luna Korpus',"+json.dumps(luna,separators=(',',':'))+"),")])
# Stock getPreset fallback must still be Windows Light after adding the Luna preset.
p=(ROOT/'src/theme-models.js');s=p.read_text().replace("|| PRESETS[0]","|| PRESETS.find(t => t.id === 'windows-light')");p.write_text(s)
(ROOT/'src/luna.css').write_text('''/* Chrome-only paint. Aster owns the desktop, windows and applications. MIT. */
body[data-luna="true"] #taskbar { background:#1c1c1c!important; border-top:1px solid #ffffff20; }
body[data-luna="true"] .window.active>.titlebar,
body[data-luna="true"] .window.focused>.titlebar {background:#0078c8!important;color:#fff!important;}
body[data-luna="true"] .window.active>.titlebar button,
body[data-luna="true"] .window.focused>.titlebar button {color:#fff;}
body[data-luna="true"] .task-left strong{letter-spacing:.12em;font-size:15px;}
body[data-luna="true"] #desktop-icons .desktop-icon {width:126px;min-height:94px;}
body[data-luna="true"] #desktop-icons .desktop-icon>span:last-child {max-width:122px;white-space:normal;overflow-wrap:normal;font-size:12px;line-height:1.3;}
#luna-wallmark{display:none;position:fixed;right:9%;top:27%;z-index:0;pointer-events:none;color:#fff;text-align:left;}
body[data-luna="true"] #luna-wallmark{display:block;}
.luna-company{font-size:22px;font-weight:300;letter-spacing:.02em;opacity:.8;}
.luna-company b{font-weight:750;margin-right:7px;}
.luna-product{font-size:clamp(80px,10vw,168px);font-weight:250;letter-spacing:.10em;line-height:1.35;margin-left:-7px;}
.luna-claim{font-size:19px;letter-spacing:.03em;opacity:.9;}
.luna-origin{margin-top:30px;font-size:9px;letter-spacing:.22em;opacity:.4;}
body[data-luna="true"] .library-card-title {line-height:1.35;}
@media(max-width:800px){#luna-wallmark{right:6%;top:34%;opacity:.5}.luna-product{font-size:64px}.luna-company{font-size:16px}.luna-claim{font-size:11px}.luna-origin{display:none}}
''')
(OUT/'build.py').write_text('''#!/usr/bin/env python3
"""Build the themed original Aster with Aster's unmodified standard-library builder."""
from pathlib import Path
import subprocess,sys,shutil
ROOT=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(ROOT/'aster/build.py'),'--output',str(ROOT/'Luna-Korpus.html')],check=True)
shutil.copyfile(ROOT/'Luna-Korpus.html',ROOT/'index.html')
print('Pages index.html is byte-identical to Luna-Korpus.html.')
''')
(OUT/'.nojekyll').touch()
(OUT/'build-tools').mkdir(exist_ok=True)
shutil.copy2(__file__,OUT/'build-tools/apply_luna.py')
shutil.copy2(BASE/'tools/bundle-assets.mjs',OUT/'build-tools/bundle-assets.mjs')
for name in ['package.json','package-lock.json']:
 shutil.copy2(BASE/'tools'/name,OUT/'build-tools'/name)
shutil.copy2(BASE/'bundle-report.json',OUT/'build-tools/bundle-report.json')
subprocess.run(['python3','build.py'],cwd=OUT,check=True)
print('Modified Aster source files: metadata, local-package adapter, theme only.')

/* LUNA v2: premium branding and EDV Hausleitner workspace layout.
 * Additive only: Aster remains the shell; original app payloads remain untouched.
 */
'use strict';
(() => {
 const OS=Aster;
 const builtinNames={
  files:'Explorer (File Explorer)',notepad:'Notizen (Notepad)',browser:'Browser (Orbit Browser)',
  terminal:'Konsole (Terminal)',paint:'Farbe (Paint)',photos:'Fotos (Photos)',media:'Medien (Media Player)',
  code:'Code (Code Studio)',snips:'Ausschnitt (Snips)',calculator:'Rechner (Calculator)',calendar:'Kalender (Calendar)',
  clock:'Uhr (Clock)',tasks:'Aufgaben (Tasks)',settings:'Einstellungen (Settings)',taskmanager:'System (Task Manager)',
  store:'Programme (App Center)',welcome:'Über Luna (About)',mines:'Minen (Mines)',win32:'Win32 (Win32 Lab)',
  accessibility:'Bedienhilfen (Accessibility Tools)',clipboard:'Zwischenablage (Clipboard History)',
  focus:'Fokus (Focus Sessions)',widgets:'Übersicht (Widget Board)',workspaces:'Fenstergruppen (Window Groups)',
  history:'Dateiverlauf (File History)',storage:'Speicher (Storage Manager)',archives:'Archive (ZIP Archives)',
  recorder:'Aufnahme (Screen Recorder)'
 };
 const vendorNames={
  'custom-luna-gespraech':'Team (Veyra Workspace)',
  'custom-luna-rechenblatt':'Kalkulation (AxiomWorksheet)',
  'custom-luna-modell':'3D (Avolith Studio)'
 };
 const desktopPins=[
  'files','custom-luna-dateien','custom-luna-tabelle','custom-luna-office','custom-luna-mail',
  'custom-luna-akte','custom-luna-pdf','custom-luna-text','notepad','calculator','custom-luna-signatur',
  'custom-luna-planung','calendar','custom-luna-gespraech','custom-luna-aufmass','custom-luna-auswertung',
  'custom-luna-rechenblatt','custom-luna-zeichnung','custom-luna-cad','custom-luna-korpus','custom-luna-material',
  'custom-luna-modell','custom-luna-tafel','browser','store','code','terminal','taskmanager','win32','settings'
 ];
 const startPins=[
  'files','custom-luna-dateien','custom-luna-tabelle','custom-luna-office','custom-luna-mail',
  'custom-luna-akte','custom-luna-pdf','custom-luna-text','custom-luna-signatur','calculator',
  'custom-luna-planung','calendar','custom-luna-gespraech','custom-luna-aufmass','custom-luna-auswertung',
  'custom-luna-rechenblatt','custom-luna-zeichnung','custom-luna-cad','custom-luna-korpus',
  'custom-luna-material','custom-luna-modell','custom-luna-tafel','browser','store'
 ];
 const taskbarPins=['files','custom-luna-tabelle','custom-luna-planung','custom-luna-korpus','browser','store'];
 const groups=[
  ['Büro',['files','custom-luna-dateien','custom-luna-tabelle','custom-luna-office','custom-luna-mail','custom-luna-akte','custom-luna-pdf','custom-luna-text','custom-luna-signatur','calculator']],
  ['Projekt',['custom-luna-planung','calendar','custom-luna-gespraech','custom-luna-aufmass','custom-luna-auswertung','custom-luna-rechenblatt']],
  ['Werkstatt',['custom-luna-zeichnung','custom-luna-cad','custom-luna-korpus','custom-luna-material','custom-luna-modell','custom-luna-tafel']],
  ['IT & Service',['browser','store']]
 ];
 function applyNames(){
  for(const [id,title] of Object.entries(builtinNames)){
   const app=OS.apps.get(id);if(!app)continue;
   if(!app.lunaOriginalTitle)app.lunaOriginalTitle=app.title;
   app.title=title;
  }
  for(const [id,title] of Object.entries(vendorNames)){
   const app=OS.apps.get(id);if(app)app.title=title;
  }
 }
 function modernTheme(theme){
  const t=structuredClone(theme);
  Object.assign(t,{id:'luna-korpus',title:'Luna',profile:'windows',shellMode:'dark',appMode:'light',accent:'#169fe6',selection:'#169fe6',autoAccent:false,accentOnShell:false,accentOnTitle:true,transparency:true,motion:true,glass:'tinted',iconFamily:'windows',font:'system',fontSize:13,titleHeight:38,borderWidth:1,radius:12,scrollbarWidth:10});
  t.optics={...(t.optics||{}),quality:'high',bend:46,dispersion:4,magnify:true};
  t.taskbar={...(t.taskbar||{}),position:'bottom',align:'center',size:42,autoHide:false,showSearch:true,showTaskView:true,showWidgets:false};
  t.background={type:'color',builtin:'midnight',color:'#07131d',fit:'fill',images:[],interval:60000,shuffle:false};
  t.colors={...(t.colors||{}),Window:'#f3f6f9',WindowText:'#1a1a1a',ButtonFace:'#edf2f6',GrayText:'#667784',ActiveTitle:'#0b4567',TitleText:'#ffffff',InactiveTitle:'#dfe7ec',InactiveTitleText:'#526674',Hilight:'#169fe6',HilightText:'#ffffff'};
  return t;
 }
 function lunaActive(){const t=OS.themes?.current;return !!t&&(t.id==='luna-korpus'||/^Luna$/i.test(t.title));}
 function markTheme(){document.body.dataset.luna=String(lunaActive());}
 function labelParts(label){const m=String(label||'').match(/^(.*?)\s+\((.+)\)$/);return m?[m[1],m[2]]:[String(label||''),''];}
 function decorateDesktop(){
  const container=document.getElementById('desktop-icons');if(!container)return;
  for(const button of container.querySelectorAll('.desktop-icon')){
   const entry=button._entry,label=entry?.shortcut?.title||entry?.title||button.getAttribute('aria-label')||'';
   const span=button.querySelector(':scope > span:last-child');if(!span||span.dataset.lunaLabel==='true')continue;
   const [primary,secondary]=labelParts(label);span.dataset.lunaLabel='true';span.classList.add('luna-desktop-label');
   span.replaceChildren(OS.el('strong',{text:primary}),...(secondary?[OS.el('small',{text:'('+secondary+')'})]:[]));
  }
 }
 function decorateStart(){
  const grid=document.querySelector('.start-menu .pinned-grid');if(!grid||grid.dataset.lunaGrouped==='true')return;
  const buttons=new Map([...grid.querySelectorAll('[data-start-app]')].map(node=>[node.dataset.startApp,node]));if(!buttons.size)return;
  grid.dataset.lunaGrouped='true';grid.replaceChildren();
  for(const [title,ids] of groups){
   const members=ids.map(id=>buttons.get(id)).filter(Boolean);if(!members.length)continue;
   grid.append(OS.el('h3',{class:'luna-start-group-title',text:title}),...members);
  }
  for(const button of buttons.values())if(!grid.contains(button))grid.append(button);
 }
 function taskbarBrand(){
  const left=document.querySelector('#taskbar .task-left');if(left&&!left.querySelector('.luna-product-word'))left.append(OS.el('strong',{class:'luna-product-word',text:'LUNA'}));
  const start=document.getElementById('start-button');if(start){start.title='Luna Start';start.setAttribute('aria-label','Luna Start');}
 }
 function refresh(){markTheme();decorateDesktop();decorateStart();taskbarBrand();}
 const originalInit=OS.init;
 OS.init=async()=>{
  await originalInit();applyNames();
  const migrate=!(await OS.db.get('luna-workspace-v2'));
  if(migrate){
   await OS.db.set('luna-layout-backup-v2',{desktop:await OS.db.get('desktopShortcuts'),start:await OS.db.get('startPins'),taskbar:await OS.db.get('taskbarPins')});
   const visible=id=>OS.apps.has(id)&&!OS.apps.get(id).hidden;
   const desktop=desktopPins.filter(visible).map(app=>({app,title:vendorNames[app]||builtinNames[app]||OS.apps.get(app).title}));
   const start=startPins.filter(visible),taskbar=taskbarPins.filter(visible);
   await OS.db.set('desktopShortcuts',desktop);await OS.db.set('startPins',start);await OS.db.set('taskbarPins',taskbar);
   if(OS.startPins)OS.startPins=[...start];
   Object.assign(OS.settings,{username:'EDV Hausleitner',webAppTitleBars:true,webAppToolbars:false});await OS.db.set('settings',OS.settings);
   await OS.themes.select('luna-korpus');await OS.themes.install(modernTheme(OS.themes.current));
   await OS.db.set('welcomed',true);await OS.db.set('luna-workspace-v2',{version:2,desktop:desktop.length,start:start.length});
  }else if(OS.themes?.current?.id==='luna-korpus'&&OS.themes.current.title!=='Luna'){
   await OS.themes.install(modernTheme(OS.themes.current));
  }
  applyNames();
  OS.luna={...(OS.luna||{}),version:2,product:'Luna',desktopPins:[...desktopPins],startPins:[...startPins],groups:groups.map(([title,ids])=>({title,ids:[...ids]}))};
  OS.emit('apps');queueMicrotask(refresh);
 };
 OS.on('theme-change',()=>queueMicrotask(refresh));OS.on('desktop-rendered',()=>queueMicrotask(decorateDesktop));OS.on('windows',()=>queueMicrotask(taskbarBrand));
 const observe=()=>{const layer=document.getElementById('panel-layer');if(layer)new MutationObserver(()=>requestAnimationFrame(decorateStart)).observe(layer,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();

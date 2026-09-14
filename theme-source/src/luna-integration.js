/* Luna: premium EDV Hausleitner branding, launcher metadata, workspace seed and reviewed local HTML.
 * Aster remains the desktop/runtime. Vendored applications remain byte-verified originals.
 * Arbitrary imported HTML retains Aster's opaque sandbox. Only byte-verified bundled
 * catalog entries use Aster's existing reviewed-app host. This is not an isolation boundary.
 */
'use strict';
(() => {
 const OS=Aster, entries=window.LUNA_VENDORS, byID=new Map(entries.map(e=>['custom-luna-'+e.id,e]));
 const builtins={
   files:['Explorer','File Explorer'],notepad:['Notizen','Notepad'],browser:['Browser','Orbit Browser'],
   terminal:['Konsole','Terminal'],paint:['Farbe','Paint'],photos:['Fotos','Photos'],media:['Medien','Media Player'],
   code:['Code','Code Studio'],snips:['Ausschnitt','Snips'],calculator:['Rechner','Calculator'],
   calendar:['Kalender','Calendar'],clock:['Uhr','Clock'],tasks:['Aufgaben','Tasks'],settings:['Einstellungen','Settings'],
   taskmanager:['System','Task Manager'],store:['Programme','App Center'],welcome:['Über Luna','About'],
   mines:['Minen','Mines'],win32:['Win32','Win32 Lab'],recorder:['Aufnahme','Screen Recorder'],
   accessibility:['Bedienhilfen','Accessibility Tools'],clipboard:['Zwischenablage','Clipboard History'],
   'clipboard-tools':['Kopieren','Clipboard Utilities'],focus:['Fokus','Focus Sessions'],widgets:['Übersicht','Widget Board'],
   workspaces:['Fenstergruppen','Window Groups'],history:['Dateiverlauf','File History'],storage:['Speicher','Storage Manager'],
   archives:['Archive','ZIP Archives']
 };
 const vendorLabels={
   'custom-luna-gespraech':'Team (Veyra Workspace)',
   'custom-luna-rechenblatt':'Kalkulation (AxiomWorksheet)',
   'custom-luna-modell':'3D (Avolith Studio)'
 };
 const names=new Map();
 for(const [id,a] of OS.apps){
   if(a.webApp)names.set(id,a.title);
   else if(!a.custom){const pair=builtins[id]||[a.title,a.title];names.set(id,pair[0]+' ('+pair[1]+')');}
 }
 for(const [id,e] of byID)names.set(id,vendorLabels[id]||e.title);

 const modernTheme=t=>{
   if(!t)return t;
   t.title='Luna';
   t.accent='#169fe6';t.selection='#169fe6';
   t.accentOnTitle=true;t.accentOnShell=false;
   t.shellMode='dark';t.appMode='light';t.titleHeight=38;t.radius=12;
   t.taskbar={...(t.taskbar||{}),position:'bottom',align:'center',size:42,autoHide:false,showSearch:true,showTaskView:true,showWidgets:false};
   return t;
 };
 if(window.LUNA_THEME)modernTheme(window.LUNA_THEME);
 const lunaPreset=globalThis.AsterThemeModels?.PRESETS?.find(t=>t.id==='luna-korpus');
 if(lunaPreset)modernTheme(lunaPreset);

 function rename(){
   for(const [id,title]of names){
     const app=OS.apps.get(id);
     if(app){app.title=title;app.keywords=((app.keywords||'')+' '+title).trim();}
   }
 }
 OS.lunaTitle=(id,title)=>{
   const label=names.get(id);
   if(!label||String(title).includes(label))return title;
   const original=builtins[id]?.[1];
   if(OS.apps.get(id)?.webApp||byID.has(id)||String(title)===original||String(title)===OS.apps.get(id)?.title)return label;
   return String(title)+' — '+label;
 };
 rename();

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

 const root=new URL(location.pathname.includes('/theme-source/')?'../':'./',location.href);
 const urls=new Map();
 OS.lunaVendorURL=repo=>urls.get(repo);
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
 const originalRegister=OS.registerCustom;
 OS.registerCustom=value=>{
   const result=originalRegister(value),e=byID.get(value.id);
   if(!e)return result;
   const app=OS.apps.get(value.id),standardMount=app.mount;
   Object.assign(app,{width:1180,height:760,minWidth:370,minHeight:280});
   app.mount=async w=>{
     const record=OS.appLibrary.get(value.id),file=record&&await OS.fs.read(record.path),source=file&&await OS.fs.text(file);
     if(!record||await digest(source)!==e.sha256)return standardMount(w);
     w.installedRevision=record.revision;w.installedSource=record.path;
     const original=OS.webCatalog.apps.find(a=>a.repo===e.repo);
     return OS.mountReviewedCatalogApp(w,{...original,id:record.id,title:record.title});
   };
   return result;
 };

 const originalInit=OS.init;
 OS.init=async()=>{
   await originalInit();

   if(OS.themes?.current&&(OS.themes.current.id==='luna-korpus'||/^Luna\b/i.test(OS.themes.current.title))){
     await OS.themes.install(modernTheme(structuredClone(OS.themes.current)));
   }

   if(!await OS.fs.stat('/Apps'))await OS.fs.mkdir('/Apps');
   for(const e of entries){
     if(await digest(e.html)!==e.sha256)throw Error('Originaldatei nicht verifiziert: '+e.repo);
     if(e.runtime_base)urls.set(e.repo,new URL(e.runtime_base+'index.html',root).href);
     else urls.set(e.repo,URL.createObjectURL(new Blob([e.html],{type:'text/html;charset=utf-8'})));
     const id='custom-luna-'+e.id,path='/'+e.path;
     if(!await OS.fs.stat(path))await OS.fs.write(path,e.html,'text/html');
     const old=OS.appLibrary.get(id),catalog=OS.webCatalog.apps.find(a=>a.repo===e.repo);
     if(!catalog)throw Error('Katalogeintrag fehlt: '+e.repo);
     if(!old)await OS.appLibrary.save({
       id,kind:'html',title:names.get(id)||e.title,path,
       description:'Original '+e.original+' · '+e.source_kind+' · '+e.commit.slice(0,12),
       category:OS.apps.get(catalog.id).category,icon:OS.apps.get(catalog.id).icon,color:OS.apps.get(catalog.id).color,
       publisher:'wieslawsoltes',version:e.commit.slice(0,12),favorite:true
     });
     else OS.registerCustom({...old,title:names.get(id)||old.title});
   }
   rename();

   const workspace=await OS.db.get('luna-original-workspace-v2');
   if(!workspace){
     await OS.db.set('luna-original-layout-backup-v2',{
       desktop:await OS.db.get('desktopShortcuts'),
       start:await OS.db.get('startPins'),
       taskbar:await OS.db.get('taskbarPins')
     });
     const visible=id=>OS.apps.has(id)&&!OS.apps.get(id).hidden;
     const desktop=desktopPins.filter(visible).map(app=>({app,title:names.get(app)||OS.apps.get(app).title}));
     const start=startPins.filter(visible),taskbar=taskbarPins.filter(visible);
     await OS.db.set('desktopShortcuts',desktop);
     await OS.db.set('taskbarPins',taskbar);
     await OS.db.set('startPins',start);
     if(OS.startPins)OS.startPins=[...start];
     OS.settings.username='EDV Hausleitner';
     OS.settings.webAppTitleBars=true;OS.settings.webAppToolbars=false;
     await OS.db.set('settings',OS.settings);
     await OS.themes.select('luna-korpus');
     if(OS.themes.current.title!=='Luna')await OS.themes.install(modernTheme(structuredClone(OS.themes.current)));
     await OS.db.set('welcomed',true);
     await OS.db.set('luna-original-workspace-v2',{version:2,apps:entries.length,desktop:desktop.length});
   }

   OS.luna={
     version:2,product:'Luna',originals:entries.map(({html,...e})=>e),verified:entries.length,
     source:'wieslawsoltes/Aster',storageNamespace:'Aster IndexedDB workspace',
     desktopPins:[...desktopPins],startPins:[...startPins],groups:groups.map(([title,ids])=>({title,ids:[...ids]}))
   };
   styleState();
   queueMicrotask(refreshBranding);
 };

 function styleState(){
   const t=OS.themes.current;
   document.body.classList.toggle('luna-active',t.id==='luna-korpus'||/^Luna\b/i.test(t.title));
 }

 const labelParts=label=>{
   const m=String(label||'').match(/^(.*?)\s+\((.+)\)$/);
   return m?[m[1],m[2]]:[String(label||''),''];
 };
 function decorateDesktop(){
   const container=document.getElementById('desktop-icons');
   if(!container)return;
   for(const button of container.querySelectorAll('.desktop-icon')){
     const entry=button._entry;
     const label=entry?.shortcut?.title||entry?.title||button.getAttribute('aria-label')||'';
     const span=button.querySelector(':scope > span:last-child');
     if(!span||span.dataset.lunaLabel==='true')continue;
     const [primary,secondary]=labelParts(label);
     span.dataset.lunaLabel='true';
     span.classList.add('luna-desktop-label');
     span.replaceChildren(OS.el('strong',{text:primary}),...(secondary?[OS.el('small',{text:'('+secondary+')'})]:[]));
   }
 }
 function ensureBrand(){
   const desktop=document.getElementById('desktop');
   if(!desktop)return;
   if(!document.getElementById('luna-desktop-brand')){
     const mark=OS.el('span',{class:'luna-brand-mark','aria-hidden':'true'});
     const copy=OS.el('span',{class:'luna-brand-copy'},
       OS.el('strong',{text:'LUNA'}),OS.el('small',{text:'EDV HAUSLEITNER'}),
       OS.el('em',{text:'Planung · Konstruktion · Produktion · Service'}));
     desktop.append(OS.el('aside',{id:'luna-desktop-brand','aria-label':'Luna · EDV Hausleitner'},mark,copy));
   }
   if(!document.getElementById('luna-disclaimer')){
     desktop.append(OS.el('div',{id:'luna-disclaimer',text:'LUNA · Aster-Arbeitsplatz · Theme-Demo · kein Ersatz der lizenzierten WAWI · EDV Hausleitner GmbH Linz'}));
   }
 }
 function labelTaskbar(){
   const left=document.querySelector('#taskbar .task-left');
   if(left){
     let word=left.querySelector('.luna-product-word');
     if(!word){word=OS.el('strong',{class:'luna-product-word',text:'LUNA'});left.append(word);}
     word.textContent='LUNA';
   }
   const start=document.getElementById('start-button');
   if(start){start.setAttribute('aria-label','Luna Start');start.title='Luna Start';}
 }
 function decorateStart(){
   const grid=document.querySelector('.start-menu .pinned-grid');
   if(!grid||grid.dataset.lunaGrouped==='true')return;
   const buttons=new Map([...grid.querySelectorAll('[data-start-app]')].map(node=>[node.dataset.startApp,node]));
   if(!buttons.size)return;
   grid.dataset.lunaGrouped='true';
   grid.replaceChildren();
   for(const [title,ids]of groups){
     const members=ids.map(id=>buttons.get(id)).filter(Boolean);
     if(!members.length)continue;
     grid.append(OS.el('h3',{class:'luna-start-group-title',text:title}));
     for(const button of members)grid.append(button);
   }
   for(const button of buttons.values())if(!grid.contains(button))grid.append(button);
 }
 function refreshBranding(){styleState();labelTaskbar();decorateDesktop();decorateStart();ensureBrand();}

 OS.on('theme-change',()=>queueMicrotask(refreshBranding));
 OS.on('windows',()=>queueMicrotask(labelTaskbar));
 OS.on('desktop-rendered',()=>queueMicrotask(()=>{decorateDesktop();ensureBrand();}));
 OS.on('apps',()=>queueMicrotask(labelTaskbar));
 const observePanels=()=>{
   const layer=document.getElementById('panel-layer');
   if(!layer)return;
   new MutationObserver(()=>requestAnimationFrame(decorateStart)).observe(layer,{childList:true,subtree:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observePanels,{once:true});else observePanels();
 window.addEventListener('pagehide',()=>{for(const url of urls.values())URL.revokeObjectURL(url);});
})();

/* Luna: launcher metadata, first-boot workspace seed and reviewed local HTML.
 * The desktop, windows, Explorer, Calendar, App Center and every app engine are Aster/upstream.
 * Arbitrary imported HTML retains Aster's opaque sandbox. Only byte-verified bundled
 * catalog entries use Aster's existing reviewed-app host. This is not an isolation boundary.
 */
'use strict';
(() => {
 const OS=Aster, entries=window.LUNA_VENDORS, byID=new Map(entries.map(e=>['custom-luna-'+e.id,e]));
 const builtins={files:['Explorer','File Explorer'],notepad:['Notizen','Notepad'],browser:['Browser','Orbit Browser'],terminal:['Eingabe','Terminal'],paint:['Farbe','Paint'],photos:['Fotos','Photos'],media:['Medien','Media Player'],code:['Code','Code Studio'],snips:['Ausschnitt','Snips'],calculator:['Rechner','Calculator'],calendar:['Kalender','Calendar'],clock:['Uhr','Clock'],tasks:['Aufgaben','Tasks'],settings:['Einstellungen','Settings'],taskmanager:['Prozesse','Task Manager'],store:['App Store','App Center'],welcome:['Willkommen','Welcome'],mines:['Minen','Mines'],win32:['Win32','Win32 Lab'],recorder:['Aufnahme','Screen Recorder'],accessibility:['Bedienhilfen','Accessibility Tools'],clipboard:['Zwischenablage','Clipboard History'],'clipboard-tools':['Kopieren','Clipboard Utilities'],focus:['Fokus','Focus Sessions'],widgets:['Übersicht','Widget Board'],workspaces:['Fenstergruppen','Window Groups'],history:['Dateiverlauf','File History'],storage:['Speicher','Storage Manager'],archives:['Archive','ZIP Archives']};
 const names=new Map();
 for(const [id,a] of OS.apps){if(a.webApp)names.set(id,a.title);else if(!a.custom){const pair=builtins[id]||[a.title,a.title];names.set(id,pair[0]+' ('+pair[1]+')');}}
 for(const [id,e] of byID)names.set(id,e.title);
 function rename(){for(const [id,title]of names){const app=OS.apps.get(id);if(app){app.title=title;app.keywords=(app.keywords||'')+' '+title;}}}
 OS.lunaTitle=(id,title)=>{const label=names.get(id);if(!label||String(title).includes(label))return title;const original=builtins[id]?.[1];if(OS.apps.get(id)?.webApp||byID.has(id)||String(title)===original||String(title)===OS.apps.get(id)?.title)return label;return String(title)+' — '+label;};
 rename();
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
     // A replaced or edited package is not silently promoted to a trusted frame.
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
   const previous=await OS.db.get('luna-original-workspace-v1');
   if(!await OS.fs.stat('/Apps'))await OS.fs.mkdir('/Apps');
   for(const e of entries){
     if(await digest(e.html)!==e.sha256)throw Error('Originaldatei nicht verifiziert: '+e.repo);
     // Multi-file upstream apps keep a real, local HTTP URL (important for URL(), workers and service workers).
     // Their original entry HTML is unchanged both in /Apps and in the runtime directory.
     if(e.runtime_base)urls.set(e.repo,new URL(e.runtime_base+'index.html',root).href);
     else urls.set(e.repo,URL.createObjectURL(new Blob([e.html],{type:'text/html;charset=utf-8'})));
     const id='custom-luna-'+e.id,path='/'+e.path;
     if(!await OS.fs.stat(path))await OS.fs.write(path,e.html,'text/html');
     const old=OS.appLibrary.get(id),catalog=OS.webCatalog.apps.find(a=>a.repo===e.repo);
     if(!catalog)throw Error('Katalogeintrag fehlt: '+e.repo);
     if(!old)await OS.appLibrary.save({id,kind:'html',title:e.title,path,description:'Original '+e.original+' · '+e.source_kind+' · '+e.commit.slice(0,12),category:OS.apps.get(catalog.id).category,icon:OS.apps.get(catalog.id).icon,color:OS.apps.get(catalog.id).color,publisher:'wieslawsoltes',version:e.commit.slice(0,12),favorite:true});
     else OS.registerCustom(old);
   }
   rename();
   if(!previous){
     const pins=['files','custom-luna-dateien','custom-luna-tabelle','custom-luna-planung','calendar','custom-luna-mail','custom-luna-akte','custom-luna-zeichnung','custom-luna-cad','custom-luna-korpus','custom-luna-material','custom-luna-aufmass','settings'];
     await OS.db.set('desktopShortcuts',pins.map(app=>({app,title:names.get(app)})));
     await OS.db.set('taskbarPins',['files','custom-luna-tabelle','custom-luna-korpus','store']);
     await OS.db.set('startPins',[...pins,'store']);
     // initDesktopServices has already loaded these real Aster services.
     OS.startPins=[...pins,'store'];
     OS.settings.username='EDV Hausleitner';
     OS.settings.webAppTitleBars=true;OS.settings.webAppToolbars=false;
     await OS.db.set('settings',OS.settings);
     await OS.themes.select('luna-korpus');
     await OS.db.set('welcomed',true);
     await OS.db.set('luna-original-workspace-v1',{version:1,apps:entries.length});
   }
   OS.luna={version:1,originals:entries.map(({html,...e})=>e),verified:entries.length,source:'wieslawsoltes/Aster',storageNamespace:'Aster IndexedDB workspace'};
   styleState();
 };
 function styleState(){const t=OS.themes.current;document.body.classList.toggle('luna-active',t.id==='luna-korpus'||/^Luna\b/i.test(t.title));}
 function labelTaskbar(){
   const left=document.querySelector('#taskbar .task-left');
   if(left&&!left.querySelector('.luna-product-word')){
     const word=OS.el('strong',{class:'luna-product-word',text:'LUNA'});left.append(word);
   }
   const start=document.getElementById('start-button');if(start){start.setAttribute('aria-label','Start (Start)');start.title='Start (Start)';}
 }
 OS.on('theme-change',()=>{styleState();queueMicrotask(labelTaskbar);});
 OS.on('windows',()=>queueMicrotask(labelTaskbar));
 OS.on('desktop-rendered',()=>queueMicrotask(labelTaskbar));
 OS.on('apps',()=>queueMicrotask(labelTaskbar));
 window.addEventListener('pagehide',()=>{for(const url of urls.values())URL.revokeObjectURL(url);});
})();

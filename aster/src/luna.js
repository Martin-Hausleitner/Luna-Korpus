/* Luna: original-app packaging and metadata for the existing Aster desktop. MIT.
 * No desktop, window manager, file manager or business application is implemented here.
 * Only SHA-256-verified vendor files receive the published-app storage context.
 * Ordinary user-installed HTML keeps Aster's original opaque sandbox unchanged.
 */
'use strict';
(() => {
 const OS=Aster, manifest=LUNA_MANIFEST, byId=new Map(manifest.map(x=>[x.installedId,x]));
 const bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 const text=b64=>new TextDecoder().decode(bytes(b64));
 let packed;
 async function packages(){return packed ||= new Response(new Blob([bytes(LUNA_PACK_GZIP)]).stream().pipeThrough(new DecompressionStream('gzip'))).json();}
 async function hash(source){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 // This generic resource transport preserves original modules. It replaces only
 // addresses for packaged files, never their application state or functionality.
 function resourceRuntime(config){
  const root=config.root, assets=config.assets, bundles=config.bundles||{}, originalFetch=globalThis.fetch.bind(globalThis), NativeWorker=globalThis.Worker, objectURLs=new Map();
  // about:srcdoc has no hierarchical path. Original static apps that scope
  // their local storage with new URL('.', location.href) need their packaged
  // directory as the base. Their source and storage implementation are unchanged.
  const NativeURL=globalThis.URL;
  globalThis.URL=class extends NativeURL {
   constructor(value,base){if(typeof base==='string'&&(/^(about:srcdoc|about:blank|blob:)/.test(base)||base==='null'))base=root;super(value,base);}
  };
  const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const key=(value,base=root)=>{try{const u=new URL(typeof value==='string'?value:value.url||String(value),base);if(!u.href.startsWith(root))return null;return decodeURIComponent(u.pathname.slice(new URL(root).pathname.length));}catch{return null;}};
  const assetURL=relative=>{const a=assets[relative];if(!a)return null;if(!objectURLs.has(relative))objectURLs.set(relative,URL.createObjectURL(new Blob([decode(a.data)],{type:a.mime})));return objectURLs.get(relative);};
  const boot=()=> '('+resourceRuntime.toString()+')('+JSON.stringify(config)+');\n';
  const moduleURL=relative=>{const k='module:'+relative;if(objectURLs.has(k))return objectURLs.get(k);const code=bundles[relative];if(code==null)return assetURL(relative);const u=URL.createObjectURL(new Blob([boot()+code],{type:'text/javascript'}));objectURLs.set(k,u);return u;};
  globalThis.__LUNA_IMPORT_FROM__=(base,spec)=>{const relative=key(spec,base);return import(relative&&(bundles[relative]||assets[relative])?moduleURL(relative):new URL(spec,base).href);};
  globalThis.fetch=async (input,init)=>{const relative=key(input);if(relative&&assets[relative]&&(!init?.method||init.method==='GET')){const a=assets[relative];return new Response(decode(a.data),{status:200,headers:{'Content-Type':a.mime,'Content-Length':String(decode(a.data).length)}});}return originalFetch(input,init);};
  if(NativeWorker)globalThis.Worker=class extends NativeWorker {constructor(url,options){const relative=key(url);super(relative&&(bundles[relative]||assets[relative])?moduleURL(relative):url,options);}};
  globalThis.__LUNA_ASSET_URL__=(value,base=root)=>{const relative=key(value,base);return relative?assetURL(relative)||value:value;};
  globalThis.addEventListener?.('pagehide',()=>{for(const u of objectURLs.values())URL.revokeObjectURL(u);objectURLs.clear();},{once:true});
 }
 function prepareModular(source,entry,pack){
  const doc=new DOMParser().parseFromString(source,'text/html'),root='https://luna-assets.invalid/'+entry.id+'/', assets=pack.assets, cfg={root,assets,bundles:pack.bundles};
  const relative=(value,base=root)=>{try{const u=new URL(value,base);return u.href.startsWith(root)?decodeURIComponent(u.pathname.slice(new URL(root).pathname.length)):null;}catch{return null;}};
  const dataURL=(value,base=root)=>{const k=relative(value,base),a=k&&assets[k];return a?'data:'+a.mime+';base64,'+a.data:value;};
  const safe=code=>code.replace(/<\/script/gi,'<\\/script');
  const boot=doc.createElement('script');boot.textContent='('+resourceRuntime.toString()+')('+JSON.stringify(cfg)+');';doc.head.prepend(boot);
  for(const link of [...doc.querySelectorAll('link[href]')]){
   const href=link.getAttribute('href'),k=relative(href),a=k&&assets[k];
   if(link.rel==='stylesheet'&&a){const style=doc.createElement('style');style.textContent=text(a.data).replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(m,q,u)=>'url("'+dataURL(u,new URL(k,root).href)+'")');link.replaceWith(style);}
   else if(a)link.href=dataURL(href);
  }
  for(const script of [...doc.querySelectorAll('script[src]')]){
   const k=relative(script.getAttribute('src')),a=k&&assets[k];if(!a)continue;
   const code=script.type==='module'?(pack.bundles[k]||text(a.data)):text(a.data);
   script.removeAttribute('src');script.textContent=code;
  }
  for(const node of doc.querySelectorAll('img[src],source[src],video[src],audio[src]'))node.setAttribute('src',dataURL(node.getAttribute('src')));
  // Prevent a packaged service worker from registering at the desktop origin.
  // Offline assets are in this document; no worker can intercept another app.
  const sw=doc.createElement('script');sw.textContent='try {delete navigator.serviceWorker;delete Object.getPrototypeOf(navigator).serviceWorker;}catch{}';doc.head.prepend(sw);
  let html='<!doctype html>\n'+doc.documentElement.outerHTML;
  // DOM serialization does not escape a literal closing tag inside a JS string.
  for(const script of [...doc.querySelectorAll('script')]){const old=script.outerHTML;const newer=old.replace(script.textContent,()=>safe(script.textContent));html=html.replace(old,()=>newer);}
  return html;
 }
 OS.lunaPrepareHTML=async (source,record)=>{
  const entry=byId.get(record.id);
  if(!entry||record.path!=='/'+entry.localPath||await hash(source)!==entry.sha256)return {html:source,trusted:false};
  const pack=(await packages())[entry.id];
  return {html:entry.assetRoot?prepareModular(source,entry,pack):source,trusted:true,sha256:entry.sha256};
 };
 const names=LUNA_BUILTIN_NAMES;
 OS.lunaWindowTitle=(id,title)=>{
  const app=OS.apps.get(id),label=app?.title;if(!label||!title||title.includes(label))return title;
  const original=app.lunaOriginalTitle;
  if(original&&title.includes(original))return title.replace(original,label);
  if(byId.has(id)||id.startsWith('web-'))return label;
  return title+' — '+label;
 };
 function rename(){
  for(const app of OS.apps.values()){
   if(app.custom||app.webApp)continue;
   if(!app.lunaOriginalTitle)app.lunaOriginalTitle=app.title;
   app.title=names[app.id]||app.lunaOriginalTitle+' ('+app.id+')';
  }
 }
 function markTheme(){const current=OS.themes?.current;document.body.dataset.luna=String(current?.id==='luna-korpus'||current?.title==='Luna Korpus');}
 const init=OS.init;
 OS.init=async()=>{
  await init();rename();
  const data=await packages(), first=!await OS.db.get('luna-originals-installed-v1');
  if(!await OS.fs.stat('/Apps'))await OS.db.batch([{path:'/Apps',kind:'directory',modified:Date.now()}]);
  for(const item of manifest){
   const source=text(data[item.id].html),path='/'+item.localPath;
   if(!await OS.fs.stat(path))await OS.fs.write(path,source,'text/html');
   if(!OS.appLibrary.get(item.installedId)){
    const catalog=OS.webCatalog.apps.find(a=>a.repo===item.repo),app=OS.apps.get(catalog?.id);
    await OS.appLibrary.save({id:item.installedId,kind:'html',title:item.title,path,description:(item.repo==='Quire'?'Original Quire document editor. The requested Mail label does not add email features. ':app?.description||'Original upstream application. ')+'Vendored '+item.repo+' · '+item.commit.slice(0,12),category:app?.category||'Your apps',icon:app?.icon||'code',color:app?.color||'blue',publisher:'wieslawsoltes',version:item.commit.slice(0,12),favorite:false});
   }
   const custom=OS.apps.get(item.installedId);custom.width=1240;custom.height=790;
   const catalogApp=OS.apps.get('web-'+item.repo.toLowerCase());
   if(catalogApp){catalogApp.mount=(w,options)=>OS.apps.get(item.installedId).mount(w,options);catalogApp.localPackage=path;}
  }
  const pinIds=['files','custom-luna-dateien','custom-luna-tabelle','custom-luna-planung','calendar','custom-luna-mail','custom-luna-akte','custom-luna-zeichnung','custom-luna-cad','custom-luna-korpus','custom-luna-material','custom-luna-aufmass','settings'];
  if(first){
   await OS.db.set('desktopShortcuts',pinIds.map(app=>({app,title:OS.apps.get(app).title})));
   await OS.db.set('startPins',[...pinIds,'store']);
   await OS.db.set('taskbarPins',['files','custom-luna-tabelle','custom-luna-korpus','calendar','store']);
   Object.assign(OS.settings,{username:'EDV Hausleitner',webAppTitleBars:true,webAppToolbars:false});
   await OS.db.set('settings',OS.settings);await OS.db.set('welcomed',true);
   await OS.themes.select('luna-korpus');
   await OS.fs.write('/Documents/Luna — Herkunft und Grenzen.txt','LUNA KORPUS\nHolztechnik · Korpus · Stückliste\n\nSkin + German labels for Aster.\nBuilt on Aster. Unofficial. Not licensed WAWI.\nNo replacement desktop and no rewritten applications.\n\nQuire is a document editor, not an email client.\nFolio and Velsign have no app-wide license notice in the reviewed upstream checkouts. No blanket MIT claim is made for those two apps.\n'+manifest.map(x=>x.title+'\n'+x.upstream+'\n/'+x.localPath+'\nSHA-256 '+x.sha256).join('\n\n'),'text/plain');
   await OS.db.set('luna-originals-installed-v1',true);
  }
  rename();markTheme();OS.on('theme-change',markTheme);
  OS.luna={version:1,asterCommit:LUNA_ASTER_COMMIT,manifest,ready:true,hash,packages,upstreamOnly:true};
  OS.emit('apps');
 };
})();

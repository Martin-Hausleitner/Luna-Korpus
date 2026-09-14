import {WorkspaceSync} from './sync.js';
import {seedWorkspace} from './seed.js';
import {uid} from './core.js';
import {validateImport} from './validation.js';

/** Device-local transport for static hosting. It does not impersonate a remote service. */
export class LocalWorkspaceSync extends WorkspaceSync {
 constructor(onStatus=()=>{}){super(onStatus);this.local=true;this.assetURLs=new Map();this.user={id:'local-user',name:'You',email:'Stored in this browser',role:'owner'};}
 async open(){
  this.workspace='local';const scope=new URL('.',location.href).pathname;
  this.db=await new Promise((resolve,reject)=>{const request=indexedDB.open('folio-pages:'+scope,1);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('operations',{keyPath:'id'});db.createObjectStore('outbox',{keyPath:'id'});db.createObjectStore('meta');for(const store of ['comments','history','assets'])db.createObjectStore(store,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await this.tx(['operations','meta'],tx=>{const meta=tx.objectStore('meta'),request=meta.get('initialized');request.onsuccess=()=>{if(!request.result){for(const op of seedWorkspace())tx.objectStore('operations').put(op);meta.put(true,'initialized');meta.put('My workspace','name');}}});
  const [operations,name,outbox]=await Promise.all([this.readStore('operations'),this.readStore('meta','name'),this.readStore('outbox')]);
  validateImport(operations);this.replica.import(operations);for(const op of outbox)this.pending.set(op.id,op);
  this.session={workspace:{id:this.workspace,name:name||'My workspace',owner:this.user.id},user:this.user,workspaces:[{id:this.workspace,name:name||'My workspace',role:'owner'}]};
  await this.loadAssets();
  if(typeof BroadcastChannel!=='undefined'){this.channel=new BroadcastChannel('folio-pages:'+scope);this.channel.onmessage=async event=>{try{if(event.data?.type==='operations'){validateImport(event.data.operations);this.replica.import(event.data.operations)}else if(event.data?.type==='assets'){await this.loadAssets();this.replica.listeners.forEach(fn=>fn([{kind:'set'}],false));}}catch(e){this.onStatus('Could not refresh another tab: '+e.message)}};}
  this.ready=true;await this.pull();this.onStatus('Saved on this device');await this.flush();window.addEventListener('focus',()=>this.pull().catch(e=>this.onStatus(e.message)));return this.session;
 }
 readStore(store,key){return new Promise((resolve,reject)=>{const tx=this.db.transaction(store,'readonly'),request=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);tx.oncomplete=()=>resolve(request.result);tx.onabort=tx.onerror=()=>reject(tx.error||request.error);});}
 async put(store,value){await this.tx([store],tx=>tx.objectStore(store).put(value));}
 async remove(store,id){await this.tx([store],tx=>tx.objectStore(store).delete(id));}
 async flush(){if(this.busy||!this.ready||this.stopped)return;this.busy=true;try{await this.queuePersistence();const batch=[...this.pending.values()];if(batch.length){await this.tx(['outbox'],tx=>batch.forEach(op=>tx.objectStore('outbox').delete(op.id)));batch.forEach(op=>this.pending.delete(op.id));this.channel?.postMessage({type:'operations',operations:batch});}await this.pull();this.lastError=null;this.onStatus('Saved on this device')}catch(e){this.lastError=e;this.onStatus('Device storage error — keep this tab open')}finally{this.busy=false;if(this.pending.size&&!this.lastError){clearTimeout(this.flushTimer);this.flushTimer=setTimeout(()=>this.flush(),100);}}}
 async pull(){const operations=await this.readStore('operations');validateImport(operations);this.replica.import(operations);} tick(){}
 async loadAssets(){for(const asset of await this.readStore('assets'))if(!this.assetURLs.has(asset.id))this.assetURLs.set(asset.id,URL.createObjectURL(asset.blob));}
 assetURL(reference){const id=reference.replace(/^folio-asset:/,'');return this.assetURLs.get(id)||'';}
 async upload(file){if(file.size>10*1024*1024)throw Error('Files must be smaller than 10 MB');let id=uid(),asset={id,name:file.name,mime:file.type||'application/octet-stream',size:file.size,blob:file};await this.put('assets',asset);this.assetURLs.set(id,URL.createObjectURL(file));this.channel?.postMessage({type:'assets'});return{id,name:asset.name,mime:asset.mime,size:asset.size,url:'folio-asset:'+id};}
 async api(path,options={}){
  const url=new URL(path,'https://local.invalid/'),action=url.pathname.slice(1),method=options.method||'GET',body=options.body?JSON.parse(options.body):{},now=Date.now();
  if(action==='members')return{members:[this.user]};
  if(action==='presence')return{members:[{user:this.user.id,name:this.user.name,page:body.page||'',block:body.block||''}]};
  if(action==='workspace'){if(!body.name?.trim())throw Error('Workspace name is required');await this.tx(['meta'],tx=>tx.objectStore('meta').put(body.name.trim(),'name'));this.session.workspace.name=body.name.trim();this.session.workspaces[0].name=body.name.trim();return{ok:true};}
  if(action==='invites')throw Error('Invitation links require the server-backed workspace. This edition saves data only in this browser.');
  if(action==='comments'){
   const all=await this.readStore('comments');
   if(method==='GET')return{comments:all.filter(c=>c.page===url.searchParams.get('page')).sort((a,b)=>a.created-b.created)};
   if(method==='POST'){if(!body.text?.trim()||body.text.length>12000)throw Error('Write a comment of up to 12,000 characters');const id=uid();await this.put('comments',{id,workspace:this.workspace,page:body.page,block:body.block||null,parent:body.parent||null,user:this.user.id,name:this.user.name,text:body.text,resolved:0,created:now,updated:now});return{id};}
   const comment=all.find(c=>c.id===body.id);if(!comment)throw Error('Comment not found');
   if(method==='DELETE'){await this.tx(['comments'],tx=>all.filter(c=>c.id===body.id||c.parent===body.id).forEach(c=>tx.objectStore('comments').delete(c.id)));return{ok:true};}
   if('resolved'in body)comment.resolved=body.resolved?1:0;else{if(!body.text?.trim()||body.text.length>12000)throw Error('Invalid comment');comment.text=body.text;}comment.updated=now;await this.put('comments',comment);return{ok:true};
  }
  if(action==='history'){
   if(method==='GET'){if(url.searchParams.has('id')){const version=await this.readStore('history',url.searchParams.get('id'));if(!version)throw Error('Version not found');return version;}return{versions:(await this.readStore('history')).filter(v=>v.page===url.searchParams.get('page')).sort((a,b)=>b.created-a.created).slice(0,100).map(({data,...metadata})=>metadata)};}
   if(!body.page||!body.data||JSON.stringify(body.data).length>500000)throw Error('Snapshot is too large');await this.put('history',{id:uid(),workspace:this.workspace,page:body.page,user:this.user.id,name:this.user.name,label:body.label||'Saved version',data:body.data,created:now});return{ok:true};
  }
  throw Error('This action requires the server-backed workspace.');
 }
 dispose(){this.stopped=true;clearTimeout(this.flushTimer);this.channel?.close();for(const url of this.assetURLs.values())URL.revokeObjectURL(url);this.assetURLs.clear();this.db?.close();}
}

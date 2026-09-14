import {REGISTRY,CHANNELS,definition,defaults,canConnect} from './core/registry.js';
import {GraphStore,GraphIndex,createProject,createNode,flattenProject,validateProject,packageSelection,outputType,uid,clone,planEvaluation} from './core/graph.js';
import {preset,PRESETS} from './core/presets.js';
import {ProjectStorage,download,serialize,loadProjectFile,importBitmap} from './core/persistence.js';
import {toRGBA8,pngBlob,pfmBlob,zipBlob} from './core/export.js';
import {cpuEvaluate} from './core/cpu-kernels.js';
import {CPUEngine} from './core/cpu-engine.js';
import {GPUEngine} from './gpu/engine.js';
import {computeShader} from './gpu/shaders.js';
import {Preview} from './ui/preview.js';
import {GraphEditor,escapeHTML as esc} from './ui/graph-editor.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],storage=new ProjectStorage();
const store=new GraphStore(preset());let engine,preview,editor,ready=false,inspected=null,viewChannel='baseColor',propertyMode='selection',libTab='nodes',category='All';
let generation=0,running=false,evalTimer,saveTimer,clearRequested=false,exporting=false;
let latestResults=new Map(),latestFlat=null,thumbnailKeys=new Map(),palettePoint=null,paletteIndex=0;
const libraryImages=new Map();
function toast(message,error=false){const div=document.createElement('div');div.className='toast'+(error?' error':'');div.textContent=message;$('#toast-container').append(div);setTimeout(()=>div.remove(),error?9000:4200);}
function report(error){console.error(error);toast(error.message||String(error),true);$('#status-message').textContent=error.message||String(error);$('#status-message').parentElement.querySelector('i').style.background='#d68876';}
function safe(action){return (...args)=>{try{const result=action(...args);if(result?.catch)result.catch(report);}catch(e){report(e);}};}
function status(text){$('#status-message').textContent=text;$('#status-message').parentElement.querySelector('i').style.background='';}
const slug=name=>(name||'material').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'material';
function setDialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#main-dialog').open)$('#main-dialog').showModal();}
function closeDialog(){$('#main-dialog').close();}
function requestEvaluation(){generation++;clearTimeout(evalTimer);evalTimer=setTimeout(()=>safe(evaluate)(),55);}
async function evaluate(){
  if(!ready||running||exporting)return;running=true;
  try{
    let finished=0;
    while(finished!==generation){
      const ticket=generation,project=clone(store.project);finished=ticket;
      if(clearRequested){preview.setMaps({},engine.defaults.baseColor);engine.externalPins?.clear();engine.clear();thumbnailKeys.clear();clearRequested=false;}
      const flat=flattenProject(project),resolution=engine.kind==='WebGPU'?project.resolution:Math.min(256,project.resolution);
      const chosen=viewChannel==='selected'&&inspected?flat.mapping.get(inspected):flat.outputs[viewChannel];
      const roots=[...new Set([...Object.values(flat.outputs),chosen].filter(Boolean))];
      status('Evaluating material graph…');
      const results=await engine.evaluate(flat,roots,resolution),stats={...engine.stats};
      if(ticket!==generation)continue;
      latestResults=results;latestFlat=flat;
      const maps=Object.fromEntries(Object.entries(flat.outputs).map(([k,id])=>[k,results.get(id)]).filter(([,v])=>v));
      if(engine.externalPins)engine.externalPins=new Set([...Object.values(maps),results.get(chosen)].filter(Boolean).map(x=>x.key));
      const selectedNode=viewChannel==='selected'?project.nodes.find(n=>n.id===inspected):null;
      const space=selectedNode?(outputType(selectedNode,project)==='color'?'srgb':'linear'):(CHANNELS[viewChannel]?.space||'srgb');
      preview.setMaps(maps,results.get(chosen)||engine.defaults[viewChannel]||engine.defaults.baseColor,space);
      $('#texture-kind').textContent=space==='srgb'?'sRGB display':'Linear data';
      $('#texture-label').textContent=selectedNode?.label||CHANNELS[viewChannel]?.label||'Selected node';
      const selectedSize=results.get(chosen)?.size||resolution;$('#texture-dimensions').textContent=`${selectedSize} × ${selectedSize}${engine.kind==='WebGPU'?'':' · CPU preview'}`;
      $('#eval-summary').textContent=`${stats.computed} evaluated · ${stats.hits} cached · ${stats.ms.toFixed(1)} ms`;
      $('#gpu-memory').textContent=`${(stats.bytes/1048576).toFixed(1)} MiB ${engine.kind==='WebGPU'?'GPU':'worker'}`;
      $('#status-resolution').textContent=`${resolution} × ${resolution}`;
      const thumbRoots=[...new Set(project.nodes.map(n=>flat.mapping.get(n.id)))];
      const thumbs=await engine.evaluate(flat,thumbRoots,96);
      if(ticket!==generation)continue;
      for(const node of project.nodes){
        const entry=thumbs.get(flat.mapping.get(node.id));if(!entry||thumbnailKeys.get(node.id)===entry.key)continue;
        const pixels=await engine.read(entry);if(ticket!==generation)break;
        editor.setThumbnail(node.id,new ImageData(toRGBA8(pixels.data,outputType(node,project)==='color'?'srgb':'linear'),pixels.size,pixels.size));thumbnailKeys.set(node.id,entry.key);
      }
      const warnings=validateProject(project).warnings;
      status(warnings.length?`Graph ready · ${warnings.length} unconnected input${warnings.length===1?'':'s'} use defaults`:`Graph ready · ${engine.kind==='WebGPU'?'WebGPU compute':'CPU worker fallback'} · ${project.nodes.length} nodes`);
      window.strataforge.lastStats=stats;
    }
  }finally{running=false;}
}
let localSaveErrorShown=false;
function localSaveError(error){$('#save-state').textContent='Local save unavailable · use Save';if(!localSaveErrorShown){localSaveErrorShown=true;toast('Browser storage is unavailable. Use Save to keep a portable project file.',true);}console.info('Local persistence: '+error.message);}
function onChange(event){
  renderChrome();renderProperties();renderExplorer();editor.render();
  if(event.detail.label.includes('subgraph')||event.detail.label.includes('Subgraph')||event.detail.label.includes('material')||event.detail.label==='Open project')renderLibrary();
  $('#save-state').textContent='● Saving locally…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>storage.save(store.project).then(()=>$('#save-state').textContent='● All changes saved').catch(localSaveError),450);
  requestEvaluation();
}
function renderChrome(){const p=store.project;document.title=`${p.name} — StrataForge`;for(const id of ['title-project','explorer-name','material-preview-name','graph-breadcrumb'])$('#'+id).textContent=p.name;$('#graph-name').innerHTML=`${esc(p.name)} <span>×</span>`;$('#package-name').textContent=`${slug(p.name)}.sforge`;$('#resolution').value=p.resolution;$('#undo').disabled=!store.past.length;$('#redo').disabled=!store.future.length;
  $('#view-channel').innerHTML=Object.entries(CHANNELS).map(([k,c])=>`<option value="${k}">${c.label}</option>`).join('')+'<option value="selected">Selected node</option>';$('#view-channel').value=viewChannel;
}
function renderExplorer(){const p=store.project;$('#tree-outputs').innerHTML=Object.entries(CHANNELS).map(([key,c])=>`<button class="tree-output" data-channel="${key}" title="${p.outputs[key]?'Inspect '+c.label:'Unbound — using default'}">${c.label}<span class="channel-badge">${p.outputs[key]?c.space==='srgb'?'sRGB':'DATA':'—'}</span></button>`).join('');$('#asset-list').innerHTML=Object.entries(p.assets).length?Object.entries(p.assets).map(([id,a])=>`<button class="asset-item" data-asset="${esc(id)}" title="Add bitmap node">▧ ${esc(a.name)}</button>`).join(''):'No bitmap resources';
  $$('#tree-outputs button').forEach(b=>b.onclick=()=>{viewChannel=b.dataset.channel;$('#view-channel').value=viewChannel;const id=p.outputs[viewChannel];if(id)editor.select(id);requestEvaluation();});
  $$('#asset-list button').forEach(b=>b.onclick=()=>{const pos=editor.center();addNode('bitmap',pos,{asset:b.dataset.asset});});
}
function section(title,content,note=''){return `<section class="property-section"><div class="section-title"><span>${title}</span><b>${note}</b></div>${content}</section>`;}
function fieldMarkup(node,key,descriptor,exposedPanel=false){
  const value=node.params[key]??descriptor.value,isExposed=store.project.exposed.some(x=>x.node===node.id&&x.param===key),id=`field-${node.id}-${key}`;
  let control='';
  if(descriptor.type==='number')control=`<div class="number-field"><input type="range" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" value="${value}" data-param="${key}" data-node="${node.id}" aria-label="${esc(descriptor.label)}"><input type="number" min="${descriptor.min}" max="${descriptor.max}" step="${descriptor.step}" value="${value}" data-param-number="${key}" data-node="${node.id}" aria-label="${esc(descriptor.label)} value"></div>`;
  else if(descriptor.type==='select')control=`<select data-param="${key}" data-node="${node.id}" aria-label="${esc(descriptor.label)}">${descriptor.options.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
  else if(descriptor.type==='color')control=`<div class="color-field"><input type="color" value="${value}" data-param="${key}" data-node="${node.id}" aria-label="${esc(descriptor.label)}"><span class="color-value">${esc(value.toUpperCase())}</span></div>`;
  else if(descriptor.type==='asset')control=`<select data-param="${key}" data-node="${node.id}"><option value="">No bitmap selected</option>${Object.entries(store.project.assets).map(([id,a])=>`<option value="${id}" ${value===id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`;
  else control=`<input type="text" value="${esc(value)}" data-param="${key}" data-node="${node.id}">`;
  return `<div class="property-field"><div class="field-label"><label>${esc(descriptor.label)}</label>${descriptor.type!=='asset'&&descriptor.type!=='text'?`<button class="expose-button ${isExposed?'exposed':''}" data-expose="${key}" data-node="${node.id}" title="${isExposed?'Remove exposed parameter':'Expose parameter to material'}">${exposedPanel?'↗':'◇'}</button>`:''}</div>${control}</div>`;
}
function renderProperties(container=$('#properties-content')){
  const p=store.project,node=propertyMode==='selection'?p.nodes.find(n=>n.id===editor?.active):null;
  $('#node-tab').classList.toggle('active',propertyMode==='selection');$('#material-tab').classList.toggle('active',propertyMode==='material');
  if(node){const d=definition(node,p),type=outputType(node,p);container.innerHTML=`<div class="property-hero"><div class="eyebrow">${esc(d.category.toUpperCase())} / ${type.toUpperCase()}</div><h2>${esc(node.label)}</h2><p>${esc(d.description)}</p></div>`+
    section('INSTANCE',`<div class="property-field"><div class="field-label">Label</div><input id="node-label" value="${esc(node.label)}" maxlength="80"></div><div class="property-field"><div class="field-label">Resolution offset <span class="parameter-tag">INHERITED</span></div><select id="node-scale">${[-3,-2,-1,0,1].map(x=>`<option value="${x}" ${node.scale===x?'selected':''}>${x===0?'Parent resolution':x>0?'Parent × 2':`Parent ÷ ${2**-x}`}</option>`).join('')}</select></div>`)+
    section('PARAMETERS',Object.entries(d.params).map(([k,v])=>fieldMarkup(node,k,v)).join('')||'<div class="exposed-placeholder">This operation has no adjustable parameters.</div>',`${Object.keys(d.params).length} controls`)+
    (node.type==='bitmap'?'<button class="property-button" data-local-action="bitmap">＋ Import bitmap</button>':'')+
    (node.type==='subgraph'?'<button class="property-button" id="edit-subgraph">Edit reusable graph definition</button>':'')+
    section('MATERIAL OUTPUTS',Object.entries(CHANNELS).filter(([,c])=>canConnect(type,c.type)).map(([key,c])=>`<label class="output-assignment"><input type="checkbox" data-bind-channel="${key}" ${p.outputs[key]===node.id?'checked':''}> ${c.label}<span class="muted" style="margin-left:auto">${c.space==='srgb'?'sRGB':'DATA'}</span></label>`).join(''))+
    section('NODE INFORMATION',`<div class="info-grid"><span>Semantic type</span><span>${type}</span><span>Working format</span><span>RGBA16F</span><span>Identity</span><span title="${node.id}">${esc(node.id.slice(0,12))}…</span><span>Downstream nodes</span><span>${new GraphIndex(p).descendants([node.id]).size-1}</span></div><button class="property-button" id="view-node">View in 2D ↗</button><button class="property-button" data-local-action="compile">Inspect generated WGSL</button>`);
    container.querySelector('#node-label').onchange=safe(e=>store.transact('Rename node',draft=>draft.nodes.find(n=>n.id===node.id).label=e.target.value.trim()||d.label));
    container.querySelector('#node-scale').onchange=safe(e=>store.transact('Node resolution',draft=>draft.nodes.find(n=>n.id===node.id).scale=Number(e.target.value)));
    container.querySelectorAll('[data-bind-channel]').forEach(el=>el.onchange=safe(()=>{const checked=el.checked,key=el.dataset.bindChannel;store.transact('Bind material output',draft=>{if(checked)draft.outputs[key]=node.id;else delete draft.outputs[key];});}));
    container.querySelector('#view-node').onclick=()=>inspect(node.id);
    if(node.type==='subgraph')container.querySelector('#edit-subgraph').onclick=()=>editSubgraph(node.subgraph);
  }else{
    container.innerHTML=`<div class="property-hero"><div class="eyebrow">PROCEDURAL MATERIAL</div><h2>${esc(p.name)}</h2><p>${esc(p.description||'A non-destructive, resolution-independent material graph.')}</p></div>`+
    section('GRAPH SETTINGS',`<div class="property-field"><div class="field-label">Name</div><input id="material-name" value="${esc(p.name)}" maxlength="80"></div><div class="property-field"><div class="field-label">Random seed</div><input id="project-seed" type="number" value="${p.seed}" min="0" max="9999"></div>`)+
    section('EXPOSED PARAMETERS',p.exposed.length?p.exposed.map(x=>{const n=p.nodes.find(n=>n.id===x.node),d=definition(n,p).params[x.param];return fieldMarkup(n,x.param,{...d,label:x.label},true);}).join(''):'<div class="exposed-placeholder">Click ◇ beside a node parameter to make it available here and on reusable graph instances.</div>',`${p.exposed.length} exposed`)+
    section('OUTPUT CHANNELS',Object.entries(CHANNELS).map(([key,c])=>`<label class="output-assignment">${c.label}<select data-output-channel="${key}"><option value="">Default</option>${p.nodes.filter(n=>canConnect(outputType(n,p),c.type)).map(n=>`<option value="${n.id}" ${p.outputs[key]===n.id?'selected':''}>${esc(n.label)}</option>`).join('')}</select></label>`).join(''))+
    section('ENGINE',`<div class="info-grid"><span>Backend</span><span>${engine?.kind||'Initializing'}</span><span>Graph validation</span><span>Typed DAG</span><span>Working space</span><span>Linear / data</span><span>Evaluation</span><span>Dependency cached</span><span>Color exports</span><span>sRGB PNG</span><span>Data exports</span><span>Linear PNG / PFM</span></div><button class="property-button" data-local-action="validate">Validate material graph</button><button class="property-button" data-local-action="clear-cache">Clear intermediate cache</button>`);
    container.querySelector('#material-name').onchange=safe(e=>store.transact('Rename material',draft=>draft.name=e.target.value.trim()||'Untitled Material'));
    container.querySelector('#project-seed').onchange=safe(e=>store.transact('Change seed',draft=>draft.seed=Math.min(9999,Math.max(0,Number(e.target.value)))));
    container.querySelectorAll('[data-output-channel]').forEach(el=>el.onchange=safe(()=>{const id=el.value,key=el.dataset.outputChannel;store.transact('Bind material output',draft=>{if(id)draft.outputs[key]=id;else delete draft.outputs[key];});}));
  }
  bindFields(container);container.querySelectorAll('[data-local-action]').forEach(b=>b.onclick=()=>actions[b.dataset.localAction]?.());
}
// Sliders update continuously without replacing the DOM element currently holding pointer capture.
let editingParameter=false;
function setParam(nodeId,key,value,merge=null){editingParameter=true;try{store.transact('Change parameter',p=>p.nodes.find(n=>n.id===nodeId).params[key]=value,{merge});}finally{editingParameter=false;}}
function bindFields(container){
  container.querySelectorAll('[data-param]').forEach(el=>{
    const apply=safe(()=>{const n=store.project.nodes.find(n=>n.id===el.dataset.node),d=definition(n,store.project).params[el.dataset.param],value=d.type==='number'?Number(el.value):el.value;setParam(n.id,el.dataset.param,value,`${n.id}:${el.dataset.param}`);const number=el.parentElement.querySelector('[data-param-number]');if(number)number.value=value;const hex=el.parentElement.querySelector('.color-value');if(hex)hex.textContent=value.toUpperCase();});
    el.addEventListener(el.type==='range'||el.type==='color'?'input':'change',apply);
    if(el.type==='range')el.addEventListener('change',()=>{renderProperties();});
  });
  container.querySelectorAll('[data-param-number]').forEach(el=>el.onchange=safe(()=>{const n=store.project.nodes.find(n=>n.id===el.dataset.node),key=el.dataset.paramNumber,d=definition(n,store.project).params[key],value=Math.min(d.max,Math.max(d.min,Number(el.value)));setParam(n.id,key,value);renderProperties();}));
  container.querySelectorAll('[data-expose]').forEach(el=>el.onclick=safe(()=>store.transact('Expose parameter',p=>{const id=el.dataset.node,key=el.dataset.expose,x=p.exposed.find(x=>x.node===id&&x.param===key);if(x)p.exposed=p.exposed.filter(a=>a!==x);else p.exposed.push({id:uid(),node:id,param:key,label:definition(p.nodes.find(n=>n.id===id),p).params[key].label});})));
}
function libraryPreview(type){
  if(libraryImages.has(type))return libraryImages.get(type);
  const node=createNode(type),noise=cpuEvaluate(createNode('noise',0,0,{scale:5}),[],44,11),gradient=cpuEvaluate(createNode('gradient'),[],44,3);
  let entry;try{entry=cpuEvaluate(node,[noise,gradient,noise],44,17);}catch{entry=noise;}
  const image=new ImageData(toRGBA8(entry.data,REGISTRY[type].output==='color'?'srgb':'linear'),44,44);libraryImages.set(type,image);return image;
}
function renderLibrary(){
  const query=$('#library-search').value.toLowerCase(),visibleTypes=Object.entries(REGISTRY).filter(([type,d])=>!['Internal'].includes(d.category)&&type!=='graphInput'&&type!=='subgraph');
  const cats=['All','Generators','Patterns','Filters','Compositing','Masks','Material','Adjustments','Inputs'];
  $('#category-filter').innerHTML=libTab==='nodes'?cats.map(c=>`<button class="${category===c?'active':''}" data-category="${c}">${c}</button>`).join(''):'';
  $('#library-count').textContent=`${visibleTypes.length} nodes`;
  $('#category-filter').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.category;renderLibrary();});
  if(libTab==='nodes'){
    const types=visibleTypes.filter(([type,d])=>(category==='All'||d.category===category)&&`${d.label} ${d.category}`.toLowerCase().includes(query));
    $('#library-content').innerHTML=types.map(([type,d])=>`<button class="library-card" data-type="${type}" draggable="true" title="${esc(d.description)}"><canvas width="44" height="44"></canvas><span class="card-name">${d.label}</span><span class="card-category">${d.category.toUpperCase()}</span></button>`).join('');
    $('#library-content').querySelectorAll('.library-card').forEach(b=>{b.querySelector('canvas').getContext('2d').putImageData(libraryPreview(b.dataset.type),0,0);b.ondblclick=()=>addNode(b.dataset.type,editor.center());b.ondragstart=e=>e.dataTransfer.setData('application/x-strataforge-node',b.dataset.type);});
  }else if(libTab==='materials'){
    $('#library-content').innerHTML=PRESETS.filter(m=>m.name.toLowerCase().includes(query)).map(m=>`<button class="library-card material-card" data-preset="${m.id}" title="${esc(m.desc)}"><canvas width="64" height="64"></canvas><span class="material-copy"><span class="card-name">${m.name}</span><span class="card-category">${m.tag}</span></span></button>`).join('');
    $('#library-content').querySelectorAll('[data-preset]').forEach(b=>{const p=preset(b.dataset.preset),flat=flattenProject(p),results=new Map();for(const x of planEvaluation(flat,[flat.outputs.baseColor],64))results.set(x.node.id,cpuEvaluate(x.node,x.inputs.map(id=>results.get(id)),x.size,p.seed));const e=results.get(flat.outputs.baseColor);b.querySelector('canvas').getContext('2d').putImageData(new ImageData(toRGBA8(e.data,'srgb'),64,64),0,0);b.ondblclick=()=>loadPreset(b.dataset.preset);});
  }else{
    const entries=Object.entries(store.project.subgraphs).filter(([,s])=>s.name.toLowerCase().includes(query));
    $('#library-content').innerHTML=entries.length?entries.map(([id,s])=>`<button class="library-card" data-subgraph="${id}" draggable="true"><div style="height:69px;display:grid;place-items:center;font-size:32px;color:#b49ccc;background:#302b38">▧</div><span class="card-name">${esc(s.name)}</span><span class="card-category">${s.inputs.length} INPUTS · ${s.outputType.toUpperCase()}</span></button>`).join(''):'<div class="empty-library">Select a connected part of your graph, then choose <strong>Subgraph</strong> to turn it into a reusable node.<br><br>Expose parameters first to make them available on every instance.</div>';
    $('#library-content').querySelectorAll('[data-subgraph]').forEach(b=>{b.ondblclick=()=>addNode('subgraph:'+b.dataset.subgraph,editor.center());b.ondragstart=e=>e.dataTransfer.setData('application/x-strataforge-node','subgraph:'+b.dataset.subgraph);});
  }
}
function addNode(type,point,params={}){
  let node;
  if(type.startsWith('subgraph:')){const id=type.slice(9),sub=store.project.subgraphs[id];if(!sub)throw new Error('Missing reusable graph.');node={id:uid(),type:'subgraph',subgraph:id,label:sub.name,x:Math.round(point.x/10)*10,y:Math.round(point.y/10)*10,scale:0,params:Object.fromEntries(sub.parameters.map(p=>[p.key,p.descriptor.value]))};}
  else node=createNode(type,Math.round(point.x/10)*10,Math.round(point.y/10)*10,params);
  store.transact('Add node',p=>p.nodes.push(node));editor.select(node.id);return node.id;
}
function inspect(id){inspected=id;viewChannel='selected';$('#view-channel').value='selected';requestEvaluation();}
function loadPreset(id){store.transact('Load material',p=>Object.assign(p,preset(id)));editor.select(null);propertyMode='material';renderProperties();viewChannel='baseColor';thumbnailKeys.clear();requestAnimationFrame(()=>editor.fit());requestEvaluation();}
function palette(point){palettePoint=point||editor.center();paletteIndex=0;$('#palette-search').value='';renderPalette();$('#palette-dialog').showModal();$('#palette-search').focus();}
function paletteItems(){const query=$('#palette-search').value.toLowerCase();return [...Object.entries(REGISTRY).filter(([type,d])=>d.category!=='Internal'&&type!=='subgraph'&&type!=='graphInput').map(([type,d])=>({type,label:d.label,category:d.category})),...Object.entries(store.project.subgraphs).map(([id,d])=>({type:'subgraph:'+id,label:d.name,category:'Subgraphs'}))].filter(x=>`${x.label} ${x.category}`.toLowerCase().includes(query));}
function renderPalette(){const items=paletteItems();paletteIndex=Math.max(0,Math.min(paletteIndex,items.length-1));$('#palette-results').innerHTML=items.map((x,i)=>`<button class="palette-result ${i===paletteIndex?'active':''}" data-type="${x.type}" data-index="${i}"><span class="accent">${x.category==='Subgraphs'?'▧':'◈'}</span>${esc(x.label)}<span class="result-category">${x.category}</span></button>`).join('')||'<div class="empty-library">No matching nodes.</div>';$('#palette-results').querySelectorAll('button').forEach(b=>b.onclick=()=>{addNode(b.dataset.type,palettePoint);$('#palette-dialog').close();});}
function contextMenu(event,items){const menu=$('#context-menu');menu.innerHTML=items.map(x=>x===null?'<hr>':`<button data-action-name="${x.action}">${x.label}<span>${x.key||''}</span></button>`).join('');menu.classList.remove('hidden');const r=menu.getBoundingClientRect();menu.style.left=Math.max(5,Math.min(event.clientX,innerWidth-r.width-8))+'px';menu.style.top=Math.max(5,Math.min(event.clientY,innerHeight-r.height-8))+'px';menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{menu.classList.add('hidden');actions[b.dataset.actionName]?.();});}
function newMaterial(){
  setDialog('New material',`<p class="dialog-description">Start with a blank graph or an editable procedural material. This is undoable.</p><div class="dialog-form"><label>Name<input id="new-name" value="Untitled Material" maxlength="80"></label><label>Starting point<select id="new-preset"><option value="blank">Blank material graph</option>${PRESETS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></label></div><div class="dialog-actions"><button class="secondary-button" id="cancel-new">Cancel</button><button class="primary-button" id="create-new">Create material</button></div>`);
  $('#cancel-new').onclick=closeDialog;$('#create-new').onclick=safe(()=>{const id=$('#new-preset').value,name=$('#new-name').value.trim()||'Untitled Material',p=id==='blank'?createProject(name):preset(id);p.name=name;store.transact('New material',draft=>Object.assign(draft,p));editor.select(null);propertyMode='material';renderProperties();viewChannel='baseColor';requestAnimationFrame(()=>editor.fit());closeDialog();});
}
function duplicate(){const ids=editor.selected;if(!ids.size)return;const mapping=new Map([...ids].map(id=>[id,uid()]));store.transact('Duplicate nodes',p=>{p.nodes.push(...p.nodes.filter(n=>ids.has(n.id)).map(n=>({...clone(n),id:mapping.get(n.id),x:n.x+40,y:n.y+40})));p.edges.push(...p.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)).map(e=>({...e,id:uid(),from:mapping.get(e.from),to:mapping.get(e.to)})));});editor.selected=new Set(mapping.values());editor.active=[...editor.selected].at(-1);editor.render();renderProperties();}
function autoLayout(){store.transact('Arrange graph',p=>{const index=new GraphIndex(p),depth=new Map(),rows=new Map();for(const n of index.order()){const level=Math.max(0,...(index.incoming.get(n.id)||[]).map(e=>(depth.get(e.from)||0)+1)),row=rows.get(level)||0;depth.set(n.id,level);rows.set(level,row+1);n.x=level*245;n.y=row*205;}});editor.fit();}
function createSubgraph(){
  if(!editor.selected.size){toast('Select nodes first. The active node becomes the reusable graph output.');return;}
  setDialog('Create reusable graph',`<p class="dialog-description">Package ${editor.selected.size} selected nodes. The active node is the single output. Incoming connections become typed input ports; exposed parameters become instance controls.</p><div class="dialog-form"><label>Graph name<input id="subgraph-name" value="Surface Detail" maxlength="80"></label></div><div class="dialog-actions"><button class="primary-button" id="create-subgraph">Create reusable graph</button></div>`);
  $('#create-subgraph').onclick=safe(()=>{const name=$('#subgraph-name').value.trim()||'Surface Detail';let id;store.transact('Create subgraph',p=>id=packageSelection(p,editor.selected,editor.active,name));closeDialog();editor.select(id);libTab='subgraphs';$$('[data-lib-tab]').forEach(b=>b.classList.toggle('active',b.dataset.libTab===libTab));renderLibrary();toast('Reusable graph created. Drag another instance from Library → Graphs.');});
}
function editSubgraph(id){const sub=store.project.subgraphs[id];setDialog(`Reusable graph · ${sub.name}`,`<p class="dialog-description">Edit the reusable definition. Changes validate atomically and apply to every instance. Nodes, typed boundary inputs, exposed parameters, and the output identity are explicit.</p><textarea class="code-area" id="subgraph-code" spellcheck="false">${esc(JSON.stringify(sub,null,2))}</textarea><div class="dialog-actions"><button class="secondary-button" id="export-subgraph">Export definition</button><button class="primary-button" id="save-subgraph">Validate & apply</button></div>`);$('#export-subgraph').onclick=()=>download(new Blob([JSON.stringify(sub,null,2)],{type:'application/json'}),slug(sub.name)+'.subgraph.json');$('#save-subgraph').onclick=safe(()=>{const next=JSON.parse($('#subgraph-code').value);store.transact('Update subgraph',p=>p.subgraphs[id]=next);closeDialog();toast('Reusable definition updated across all instances.');});}
function inspectShader(){
  const node=store.project.nodes.find(n=>n.id===editor.active)||store.project.nodes[0];if(!node){toast('Add a node to generate a shader.');return;}
  const flat=flattenProject(store.project),actual=flat.nodes.find(n=>n.id===flat.mapping.get(node.id)),code=computeShader(actual.type);
  setDialog(`Generated WGSL · ${node.label}`,`<p class="dialog-description">One compute pass per node. Parameters use a 256-byte uniform block; image inputs are sampled in linear space, and the output is an RGBA16F storage texture. Subgraph instances are inlined before code generation.</p><textarea class="code-area" id="shader-source" readonly spellcheck="false">${esc(code)}</textarea><div class="dialog-actions"><button class="secondary-button" id="download-shader">Export .wgsl</button><button class="primary-button" id="validate-shader">Validate shader</button></div>`);
  $('#download-shader').onclick=()=>download(new Blob([code],{type:'text/plain'}),actual.type+'.wgsl');$('#validate-shader').onclick=safe(async()=>{if(engine.kind!=='WebGPU'){toast('WGSL validation requires a WebGPU adapter. The active backend is the CPU worker.');return;}await engine.pipeline(actual.type);toast('WGSL compilation passed on the active WebGPU device.');});
}
async function waitForEvaluation(){while(running)await new Promise(r=>setTimeout(r,30));}
async function exportTextures(){
  if(!ready)return;const p=store.project;
  setDialog('Export material textures',`<p class="dialog-description">Export the evaluated graph, not a viewport capture. PNG uses sRGB for Base Color and raw linear values for data maps. PFM stores full floating-point RGB data in linear space.</p><div class="dialog-form"><label>File prefix<input id="export-prefix" value="${slug(p.name)}" maxlength="80"></label><label>Resolution<select id="export-resolution">${[128,256,512,1024,2048].map(s=>`<option value="${s}" ${s===p.resolution?'selected':''}>${s} × ${s}</option>`).join('')}</select></label><label>Format<select id="export-format"><option value="png">PNG · 8-bit per channel</option><option value="pfm">PFM · 32-bit float, linear / data</option></select></label></div><div class="channel-options" style="margin-top:18px">${Object.entries(CHANNELS).map(([key,c])=>`<label><input type="checkbox" data-export-channel="${key}" ${p.outputs[key]?'checked':''}>${c.label}<small>${p.outputs[key]?'': 'default'}</small></label>`).join('')}</div><div class="warning-box">The ZIP includes texture maps, an ORM packed map (PNG), the editable project, and a manifest. Normal convention follows the authored normal-map node.</div><div class="progress-bar"><span id="export-progress"></span></div><div class="dialog-actions"><button class="secondary-button" id="cancel-export">Cancel</button><button class="primary-button" id="run-export">Export texture package</button></div>`);
  $('#cancel-export').onclick=closeDialog;$('#run-export').onclick=safe(async()=>{
    const channels=$$('[data-export-channel]').filter(b=>b.checked).map(b=>b.dataset.exportChannel);if(!channels.length)throw new Error('Choose at least one output channel.');
    const resolution=Number($('#export-resolution').value),format=$('#export-format').value,prefix=slug($('#export-prefix').value),button=$('#run-export');button.disabled=true;button.textContent='Evaluating…';exporting=true;
    try{
      await waitForEvaluation();const project=clone(store.project),flat=flattenProject(project),roots=[...new Set(channels.map(c=>flat.outputs[c]).filter(Boolean))];
      if(format==='png')for(const c of ['ao','roughness','metallic'])if(flat.outputs[c]&&!roots.includes(flat.outputs[c]))roots.push(flat.outputs[c]);
      const result=await engine.evaluate(flat,roots,resolution),files=[],pixels={};let completed=0;
      for(const key of channels){const entry=result.get(flat.outputs[key])||engine.defaults[key];let value=await engine.read(entry);if(value.size!==resolution)value=resample(value,resolution);pixels[key]=value;const blob=format==='png'?await pngBlob(value,CHANNELS[key].space):pfmBlob(value);files.push({name:`${prefix}_${key}.${format}`,blob});$('#export-progress').style.width=`${++completed/(channels.length+1)*100}%`;button.textContent=`Encoding ${CHANNELS[key].label}…`;}
      if(format==='png'){
        for(const key of ['ao','roughness','metallic'])if(!pixels[key]){let e=await engine.read(result.get(flat.outputs[key])||engine.defaults[key]);pixels[key]=e.size===resolution?e:resample(e,resolution);}
        const data=new Float32Array(resolution*resolution*4);for(let i=0;i<data.length;i+=4){data[i]=pixels.ao.data[i];data[i+1]=pixels.roughness.data[i];data[i+2]=pixels.metallic.data[i];data[i+3]=1;}files.push({name:`${prefix}_ORM.png`,blob:await pngBlob({data,size:resolution},'linear')});
      }
      const normalId=flat.outputs.normal,normalNode=flat.nodes.find(n=>n.id===normalId),normalConvention=normalNode?.type==='normal'?normalNode.params.format:'authored / unspecified';
      files.push({name:`${prefix}.sforge`,blob:new Blob([serialize(project)],{type:'application/json'})},{name:'manifest.json',blob:new Blob([JSON.stringify({generator:'StrataForge 1.0',project:project.name,resolution,format,workingSpace:'linear',normalConvention,channels:Object.fromEntries(channels.map(k=>[k,{file:`${prefix}_${k}.${format}`,colorSpace:format==='pfm'?'linear':CHANNELS[k].space}])),packed:format==='png'?{file:`${prefix}_ORM.png`,r:'occlusion',g:'roughness',b:'metallic',colorSpace:'linear'}:undefined},null,2)],{type:'application/json'})});
      const zip=await zipBlob(files);download(zip,`${prefix}_${resolution}_${format}.zip`);closeDialog();toast(`${channels.length} material maps exported in a ${(zip.size/1048576).toFixed(1)} MiB ZIP.`);
    }finally{exporting=false;button.disabled=false;button.textContent='Export texture package';requestEvaluation();}
  });
}
function resample(entry,size){const data=new Float32Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sx=Math.min(entry.size-1,Math.floor((x+.5)*entry.size/size)),sy=Math.min(entry.size-1,Math.floor((y+.5)*entry.size/size));data.set(entry.data.subarray((sy*entry.size+sx)*4,(sy*entry.size+sx)*4+4),(y*size+x)*4);}return {data,size};}
async function exportSelected(){if(!ready)return;exporting=true;try{await waitForEvaluation();const p=clone(store.project),flat=flattenProject(p),id=viewChannel==='selected'?flat.mapping.get(inspected):flat.outputs[viewChannel];if(!id)throw new Error('This channel has no bound output. Assign a node first.');const results=await engine.evaluate(flat,[id],p.resolution),entry=await engine.read(results.get(id)),node=flat.nodes.find(n=>n.id===id),space=outputType(node,flat)==='color'?'srgb':'linear';download(await pngBlob(entry,space),`${slug(p.name)}_${slug(node.label)}.png`);toast('Displayed texture exported.');}finally{exporting=false;requestEvaluation();}}
function help(){setDialog('StrataForge · Workflow & shortcuts',`<p class="dialog-description">Build a material by connecting typed image nodes. Double-click a node to inspect it; select it to edit its parameters. Assign outputs in Properties → Material Outputs, then export texture maps.</p><div class="help-grid"><span>Add node / search</span><span>Tab</span><span>Move selected nodes</span><span>Drag header</span><span>Connect typed ports</span><span>Drag port → port</span><span>Disconnect a port / wire</span><span>Alt + click</span><span>Multi-select</span><span>Shift + click / marquee</span><span>Pan graph</span><span>Middle drag / Space + drag</span><span>Zoom / frame all</span><span>Wheel / F</span><span>Duplicate / delete</span><span>Ctrl+D / Delete</span><span>Undo / redo</span><span>Ctrl+Z / Ctrl+Shift+Z</span><span>Save / open project</span><span>Ctrl+S / Ctrl+O</span><span>Select all</span><span>Ctrl+A</span><span>Reusable subgraph</span><span>Ctrl+G</span><span>2D / 3D view reset</span><span>Double-click view</span></div><div class="warning-box">WebGPU requires a secure context (HTTPS or localhost). When unavailable, the app uses a worker-based CPU material engine and a reduced-resolution software PBR preview. This is an original application; Adobe project formats are not supported.</div><p class="muted">On narrow screens, double-tap a node to open its properties. Projects auto-save locally in IndexedDB; Save writes a portable .sforge file containing graph definitions and embedded bitmaps.</p>`);}
const actions={
  new:safe(newMaterial),open:()=>$('#open-file').click(),save:safe(async()=>{download(new Blob([serialize(store.project)],{type:'application/json'}),slug(store.project.name)+'.sforge');try{await storage.save(store.project);}catch(e){localSaveError(e);}toast('Editable project saved.');}),
  undo:()=>store.undo(),redo:()=>store.redo(),add:()=>palette(palettePoint),fit:()=>editor.fit(),layout:safe(autoLayout),duplicate:safe(duplicate),delete:safe(()=>editor.selected.size&&store.remove(editor.selected)),
  reseed:safe(()=>store.transact('Randomize seed',p=>p.seed=Math.floor(Math.random()*9999))),compile:safe(inspectShader),subgraph:safe(createSubgraph),bitmap:()=>$('#bitmap-file').click(),
  export:safe(exportTextures),'export-selected':safe(exportSelected),help,
  validate:safe(()=>{const result=validateProject(store.project);toast(result.warnings.length?`Graph is valid. ${result.warnings.join(' ')}`:`Valid graph: ${store.project.nodes.length} nodes, ${store.project.edges.length} typed connections, no cycles.`);}),
  'clear-cache':()=>{clearRequested=true;requestEvaluation();toast('Intermediate texture cache will be rebuilt.');},
  material:()=>{propertyMode='material';editor.select(null);renderProperties();},inspect:()=>editor.active&&inspect(editor.active),
};
function bindUI(){
  $$('[data-action]').forEach(b=>b.onclick=()=>actions[b.dataset.action]?.());
  $('#close-dialog').onclick=()=>{if(!exporting)closeDialog();};$('#main-dialog').addEventListener('cancel',e=>{if(exporting)e.preventDefault();});$('#main-dialog').addEventListener('click',e=>{if(e.target===$('#main-dialog')&&!exporting)closeDialog();});
  $('#help-button').onclick=help;$('#palette-search').oninput=()=>{paletteIndex=0;renderPalette();};
  $('#palette-search').onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();paletteIndex+=e.key==='ArrowDown'?1:-1;renderPalette();$('#palette-results .active')?.scrollIntoView({block:'nearest'});}else if(e.key==='Enter'){e.preventDefault();$('#palette-results .active')?.click();}};
  $('#library-search').oninput=renderLibrary;$$('[data-lib-tab]').forEach(b=>b.onclick=()=>{libTab=b.dataset.libTab;$$('[data-lib-tab]').forEach(x=>x.classList.toggle('active',x===b));renderLibrary();});
  $('#node-tab').onclick=()=>{propertyMode='selection';renderProperties();};$('#material-tab').onclick=actions.material;$('#material-row').onclick=actions.material;$('#deselect').onclick=actions.material;
  $('#resolution').onchange=safe(e=>{const v=Number(e.target.value);store.transact('Graph resolution',p=>p.resolution=v);if(engine?.kind!=='WebGPU'&&v>256)toast('CPU interactive previews use 256²; exports evaluate at the selected full resolution.');});
  $('#view-channel').onchange=e=>{viewChannel=e.target.value;if(viewChannel==='selected')inspected=editor.active||inspected;requestEvaluation();};
  $('#mesh').onchange=e=>{if(!preview)return;preview.state.mesh=Number(e.target.value);if(preview.state.mesh===2){preview.state.yaw=0;preview.state.pitch=0;}preview.invalidate();};
  $('#environment').onchange=e=>{if(preview){preview.state.environment=Number(e.target.value);preview.invalidate();}};
  $('#reset-3d').onclick=()=>{Object.assign(preview.state,{yaw:.45,pitch:.2,distance:3.2});preview.invalidate();};$('#reset-2d').onclick=()=>{Object.assign(preview.flat,{zoom:1,offset:[0,0]});preview.invalidate();};
  $('#tile-toggle').onclick=e=>{preview.flat.tiling=1-preview.flat.tiling;e.currentTarget.classList.toggle('active',!!preview.flat.tiling);preview.invalidate();};
  $('#preview-settings-toggle').onclick=()=>$('#preview-settings').classList.toggle('hidden');
  for(const [selector,key]of [['#exposure','exposure'],['#uv-tiling','tiling'],['#normal-y','normalY']])$(selector).oninput=e=>{preview.state[key]=Number(e.target.value);preview.invalidate();};
  $('#open-file').onchange=safe(async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const p=await loadProjectFile(file);store.replace(p);editor.select(null);viewChannel='baseColor';inspected=null;thumbnailKeys.clear();requestAnimationFrame(()=>editor.fit());toast('Project loaded and validated.');});
  $('#bitmap-file').onchange=safe(async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const asset=await importBitmap(file),id=uid(),point=editor.center();let node;store.transact('Import bitmap',p=>{p.assets[id]=asset;node=createNode('bitmap',point.x,point.y,{asset:id});node.label=file.name;p.nodes.push(node);});editor.select(node.id);inspect(node.id);toast(`${asset.width} × ${asset.height} bitmap embedded in project.`);});
  const menus={file:[{label:'New material',action:'new',key:'Ctrl+N'},{label:'Open project…',action:'open',key:'Ctrl+O'},{label:'Save project',action:'save',key:'Ctrl+S'},null,{label:'Import bitmap…',action:'bitmap'},{label:'Export textures…',action:'export'}],edit:[{label:'Undo',action:'undo',key:'Ctrl+Z'},{label:'Redo',action:'redo',key:'Ctrl+Shift+Z'},null,{label:'Duplicate nodes',action:'duplicate',key:'Ctrl+D'},{label:'Delete nodes',action:'delete',key:'Delete'}],graph:[{label:'Add node…',action:'add',key:'Tab'},{label:'Create subgraph…',action:'subgraph',key:'Ctrl+G'},{label:'Auto arrange',action:'layout'},null,{label:'Validate graph',action:'validate'},{label:'Inspect WGSL',action:'compile'},{label:'Clear texture cache',action:'clear-cache'}],view:[{label:'Frame all nodes',action:'fit',key:'F'},{label:'Inspect selected node',action:'inspect'},{label:'Material properties',action:'material'},{label:'Workflow & shortcuts',action:'help'}]};
  $$('[data-menu]').forEach(b=>b.onclick=e=>{e.stopPropagation();const r=b.getBoundingClientRect();contextMenu({clientX:r.left,clientY:r.bottom},menus[b.dataset.menu]);});document.addEventListener('pointerdown',e=>{if(!e.target.closest('#context-menu'))$('#context-menu').classList.add('hidden');});
  document.addEventListener('keydown',e=>{
    if($('#main-dialog').open||$('#palette-dialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const command=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
    if(command){const map={s:'save',o:'open',n:'new',d:'duplicate',g:'subgraph',z:e.shiftKey?'redo':'undo',y:'redo'};if(map[key]){e.preventDefault();actions[map[key]]();}else if(key==='a'){e.preventDefault();editor.selected=new Set(store.project.nodes.map(n=>n.id));editor.active=store.project.nodes.at(-1)?.id||null;editor.render();renderProperties();}}
    else if(e.key==='Tab'){e.preventDefault();palette();}else if(key==='f'){e.preventDefault();editor.fit();}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();actions.delete();}else if(e.key==='Escape'){editor.select(null);$('#context-menu').classList.add('hidden');}
  });
  let splitter=null;
  $$('[data-split]').forEach(el=>el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);el.classList.add('dragging');splitter={el,type:el.dataset.split};e.preventDefault();});
  window.addEventListener('pointermove',e=>{if(!splitter)return;const root=document.documentElement;if(splitter.type==='left')root.style.setProperty('--left',Math.max(170,Math.min(360,e.clientX))+'px');else if(splitter.type==='right')root.style.setProperty('--right',Math.max(220,Math.min(400,innerWidth-e.clientX))+'px');else if(splitter.type==='graph'){const r=$('.center-column').getBoundingClientRect();root.style.setProperty('--preview-height',Math.max(25,Math.min(72,(e.clientY-r.top)/r.height*100))+'%');}else{const r=$('.preview-row').getBoundingClientRect();root.style.setProperty('--preview-split',Math.max(25,Math.min(75,(e.clientX-r.left)/r.width*100))+'%');}});
  window.addEventListener('pointerup',()=>{splitter?.el.classList.remove('dragging');splitter=null;});
}
async function start(){
  editor=new GraphEditor(store,{onSelection:id=>{propertyMode='selection';renderProperties();},onInspect:id=>{inspect(id);if(innerWidth<=720){setDialog('Node properties','<div class="properties-mobile"></div>');renderProperties($('#dialog-body .properties-mobile'));}},onAdd:(point,type)=>type?safe(addNode)(type,point):palette(point),onContext:(e,point)=>{palettePoint=point;contextMenu(e,[{label:'Add node…',action:'add',key:'Tab'},{label:'View in 2D',action:'inspect'},null,{label:'Duplicate',action:'duplicate',key:'Ctrl+D'},{label:'Package selection…',action:'subgraph'},{label:'Delete',action:'delete',key:'Delete'}]);},onError:report});
  // Skip inspector reconstruction while an input has an active edit gesture.
  store.addEventListener('change',e=>{if(editingParameter){renderChrome();renderExplorer();editor.render();$('#save-state').textContent='● Saving locally…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>storage.save(store.project).then(()=>$('#save-state').textContent='● All changes saved').catch(localSaveError),450);requestEvaluation();}else onChange(e);});
  bindUI();renderChrome();renderExplorer();renderLibrary();renderProperties();requestAnimationFrame(()=>editor.fit());
  try{const saved=await storage.load();if(saved&&!new URLSearchParams(location.search).has('fresh')){store.replace(saved);editor.fit();}}catch(e){localSaveError(e);}
  const cpuForced=new URLSearchParams(location.search).get('backend')==='cpu';
  try{if(cpuForced)throw new Error('CPU backend requested.');engine=await GPUEngine.create(report);preview=new Preview(engine,$('#preview-3d'),$('#preview-2d'));await preview.init();}
  catch(error){
    if(engine?.kind==='WebGPU'){report(error);throw error;}engine=new CPUEngine();preview=new Preview(engine,$('#preview-3d'),$('#preview-2d'));await preview.init();toast(`${cpuForced?'CPU reference backend active.':'WebGPU unavailable — CPU worker fallback active.'} Interactive previews use up to 256².`,false);console.info(error.message);
  }
  ready=true;$('#engine-chip').innerHTML=`<i></i> ${engine.kind==='WebGPU'?'WEBGPU ACTIVE':'CPU WORKER'}`;renderProperties();editor.fit();
  window.strataforge={store,engine,preview,editor,validate:()=>validateProject(store.project),evaluate,ready:true,actions,addNode,inspect,get busy(){return running||exporting;}};
  requestEvaluation();
}
start().catch(report);

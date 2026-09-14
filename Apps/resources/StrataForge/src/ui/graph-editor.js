import {definition,REGISTRY} from '../core/registry.js';
import {outputType} from '../core/graph.js';
const W=168,H=170,OUT_Y=80,IN_Y=i=>48+i*27;
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class GraphEditor {
  constructor(store,{onSelection,onInspect,onAdd,onContext,onError}){
    this.store=store;this.callbacks={onSelection,onInspect,onAdd,onContext,onError};this.stage=document.querySelector('#graph-canvas');this.world=document.querySelector('#graph-world');this.nodes=document.querySelector('#nodes');this.wirePaths=document.querySelector('#wire-paths');this.pending=document.querySelector('#pending-wire');this.selectionBox=document.querySelector('#selection-box');this.selected=new Set();this.active=null;this.camera={x:60,y:55,z:.7};this.positions=new Map();this.thumbnails=new Map();this.space=false;
    this.bind();this.render();new ResizeObserver(()=>this.updateTransform()).observe(this.stage);
  }
  point(event){const r=this.stage.getBoundingClientRect();return {x:(event.clientX-r.left-this.camera.x)/this.camera.z,y:(event.clientY-r.top-this.camera.y)/this.camera.z};}
  center(){const r=this.stage.getBoundingClientRect();return {x:(r.width/2-this.camera.x)/this.camera.z,y:(r.height/2-this.camera.y)/this.camera.z};}
  position(id){return this.positions.get(id)||this.store.project.nodes.find(n=>n.id===id)||{x:0,y:0};}
  path(from,to){const distance=Math.max(50,Math.abs(to.x-from.x)*.5);return `M${from.x},${from.y} C${from.x+distance},${from.y} ${to.x-distance},${to.y} ${to.x},${to.y}`;}
  updateTransform(){const c=this.camera;this.world.style.transform=`translate(${c.x}px,${c.y}px) scale(${c.z})`;this.stage.style.backgroundSize=`${20*c.z}px ${20*c.z}px`;this.stage.style.backgroundPosition=`${c.x}px ${c.y}px`;document.querySelector('#graph-zoom').textContent=`${Math.round(c.z*100)}%`;}
  render(){
    const p=this.store.project;this.selected=new Set([...this.selected].filter(id=>p.nodes.some(n=>n.id===id)));if(this.active&&!p.nodes.some(n=>n.id===this.active))this.active=null;
    this.nodes.innerHTML=p.nodes.map(n=>{const d=definition(n,p),type=outputType(n,p),channels=Object.entries(p.outputs).filter(([,id])=>id===n.id).map(([k])=>k),size=Math.min(2048,Math.max(32,Math.round(p.resolution*2**n.scale)));return `<div class="graph-node ${this.selected.has(n.id)?'selected':''}" data-id="${escapeHTML(n.id)}" data-category="${d.category}" style="left:${n.x}px;top:${n.y}px"><div class="node-header"><span>${n.type==='subgraph'?'▧':d.category==='Material'?'◇':'◈'}</span><span>${escapeHTML(n.label)}</span></div><canvas class="node-thumbnail" width="104" height="104"></canvas>${d.inputs.map((input,i)=>`<button class="port input-port type-${input.type}" data-input="${i}" style="top:${IN_Y(i)}px" title="${escapeHTML(input.name)} · ${input.type}${input.optional?' (optional)':''}"></button><span class="port-label" style="top:${IN_Y(i)}px">${escapeHTML(input.name.slice(0,4))}</span>`).join('')}<button class="port output-port type-${type}" data-output="true" style="top:${OUT_Y}px" title="Output · ${type}"></button><div class="node-footer"><span>${size}²</span><span class="output-badge">${channels.length?escapeHTML(channels.map(c=>c==='baseColor'?'BASE COLOR':c.toUpperCase()).join(' / ')):type.toUpperCase()}</span><i class="dirty-dot"></i></div></div>`;}).join('');
    for(const n of p.nodes){const thumbnail=this.thumbnails.get(n.id);if(thumbnail)this.drawThumbnail(n.id,thumbnail);}
    this.drawWires();this.updateTransform();document.querySelector('#graph-empty').classList.toggle('hidden',p.nodes.length>0);document.querySelector('#graph-summary').textContent=`${p.nodes.length} nodes · ${p.edges.length} connections`;
  }
  drawWires(){const p=this.store.project;this.wirePaths.innerHTML=p.edges.map(e=>{const a=this.position(e.from),b=this.position(e.to),type=outputType(p.nodes.find(n=>n.id===e.from),p);return `<path class="wire type-${type} ${this.selected.has(e.to)||this.selected.has(e.from)?'selected':''}" data-edge="${escapeHTML(e.id)}" d="${this.path({x:a.x+W,y:a.y+OUT_Y},{x:b.x,y:b.y+IN_Y(e.input)})}"/>`;}).join('');}
  drawThumbnail(id,image){const canvas=this.nodes.querySelector(`[data-id="${CSS.escape(id)}"] canvas`);if(!canvas)return;const off=document.createElement('canvas');off.width=image.width;off.height=image.height;off.getContext('2d').putImageData(image,0,0);canvas.getContext('2d').drawImage(off,0,0,104,104);}
  setThumbnail(id,image){this.thumbnails.set(id,image);this.drawThumbnail(id,image);}
  select(id,{add=false,toggle=false}={}){if(!add)this.selected.clear();if(id){if(toggle&&this.selected.has(id))this.selected.delete(id);else this.selected.add(id);}this.active=this.selected.has(id)?id:[...this.selected].at(-1)||null;this.nodes.querySelectorAll('.graph-node').forEach(el=>el.classList.toggle('selected',this.selected.has(el.dataset.id)));this.drawWires();this.callbacks.onSelection(this.active,this.selected);}
  fit(){const nodes=this.store.project.nodes;if(!nodes.length){this.camera={x:50,y:65,z:.8};this.updateTransform();return;}const minX=Math.min(...nodes.map(n=>n.x)),maxX=Math.max(...nodes.map(n=>n.x+W)),minY=Math.min(...nodes.map(n=>n.y)),maxY=Math.max(...nodes.map(n=>n.y+H)),r=this.stage.getBoundingClientRect();const z=Math.max(.15,Math.min(1.1,(r.width-90)/(maxX-minX),(r.height-85)/(maxY-minY)));this.camera={z,x:(r.width-(maxX-minX)*z)/2-minX*z,y:(r.height-(maxY-minY)*z)/2-minY*z+4};this.updateTransform();}
  zoom(factor,clientX=null,clientY=null){const r=this.stage.getBoundingClientRect(),x=(clientX??(r.left+r.width/2))-r.left,y=(clientY??(r.top+r.height/2))-r.top,c=this.camera,z=Math.min(2,Math.max(.12,c.z*factor));c.x=x-(x-c.x)*z/c.z;c.y=y-(y-c.y)*z/c.z;c.z=z;this.updateTransform();}
  bind(){
    this.stage.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
    window.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){this.space=true;e.preventDefault();}});window.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false;});window.addEventListener('blur',()=>this.space=false);
    this.stage.addEventListener('pointerdown',e=>{
      if(e.button===2)return;this.stage.focus();const point=this.point(e),node=e.target.closest('.graph-node'),port=e.target.closest('.port');
      if(port){e.preventDefault();const id=node.dataset.id;if(port.dataset.input!==undefined&&e.altKey){this.store.transact('Disconnect input',p=>p.edges=p.edges.filter(edge=>!(edge.to===id&&edge.input===Number(port.dataset.input))));return;}this.drag=port.dataset.output?{kind:'connect',from:id,point}:{kind:'connect',to:id,input:Number(port.dataset.input),point};return;}
      if(e.button===1||this.space){e.preventDefault();this.drag={kind:'pan',x:e.clientX,y:e.clientY,origin:{...this.camera}};this.stage.setPointerCapture(e.pointerId);return;}
      const edge=e.target.closest('[data-edge]');if(edge){if(e.altKey){this.store.transact('Delete connection',p=>p.edges=p.edges.filter(x=>x.id!==edge.dataset.edge));}return;}
      if(node){const id=node.dataset.id;if(!this.selected.has(id)||e.shiftKey)this.select(id,{add:e.shiftKey,toggle:e.shiftKey});else{this.active=id;this.callbacks.onSelection(id,this.selected);}this.drag={kind:'move',point,start:new Map([...this.selected].map(id=>[id,{...this.position(id)}])),moved:false};this.stage.setPointerCapture(e.pointerId);}
      else{if(!e.shiftKey)this.select(null);this.drag={kind:'marquee',point,add:new Set(this.selected)};this.stage.setPointerCapture(e.pointerId);}
    });
    window.addEventListener('pointermove',e=>{const d=this.drag;if(!d)return;const p=this.point(e);
      if(d.kind==='pan'){this.camera.x=d.origin.x+e.clientX-d.x;this.camera.y=d.origin.y+e.clientY-d.y;this.updateTransform();}
      else if(d.kind==='move'){const dx=p.x-d.point.x,dy=p.y-d.point.y;if(Math.abs(dx)+Math.abs(dy)>2)d.moved=true;for(const[id,start]of d.start){const pos={x:Math.round((start.x+dx)/10)*10,y:Math.round((start.y+dy)/10)*10};this.positions.set(id,pos);const node=this.nodes.querySelector(`[data-id="${CSS.escape(id)}"]`);if(node){node.style.left=pos.x+'px';node.style.top=pos.y+'px';}}this.drawWires();}
      else if(d.kind==='connect'){if(d.from){const a=this.position(d.from);this.pending.setAttribute('d',this.path({x:a.x+W,y:a.y+OUT_Y},p));}else{const b=this.position(d.to);this.pending.setAttribute('d',this.path(p,{x:b.x,y:b.y+IN_Y(d.input)}));}}
      else if(d.kind==='marquee'){const x=Math.min(p.x,d.point.x),y=Math.min(p.y,d.point.y),w=Math.abs(p.x-d.point.x),h=Math.abs(p.y-d.point.y);this.selectionBox.classList.remove('hidden');Object.assign(this.selectionBox.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});this.selected=new Set(d.add);for(const n of this.store.project.nodes)if(n.x+W>x&&n.x<x+w&&n.y+H>y&&n.y<y+h)this.selected.add(n.id);this.nodes.querySelectorAll('.graph-node').forEach(el=>el.classList.toggle('selected',this.selected.has(el.dataset.id)));}
    });
    window.addEventListener('pointerup',e=>{const d=this.drag;if(!d)return;this.drag=null;
      try{
        if(d.kind==='move'&&d.moved){const positions=new Map(this.positions);this.store.transact('Move nodes',p=>p.nodes.forEach(n=>{if(positions.has(n.id))Object.assign(n,positions.get(n.id));}));}
        else if(d.kind==='connect'){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.port');if(target){const id=target.closest('.graph-node').dataset.id;if(d.from&&target.dataset.input!==undefined)this.store.connect(d.from,id,Number(target.dataset.input));else if(d.to&&target.dataset.output)this.store.connect(id,d.to,d.input);}}
        else if(d.kind==='marquee'){this.active=[...this.selected].at(-1)||null;this.drawWires();this.callbacks.onSelection(this.active,this.selected);}
      }catch(error){this.callbacks.onError(error);}
      this.positions.clear();this.pending.setAttribute('d','');this.selectionBox.classList.add('hidden');if(d.kind==='move')this.render();
    });
    window.addEventListener('pointercancel',()=>{this.drag=null;this.positions.clear();this.pending.setAttribute('d','');this.selectionBox.classList.add('hidden');this.render();});
    this.stage.addEventListener('dblclick',e=>{const node=e.target.closest('.graph-node');if(node){this.select(node.dataset.id);this.callbacks.onInspect(node.dataset.id);}else this.callbacks.onAdd(this.point(e));});
    this.stage.addEventListener('contextmenu',e=>{e.preventDefault();const node=e.target.closest('.graph-node');if(node&&!this.selected.has(node.dataset.id))this.select(node.dataset.id);this.callbacks.onContext(e,this.point(e));});
    this.stage.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-strataforge-node'))e.preventDefault();});
    this.stage.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('application/x-strataforge-node');if(type)this.callbacks.onAdd(this.point(e),type);});
    document.querySelector('#zoom-out').onclick=()=>this.zoom(.8);document.querySelector('#zoom-in').onclick=()=>this.zoom(1.25);
  }
}

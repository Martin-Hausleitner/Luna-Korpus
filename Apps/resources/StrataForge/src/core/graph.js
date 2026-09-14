import {REGISTRY, CHANNELS, defaults, definition, canConnect} from './registry.js';
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const clone = value => structuredClone(value);
export function createProject(name='Untitled Material') {return {format:'strataforge',version:1,id:uid(),name,resolution:512,seed:17,nodes:[],edges:[],outputs:{},exposed:[],subgraphs:{},assets:{}};}
export function createNode(type,x=0,y=0,params={}) {return {id:uid(),type,x,y,label:REGISTRY[type]?.label || type,params:{...defaults(type),...params},scale:0};}
export function outputType(n, project, stack = new Set()) {
  if(stack.has(n.id)) throw new Error('A material graph cannot contain a cycle.');
  const d=definition(n,project);
  if(n.type==='bitmap'||n.type==='graphInput') return n.params.kind || 'color';
  if(d.output!=='auto')return d.output;
  stack=new Set(stack).add(n.id);
  const types=d.inputs.filter(p=>p.type==='any').map((_,i)=>project.edges.find(e=>e.to===n.id&&e.input===i))
    .filter(Boolean).map(e=>outputType(project.nodes.find(a=>a.id===e.from),project,stack));
  return types.includes('color') ? 'color' : types[0] || 'scalar';
}
export class GraphIndex {
  constructor(p){
    this.nodes=new Map(p.nodes.map(n=>[n.id,n]));this.incoming=new Map();this.dependents=new Map();
    for(const e of p.edges){if(!this.incoming.has(e.to))this.incoming.set(e.to,[]);this.incoming.get(e.to).push(e);if(!this.dependents.has(e.from))this.dependents.set(e.from,new Set());this.dependents.get(e.from).add(e.to);}
  }
  descendants(ids){const result=new Set(ids), queue=[...ids];for(let i=0;i<queue.length;i++)for(const id of this.dependents.get(queue[i])||[])if(!result.has(id)){result.add(id);queue.push(id);}return result;}
  order(roots = [...this.nodes.keys()]){
    const visiting=new Set(),visited=new Set(),order=[];
    const visit=id=>{if(visited.has(id))return;if(visiting.has(id))throw new Error('Connection rejected: cycle detected.');if(!this.nodes.has(id))throw new Error(`Unknown node ${id}`);visiting.add(id);for(const e of this.incoming.get(id)||[])visit(e.from);visiting.delete(id);visited.add(id);order.push(this.nodes.get(id));};
    roots.filter(Boolean).forEach(visit);return order;
  }
}
export function validateProject(p,{definitions=true}={}) {
  if(!p||p.format!=='strataforge'||p.version!==1)throw new Error('Not a supported StrataForge v1 project.');
  if(!Array.isArray(p.nodes)||!Array.isArray(p.edges)||!p.subgraphs||!p.assets||!p.outputs||!Array.isArray(p.exposed))throw new Error('Project structure is incomplete.');
  if(p.nodes.length>1000||p.edges.length>4000)throw new Error('Project exceeds the safe graph size limit.');
  if(!Number.isInteger(p.resolution)||p.resolution<64||p.resolution>2048)throw new Error('Resolution must be an integer between 64 and 2048.');
  if(!Number.isInteger(p.seed)||p.seed<0||p.seed>9999)throw new Error('Project seed must be an integer between 0 and 9999.');
  if(typeof p.name!=='string'||p.name.length>160)throw new Error('Invalid project name.');
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_/-]{1,1800}$/.test(id);
  for(const [id,asset]of Object.entries(p.assets)){if(!validId(id)||typeof asset.data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(asset.data)||asset.data.length>17*1024*1024||typeof asset.revision!=='string'||!Number.isInteger(asset.width)||!Number.isInteger(asset.height)||asset.width<1||asset.height<1||asset.width>4096||asset.height>4096)throw new Error('Invalid embedded bitmap asset.');}
  for(const [id,sub]of Object.entries(p.subgraphs))if(!validId(id)||typeof sub.name!=='string'||!['scalar','color','normal'].includes(sub.outputType))throw new Error('Invalid reusable graph metadata.');
  const ids=new Set(), edgeIds=new Set(), destinations=new Set();
  for(const n of p.nodes){
    if(!validId(n.id)||ids.has(n.id))throw new Error('Duplicate or invalid node identity.');ids.add(n.id);
    if(!Number.isFinite(n.x)||!Number.isFinite(n.y)||!Number.isInteger(n.scale)||n.scale< -3||n.scale>1)throw new Error('Invalid node position or resolution offset.');
    const d=definition(n,p);
    if(!n.params||typeof n.params!=='object')throw new Error('Missing node parameters.');
    for(const [k,param] of Object.entries(d.params)){
      const v=n.params[k]??param.value;
      if(param.type==='number'&&(!Number.isFinite(v)||v<param.min||v>param.max||(param.step===1&&!Number.isInteger(v))))throw new Error(`${d.label}: ${param.label} must be ${param.min}–${param.max}.`);
      if(param.type==='select'&&!param.options.includes(v))throw new Error(`${d.label}: invalid ${param.label}.`);
      if(param.type==='color'&&!/^#[0-9a-f]{6}$/i.test(v))throw new Error(`${d.label}: invalid color.`);
    }
  }
  const index=new GraphIndex(p);
  for(const e of p.edges){
    if(!validId(e.id)||edgeIds.has(e.id))throw new Error('Duplicate or invalid connection identity.');edgeIds.add(e.id);
    if(!ids.has(e.from)||!ids.has(e.to))throw new Error('Dangling graph connection.');
    const key=`${e.to}:${e.input}`;if(destinations.has(key))throw new Error('Each input accepts only one connection.');destinations.add(key);
    const input=definition(index.nodes.get(e.to),p).inputs[e.input];if(!input)throw new Error('Connection targets a non-existent input.');
  }
  index.order();
  for(const e of p.edges){const input=definition(index.nodes.get(e.to),p).inputs[e.input],from=outputType(index.nodes.get(e.from),p);if(!canConnect(from,input.type))throw new Error(`Type mismatch: ${from} → ${input.type}. Insert an explicit conversion node.`);}
  for(const [channel,id] of Object.entries(p.outputs)){if(!CHANNELS[channel]||!ids.has(id))throw new Error('Invalid material output binding.');if(!canConnect(outputType(index.nodes.get(id),p),CHANNELS[channel].type))throw new Error(`${CHANNELS[channel].label} needs a ${CHANNELS[channel].type} texture.`);}
  for(const x of p.exposed){const n=index.nodes.get(x.node);if(!n||!definition(n,p).params[x.param])throw new Error('Exposed parameter references a missing parameter.');}
  if(definitions){
    // Flattening detects missing boundaries, recursion and validates all instantiated definitions.
    flattenProject(p);
    // Validate uninstantiated definitions too, so they cannot hide malformed graphs.
    for(const [id,sub] of Object.entries(p.subgraphs)){
      const instance={id:'__validate_instance',type:'subgraph',subgraph:id,label:sub.name,x:0,y:0,scale:0,params:{}};
      flattenProject({...p,nodes:[instance],edges:[],outputs:{},exposed:[]});
    }
  }
  return {valid:true,warnings:p.nodes.flatMap(n=>definition(n,p).inputs.flatMap((input,i)=>!input.optional&&!p.edges.some(e=>e.to===n.id&&e.input===i)?[`${n.label}: ${input.name} is unconnected (uses black).`]:[]))};
}
/** Inline instances into an immutable DAG. Geometry and instance IDs do not affect topology. */
export function flattenProject(project){
  const flat={...project,nodes:[],edges:[],outputs:{},exposed:[]}, aliases=new Map();
  function expand(nodes,edges,prefix,path,bindings=new Map(),inheritedScale=0){
    const local=new Map();
    for(const original of nodes){
      const n=clone(original), id=prefix+n.id;
      if(!Number.isInteger(n.scale)||n.scale< -3||n.scale>1)throw new Error('Invalid subgraph node resolution offset.');
      n.scale=Math.max(-3,Math.min(1,(n.scale||0)+inheritedScale));
      if(n.type==='subgraph'){
        if(path.includes(n.subgraph)||path.length>15)throw new Error('Recursive subgraphs are not supported.');
        const sub=project.subgraphs[n.subgraph];
        if(!sub||!Array.isArray(sub.nodes)||!Array.isArray(sub.edges)||!Array.isArray(sub.inputs)||sub.inputs.length>4)throw new Error('Invalid subgraph definition (maximum four inputs).');
        const inner=clone(sub.nodes);
        for(const p of sub.parameters||[]){const target=inner.find(a=>a.id===p.node);if(!target||!REGISTRY[target.type]?.params[p.param])throw new Error('Invalid subgraph parameter target.');target.params[p.param]=n.params[p.key]??p.descriptor.value;}
        const innerBindings=new Map();
        sub.inputs.forEach((input,i)=>{
          const target=inner.find(a=>a.id===input.node);
          if(!target||target.type!=='graphInput'||target.params.kind!==input.type)throw new Error('Invalid typed subgraph boundary.');
          const edge=edges.find(e=>e.to===n.id&&e.input===i);
          if(edge)innerBindings.set(input.node,{outer:prefix+edge.from});
        });
        const innerMap=expand(inner,sub.edges,`${id}/`,[...path,n.subgraph],innerBindings,n.scale);
        if(!innerMap.has(sub.output))throw new Error('Subgraph output is missing.');
        local.set(n.id,innerMap.get(sub.output));aliases.set(id,innerMap.get(sub.output));
      } else {
        if(flat.nodes.length>=1000)throw new Error('Expanded graph exceeds the 1000-node safety limit.');
        n.id=id;flat.nodes.push(n);local.set(original.id,id);
        if(bindings.has(original.id)){n.type='boundary';n.params={kind:original.params.kind};flat.edges.push({id:uid(),from:bindings.get(original.id).outer,to:id,input:0});}
      }
    }
    for(const e of edges){
      if(nodes.find(n=>n.id===e.to)?.type==='subgraph')continue;
      flat.edges.push({...e,id:prefix+e.id,from:local.get(e.from),to:local.get(e.to)});
    }
    return local;
  }
  const mapping=expand(project.nodes,project.edges,'',[]);
  for(const e of flat.edges){let steps=0;while(aliases.has(e.from)){e.from=aliases.get(e.from);if(++steps>32)throw new Error('Cyclic subgraph aliases.');}}
  for(const [k,id]of Object.entries(project.outputs))flat.outputs[k]=mapping.get(id);
  flat.mapping=mapping;
  const index=new GraphIndex(flat);index.order();
  for(const n of flat.nodes){
    if(!REGISTRY[n.type])throw new Error(`Invalid node type inside subgraph: ${n.type}`);
    for(const e of index.incoming.get(n.id)||[]){const input=REGISTRY[n.type].inputs[e.input];if(!input)throw new Error('Invalid inner input port.');if(!canConnect(outputType(index.nodes.get(e.from),flat),input.type))throw new Error('Subgraph connection type mismatch.');}
  }
  // Declared instance output types must agree with actual graphs.
  for(const n of project.nodes.filter(n=>n.type==='subgraph')){const actual=outputType(index.nodes.get(mapping.get(n.id)),flat);if(actual!==project.subgraphs[n.subgraph].outputType)throw new Error('Subgraph output type does not match its declaration.');}
  validateProject(flat,{definitions:false});
  return flat;
}
// Internal typed identity operator for external subgraph inputs.
REGISTRY.boundary={label:'Boundary',category:'Internal',output:'auto',inputs:[{name:'Input',type:'any'}],params:{},description:'Inlined graph boundary.'};
export class GraphStore extends EventTarget {
  constructor(project){super();validateProject(project);this.project=clone(project);this.past=[];this.future=[];this.revision=0;this.lastMerge=null;}
  transact(label,fn,{merge=null}={}){
    const before=clone(this.project),next=clone(before);fn(next);validateProject(next);
    if(JSON.stringify(before)===JSON.stringify(next))return false;
    const now=Date.now(),last=this.past.at(-1);
    if(merge&&last?.merge===merge&&now-last.time<500){last.after=clone(next);last.time=now;}else this.past.push({label,before,after:clone(next),merge,time:now});
    if(this.past.length>80)this.past.shift();this.future=[];this.project=next;this.notify(label,before);return true;
  }
  notify(label,before){this.revision++;const old=new Map(before.nodes.map(n=>[n.id,JSON.stringify([n.type,n.params,n.scale,n.subgraph])])),direct=new Set();for(const n of this.project.nodes)if(old.get(n.id)!==JSON.stringify([n.type,n.params,n.scale,n.subgraph]))direct.add(n.id);for(const e of this.project.edges)if(!before.edges.some(a=>a.from===e.from&&a.to===e.to&&a.input===e.input))direct.add(e.to);for(const e of before.edges)if(!this.project.edges.some(a=>a.from===e.from&&a.to===e.to&&a.input===e.input))direct.add(e.to);if(this.project.seed!==before.seed||this.project.resolution!==before.resolution||JSON.stringify(this.project.subgraphs)!==JSON.stringify(before.subgraphs))this.project.nodes.forEach(n=>direct.add(n.id));const invalidated=new GraphIndex(this.project).descendants(direct);this.dispatchEvent(new CustomEvent('change',{detail:{label,invalidated,revision:this.revision}}));}
  undo(){const command=this.past.pop();if(!command)return;const before=this.project;this.project=clone(command.before);this.future.push(command);this.notify(`Undo ${command.label}`,before);}
  redo(){const command=this.future.pop();if(!command)return;const before=this.project;this.project=clone(command.after);this.past.push(command);this.notify(`Redo ${command.label}`,before);}
  replace(project){validateProject(project);const before=this.project;this.project=clone(project);this.past=[];this.future=[];this.notify('Open project',before);}
  connect(from,to,input){this.transact('Connect nodes',p=>{p.edges=p.edges.filter(e=>!(e.to===to&&e.input===input));p.edges.push({id:uid(),from,to,input});});}
  remove(ids){this.transact('Delete nodes',p=>{p.nodes=p.nodes.filter(n=>!ids.has(n.id));p.edges=p.edges.filter(e=>!ids.has(e.from)&&!ids.has(e.to));for(const[k,id]of Object.entries(p.outputs))if(ids.has(id))delete p.outputs[k];p.exposed=p.exposed.filter(x=>!ids.has(x.node));});}
}
/** Collision-free semantic interning: descriptors reference compact upstream tokens, not recursive strings. */
const signatureIds = new Map();
let nextSignatureId = 1;
export function planEvaluation(flat,roots,resolution){
  const index=new GraphIndex(flat),keys=new Map();
  return index.order(roots).map(n=>{
    const size=Math.max(32,Math.min(2048,Math.round(resolution*2**n.scale)));
    const inputs=Array.from({length:REGISTRY[n.type].inputs.length},(_,i)=>index.incoming.get(n.id)?.find(e=>e.input===i)?.from||null);
    // Upstream keys are interned by deterministic hashing plus the full semantic descriptor.
    const descriptor=JSON.stringify([n.type,n.params,size,flat.seed,n.type==='bitmap'?flat.assets[n.params.asset]?.revision:null,inputs.map(id=>id?keys.get(id):null)]);
    if(!signatureIds.has(descriptor))signatureIds.set(descriptor,String(nextSignatureId++));
    const key=signatureIds.get(descriptor);keys.set(n.id,key);return {node:n,size,inputs,key};
  });
}
export function packageSelection(p,selected,outputId,name='Reusable Material Detail'){
  if(!selected.size||!selected.has(outputId))throw new Error('Select nodes and an active output node first.');
  const outgoing=p.edges.filter(e=>selected.has(e.from)&&!selected.has(e.to));
  if(outgoing.some(e=>e.from!==outputId)||Object.values(p.outputs).some(id=>selected.has(id)&&id!==outputId))throw new Error('A reusable subgraph has one output. Select a region whose external connections all originate at the active node.');
  const nodes=clone(p.nodes.filter(n=>selected.has(n.id))),edges=clone(p.edges.filter(e=>selected.has(e.from)&&selected.has(e.to)));
  const incoming=p.edges.filter(e=>!selected.has(e.from)&&selected.has(e.to)),inputs=[],external=[];
  for(const edge of incoming){let i=external.findIndex(x=>x.from===edge.from);if(i<0){i=inputs.length;if(i>=4)throw new Error('Subgraphs support up to four external inputs.');const source=p.nodes.find(n=>n.id===edge.from),type=outputType(source,p),boundary=createNode('graphInput',-220,i*160,{name:source.label,kind:type});nodes.push(boundary);inputs.push({name:source.label,type,node:boundary.id});external.push({from:edge.from,input:i});}edges.push({id:uid(),from:inputs[i].node,to:edge.to,input:edge.input});}
  const exposed=p.exposed.filter(x=>selected.has(x.node));
  const parameters=exposed.map((x,i)=>({key:`p${i}`,label:x.label,node:x.node,param:x.param,descriptor:{...definition(p.nodes.find(n=>n.id===x.node),p).params[x.param],label:x.label,value:p.nodes.find(n=>n.id===x.node).params[x.param]}}));
  const defId=uid(),sub={name,nodes,edges,inputs,output:outputId,outputType:outputType(p.nodes.find(n=>n.id===outputId),p),parameters};
  p.subgraphs[defId]=sub;
  const origin=p.nodes.find(n=>n.id===outputId),instance={id:uid(),type:'subgraph',subgraph:defId,label:name,x:origin.x,y:origin.y,scale:0,params:Object.fromEntries(parameters.map(x=>[x.key,x.descriptor.value]))};
  p.nodes=p.nodes.filter(n=>!selected.has(n.id));p.nodes.push(instance);
  p.edges=p.edges.filter(e=>!selected.has(e.from)&&!selected.has(e.to));
  p.edges.push(...outgoing.map(e=>({...e,from:instance.id})),...external.map(e=>({id:uid(),from:e.from,to:instance.id,input:e.input})));
  for(const[k,id]of Object.entries(p.outputs))if(id===outputId)p.outputs[k]=instance.id;
  p.exposed=p.exposed.filter(x=>!selected.has(x.node));parameters.forEach(x=>p.exposed.push({id:uid(),label:x.label,node:instance.id,param:x.key}));
  return instance.id;
}

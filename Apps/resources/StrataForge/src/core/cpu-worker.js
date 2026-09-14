import {planEvaluation} from './graph.js';
import {cpuEvaluate} from './cpu-kernels.js';
const cache=new Map(),assets=new Map();let tick=0;
async function image(asset,id){
  if(!asset)return null;const key=id+asset.revision;if(assets.has(key))return assets.get(key);
  const bitmap=await createImageBitmap(await(await fetch(asset.data)).blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  if(bitmap.width>4096||bitmap.height>4096){bitmap.close();throw new Error('Decoded bitmap exceeds 4096 × 4096.');}
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;bitmap.close();const entry={data:Float32Array.from(bytes,x=>x/255),width:canvas.width,height:canvas.height,size:canvas.width};assets.set(key,entry);return entry;
}
self.onmessage=async ({data:msg})=>{
  if(msg.type==='clear'){cache.clear();assets.clear();return;}
  try{
    const start=performance.now(),plan=planEvaluation(msg.flat,msg.roots,msg.resolution),results=new Map(),pinned=new Set(plan.map(p=>p.key));let computed=0,hits=0;
    if(plan.reduce((sum,x)=>sum+x.size*x.size*16,0)>768*1024*1024)throw new Error('CPU working set exceeds 768 MiB. Reduce resolution or per-node resolution offsets.');
    for(const item of plan){let entry=cache.get(item.key);if(entry){hits++;entry.used=++tick;}else{const bitmap=item.node.type==='bitmap'?await image(msg.flat.assets[item.node.params.asset],item.node.params.asset):null;entry={...cpuEvaluate(item.node,item.inputs.map(id=>results.get(id)),item.size,msg.flat.seed,bitmap),key:item.key,used:++tick};computed++;cache.set(item.key,entry);}results.set(item.node.id,entry);}
    let bytes=[...cache.values()].reduce((s,e)=>s+e.data.byteLength,0);
    for(const[key,entry]of [...cache].sort((a,b)=>a[1].used-b[1].used)){if(bytes<160*1024*1024)break;if(!pinned.has(key)){bytes-=entry.data.byteLength;cache.delete(key);}}
    const out=msg.roots.filter(id=>results.has(id)).map(id=>[id,{...results.get(id),data:results.get(id).data.slice()}]);
    self.postMessage({id:msg.id,results:out,stats:{computed,hits,ms:performance.now()-start,bytes,nodes:plan.length}},out.map(([,e])=>e.data.buffer));
  }catch(error){self.postMessage({id:msg.id,error:error.message});}
};

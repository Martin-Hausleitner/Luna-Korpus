import {packParams,CHANNELS} from '../core/registry.js';
import {planEvaluation} from '../core/graph.js';
import {computeShader} from './shaders.js';
export function halfToFloat(h){const s=(h&0x8000)?-1:1,e=(h>>10)&31,m=h&1023;return e===0?s*2**-14*(m/1024):e===31?(m?NaN:s*Infinity):s*2**(e-15)*(1+m/1024);}
/** IEEE-754 binary32 → binary16, round to nearest, ties to even. */
export function floatToHalf(f){
  const a=new Float32Array([f]),u=new Uint32Array(a.buffer)[0],sign=(u>>>16)&0x8000,exponent=(u>>>23)&255,mantissa=u&0x7fffff;
  if(exponent===255)return sign|0x7c00|(mantissa?0x200:0);
  const e=exponent-127+15;
  if(e>=31)return sign|0x7c00;
  if(e<=0){if(e< -10)return sign;const m=mantissa|0x800000,shift=14-e,base=m>>>shift,remainder=m&((1<<shift)-1),halfway=1<<(shift-1);return sign|(base+(remainder>halfway||(remainder===halfway&&(base&1))?1:0));}
  const rounded=mantissa+0xfff+((mantissa>>>13)&1);
  return sign|((e<<10)+(rounded>>>13));
}
export class GPUEngine {
  static async create(onError=console.error){
    if(!navigator.gpu)throw new Error('WebGPU is not exposed by this browser.');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter is available.');
    const device=await adapter.requestDevice();return new GPUEngine(device,adapter,onError);
  }
  constructor(device,adapter,onError){
    this.device=device;this.adapter=adapter;this.kind='WebGPU';this.cache=new Map();this.pipelines=new Map();this.assets=new Map();this.assetBytes=0;this.pool=new Map();this.poolBytes=0;this.bytes=0;this.budget=384*1024*1024;this.tick=0;this.externalPins=new Set();this.readbacks=new Map();this.onError=onError;
    device.addEventListener('uncapturederror',e=>onError(e.error));device.lost.then(info=>{this.lost=true;onError(new Error(`GPU device lost: ${info.message}. Reload to initialize a new device.`));});
    this.layout=device.createBindGroupLayout({entries:[0,1,2,3].map(binding=>({binding,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'float'}})).concat([
      {binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba16float'}},
      {binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform',minBindingSize:256}},
      {binding:6,visibility:GPUShaderStage.COMPUTE,sampler:{type:'filtering'}}])});
    this.pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[this.layout]});
    this.sampler=device.createSampler({addressModeU:'repeat',addressModeV:'repeat',magFilter:'linear',minFilter:'linear'});
    this.black=this.solid([0,0,0,1]);this.white=this.solid([1,1,1,1]);this.defaults=Object.fromEntries(Object.entries(CHANNELS).map(([k,c])=>[k,this.solid(c.default)]));
  }
  solid(values){const texture=this.device.createTexture({size:[1,1],format:'rgba16float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC});this.device.queue.writeTexture({texture},new Uint16Array(values.map(floatToHalf)),{bytesPerRow:8},[1,1]);return {texture,view:texture.createView(),size:1,key:'solid'+values.join(',')};}
  async pipeline(type){
    if(!this.pipelines.has(type))this.pipelines.set(type,(async()=>{
      const code=computeShader(type),module=this.device.createShaderModule({label:`StrataForge ${type}`,code});
      const diagnostics=await module.getCompilationInfo();const errors=diagnostics.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(`${type} WGSL: ${errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
      return this.device.createComputePipelineAsync({label:type,layout:this.pipelineLayout,compute:{module,entryPoint:'main'}});
    })());return this.pipelines.get(type);
  }
  allocate(size){const list=this.pool.get(size);let texture=list?.pop();if(texture)this.poolBytes-=size*size*8;else texture=this.device.createTexture({label:`Material ${size}`,size:[size,size],format:'rgba16float',usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});return {texture,view:texture.createView(),size};}
  release(entry){this.bytes-=entry.size*entry.size*8;const n=entry.size*entry.size*8;if(this.poolBytes+n<=32*1024*1024){if(!this.pool.has(entry.size))this.pool.set(entry.size,[]);this.pool.get(entry.size).push(entry.texture);this.poolBytes+=n;}else entry.texture.destroy();}
  prune(pinned){for(const [key,entry]of [...this.cache].sort((a,b)=>a[1].used-b[1].used)){if(this.bytes<=this.budget)break;if(!pinned.has(key)&&!this.externalPins.has(key)){this.cache.delete(key);this.release(entry);}}}
  async bitmap(id,project){
    const asset=project.assets[id];if(!asset)return this.black;
    const key=`${id}:${asset.revision}`;if(this.assets.has(key))return this.assets.get(key);
    const bitmap=await createImageBitmap(await(await fetch(asset.data)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
    if(bitmap.width>4096||bitmap.height>4096||bitmap.width>this.device.limits.maxTextureDimension2D||bitmap.height>this.device.limits.maxTextureDimension2D){bitmap.close();throw new Error('Decoded bitmap exceeds supported dimensions.');}
    const bytes=bitmap.width*bitmap.height*4;
    const texture=this.device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
    this.device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);bitmap.close();
    const value={texture,view:texture.createView(),size:asset.width,key,bytes};this.assets.set(key,value);this.assetBytes+=bytes;return value;
  }
  async evaluate(flat,roots,resolution){
    if(this.lost)throw new Error('The GPU device has been lost.');
    const start=performance.now(),plan=planEvaluation(flat,roots,resolution),pinned=new Set(plan.map(x=>x.key));
    const working=plan.reduce((sum,item)=>sum+item.size**2*8,0);if(working>768*1024*1024)throw new Error('Working texture set exceeds 768 MiB. Lower graph resolution or a node’s resolution offset.');
    await Promise.all([...new Set(plan.filter(x=>!this.cache.has(x.key)).map(x=>x.node.type))].map(type=>this.pipeline(type)));
    // Asset decoding happens before command recording. No mutation interleaves with GPU submission.
    const bitmaps=new Map();for(const x of plan.filter(x=>x.node.type==='bitmap'&&!this.cache.has(x.key)))bitmaps.set(x.node.id,await this.bitmap(x.node.params.asset,flat));
    const encoder=this.device.createCommandEncoder({label:'Material DAG evaluation'}),results=new Map(),uniforms=[];
    let computed=0,hits=0;
    for(const item of plan){
      let entry=this.cache.get(item.key);
      if(entry){entry.used=++this.tick;hits++;results.set(item.node.id,entry);continue;}
      entry={...this.allocate(item.size),key:item.key,used:++this.tick};this.bytes+=item.size**2*8;
      const buffers=[0,1,2,3].map(i=>item.inputs[i]?results.get(item.inputs[i]):(i===2&&item.node.type==='blend'?this.white:this.black));
      if(item.node.type==='bitmap')buffers[0]=bitmaps.get(item.node.id);
      const uniform=this.device.createBuffer({size:256,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.device.queue.writeBuffer(uniform,0,packParams(item.node,flat.seed));uniforms.push(uniform);
      const group=this.device.createBindGroup({layout:this.layout,entries:buffers.map((b,binding)=>({binding,resource:b.view})).concat([{binding:4,resource:entry.view},{binding:5,resource:{buffer:uniform}},{binding:6,resource:this.sampler}])});
      const pass=encoder.beginComputePass({label:item.node.label});pass.setPipeline(await this.pipeline(item.node.type));pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(item.size/8),Math.ceil(item.size/8));pass.end();
      this.cache.set(item.key,entry);results.set(item.node.id,entry);computed++;
    }
    this.device.queue.submit([encoder.finish()]);await this.device.queue.onSubmittedWorkDone();uniforms.forEach(b=>b.destroy());this.prune(pinned);
    for(const [key,asset]of this.assets){if(this.assetBytes<=128*1024*1024)break;this.assets.delete(key);this.assetBytes-=asset.bytes;asset.texture.destroy();}
    this.stats={computed,hits,ms:performance.now()-start,bytes:this.bytes,poolBytes:this.poolBytes,nodes:plan.length};return results;
  }
  async read(entry){
    const {size,texture}=entry;const stride=Math.ceil(size*8/256)*256,buffer=this.device.createBuffer({size:stride*size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const enc=this.device.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer,bytesPerRow:stride},[size,size]);this.device.queue.submit([enc.finish()]);
    try{await buffer.mapAsync(GPUMapMode.READ);const src=new Uint16Array(buffer.getMappedRange()),data=new Float32Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size*4;x++)data[y*size*4+x]=halfToFloat(src[y*stride/2+x]);return {data,size};}finally{buffer.unmap();buffer.destroy();}
  }
  clear(){for(const entry of this.cache.values())entry.texture.destroy();for(const list of this.pool.values())list.forEach(t=>t.destroy());for(const entry of this.assets.values())entry.texture.destroy();this.cache.clear();this.pool.clear();this.assets.clear();this.assetBytes=0;this.bytes=0;this.poolBytes=0;}
}

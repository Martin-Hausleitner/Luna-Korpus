import {DISPLAY_SHADER,PBR_SHADER} from '../gpu/shaders.js';
import {linearToSrgb,CHANNELS} from '../core/registry.js';
import {toRGBA8} from '../core/export.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class Preview {
  constructor(engine,canvas3d,canvas2d){this.engine=engine;this.c3=canvas3d;this.c2=canvas2d;this.state={yaw:.45,pitch:.2,distance:3.2,exposure:0,tiling:1,mesh:0,environment:0,rotation:0,normalY:1};this.flat={zoom:1,offset:[0,0],tiling:0,mode:0};this.maps={...engine.defaults};this.selected=this.maps.baseColor;this.dirty=true;this.setupInteractions();}
  async init(){
    if(this.engine.kind==='WebGPU'){
      const d=this.engine.device;this.format=navigator.gpu.getPreferredCanvasFormat();
      this.ctx3=this.c3.getContext('webgpu');this.ctx2=this.c2.getContext('webgpu');for(const ctx of [this.ctx3,this.ctx2])ctx.configure({device:d,format:this.format,alphaMode:'opaque'});
      const create=async code=>{const module=d.createShaderModule({code}),info=await module.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>`${m.lineNum}: ${m.message}`).join('\n'));return d.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});};
      this.pbr=await create(PBR_SHADER);this.display=await create(DISPLAY_SHADER);
      this.u3=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.u2=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    }else{this.ctx3=this.c3.getContext('2d');this.ctx2=this.c2.getContext('2d');}
    this.observer=new ResizeObserver(()=>this.invalidate());this.observer.observe(this.c3.parentElement);this.observer.observe(this.c2.parentElement);this.invalidate();
  }
  setupInteractions(){
    let drag=null;
    this.c3.addEventListener('pointerdown',e=>{this.c3.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,yaw:this.state.yaw,pitch:this.state.pitch};});
    this.c3.addEventListener('pointermove',e=>{if(drag){this.state.yaw=drag.yaw-(e.clientX-drag.x)*.009;this.state.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.009,-1.4,1.4);this.invalidate();}});
    this.c3.addEventListener('pointerup',()=>drag=null);this.c3.addEventListener('pointercancel',()=>drag=null);
    this.c3.addEventListener('wheel',e=>{e.preventDefault();this.state.distance=clamp(this.state.distance*Math.exp(e.deltaY*.001),1.8,8);this.invalidate();},{passive:false});
    this.c3.addEventListener('dblclick',()=>{this.state.yaw=.45;this.state.pitch=.2;this.state.distance=3.2;this.invalidate();});
    let pan=null;this.c2.addEventListener('pointerdown',e=>{this.c2.setPointerCapture(e.pointerId);pan={x:e.clientX,y:e.clientY,offset:[...this.flat.offset]};});
    this.c2.addEventListener('pointermove',e=>{if(pan){this.flat.offset=[pan.offset[0]+e.clientX-pan.x,pan.offset[1]+e.clientY-pan.y];this.invalidate();}});this.c2.addEventListener('pointerup',()=>pan=null);this.c2.addEventListener('pointercancel',()=>pan=null);
    this.c2.addEventListener('wheel',e=>{e.preventDefault();const old=this.flat.zoom,next=clamp(old*Math.exp(-e.deltaY*.001),.2,10),r=this.c2.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;this.flat.offset=[x-(x-this.flat.offset[0])*next/old,y-(y-this.flat.offset[1])*next/old];this.flat.zoom=next;this.invalidate();},{passive:false});
    this.c2.addEventListener('dblclick',()=>{this.flat.zoom=1;this.flat.offset=[0,0];this.invalidate();});
  }
  setMaps(maps,selected,space='srgb'){this.maps={...this.engine.defaults,...maps};this.selected=selected||this.maps.baseColor;this.flat.mode=space==='srgb'?0:1;this.invalidate();}
  invalidate(){if(this.scheduled)return;this.scheduled=true;requestAnimationFrame(()=>{this.scheduled=false;try{this.render();}catch(e){console.error(e);}});}
  resize(canvas,software=false){const r=canvas.parentElement.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),scale=software?Math.min(1,400/Math.max(r.width,r.height)):dpr;const width=Math.max(1,Math.round(r.width*scale)),height=Math.max(1,Math.round(r.height*scale));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}return scale;}
  render(){if(!this.ctx3)return;if(this.engine.kind!=='WebGPU'){this.renderCPU();return;}const scale3=this.resize(this.c3),scale2=this.resize(this.c2),d=this.engine.device,s=this.state;
    const v3=new Float32Array([this.c3.width,this.c3.height,s.yaw,s.pitch,s.distance,s.exposure,s.tiling,s.mesh,s.environment,s.rotation,s.normalY,0]);
    d.queue.writeBuffer(this.u3,0,v3);d.queue.writeBuffer(this.u2,0,new Float32Array([this.c2.width,this.c2.height,this.flat.zoom,this.flat.mode,...this.flat.offset.map(x=>x*scale2),this.flat.tiling,0]));
    const group3=d.createBindGroup({layout:this.pbr.getBindGroupLayout(0),entries:['baseColor','normal','roughness','metallic','ao'].map((k,binding)=>({binding,resource:this.maps[k].view})).concat([{binding:5,resource:this.engine.sampler},{binding:6,resource:{buffer:this.u3}}])});
    const group2=d.createBindGroup({layout:this.display.getBindGroupLayout(0),entries:[{binding:0,resource:this.selected.view},{binding:1,resource:this.engine.sampler},{binding:2,resource:{buffer:this.u2}}]});
    const encoder=d.createCommandEncoder();for(const [ctx,pipeline,group]of [[this.ctx3,this.pbr,group3],[this.ctx2,this.display,group2]]){const pass=encoder.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:{r:.08,g:.08,b:.09,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();}d.queue.submit([encoder.finish()]);
  }
  renderCPU(){
    this.resize(this.c3,true);const ratio=this.resize(this.c2),c=this.ctx2,w=this.c2.width,h=this.c2.height,e=this.selected;
    c.fillStyle='#151618';c.fillRect(0,0,w,h);
    const off=document.createElement('canvas');off.width=off.height=e.size;off.getContext('2d').putImageData(new ImageData(toRGBA8(e.data,this.flat.mode===0?'srgb':'linear'),e.size,e.size),0,0);
    const extent=Math.min(w,h)*.88*this.flat.zoom,ox=this.flat.offset[0]*ratio,oy=this.flat.offset[1]*ratio;
    if(this.flat.tiling){c.save();c.translate(w/2+ox,h/2+oy);c.scale(extent/e.size,extent/e.size);c.translate(-e.size/2,-e.size/2);c.fillStyle=c.createPattern(off,'repeat');c.fillRect(-w*e.size/extent,-h*e.size/extent,3*w*e.size/extent,3*h*e.size/extent);c.restore();}else c.drawImage(off,(w-extent)/2+ox,(h-extent)/2+oy,extent,extent);
    this.softwarePBR();
  }
  softwarePBR(){
    const w=this.c3.width,h=this.c3.height,out=this.ctx3.createImageData(w,h),s=this.state;
    const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);},dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const ro=[Math.sin(s.yaw)*Math.cos(s.pitch)*s.distance,Math.sin(s.pitch)*s.distance,Math.cos(s.yaw)*Math.cos(s.pitch)*s.distance],forward=norm(ro.map(x=>-x)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward),light=norm([-.7,1,1.2]),fill=norm([1,.4,-.8]);
    const sample=(k,u,v)=>{const e=this.maps[k],x=Math.floor(((u%1+1)%1)*e.size),y=Math.floor(((v%1+1)%1)*e.size),i=(y*e.size+x)*4;return [e.data[i],e.data[i+1],e.data[i+2]];};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const qx=(2*x-w)/h,qy=(2*y-h)/h,rd=norm(forward.map((v,i)=>v*2.25+right[i]*qx-up[i]*qy));let t=-1,n,uv,tangent,bitangent;
      if(s.mesh===0){const b=dot(ro,rd),det=b*b-dot(ro,ro)+1;if(det>0){t=-b-Math.sqrt(det);if(t>0){n=norm(ro.map((v,i)=>v+rd[i]*t));uv=[Math.atan2(n[2],n[0])/(2*Math.PI)+.5+s.rotation,Math.acos(clamp(n[1],-1,1))/Math.PI];tangent=Math.hypot(n[0],n[2])<.001?[1,0,0]:norm([-n[2],0,n[0]]);bitangent=norm(cross(tangent,n));}}}
      else if(s.mesh===1){const lo=ro.map((v,i)=>(-.78-v)/rd[i]),hi=ro.map((v,i)=>(.78-v)/rd[i]),near=Math.max(...lo.map((v,i)=>Math.min(v,hi[i]))),far=Math.min(...lo.map((v,i)=>Math.max(v,hi[i])));if(far>Math.max(near,0)){t=near;const p=ro.map((v,i)=>v+rd[i]*t),a=p.map(Math.abs);if(a[0]>a[1]&&a[0]>a[2]){n=[Math.sign(p[0]),0,0];uv=[p[2]/1.56+.5,.5-p[1]/1.56];tangent=[0,0,1];bitangent=[0,1,0];}else if(a[1]>a[2]){n=[0,Math.sign(p[1]),0];uv=[p[0]/1.56+.5,.5-p[2]/1.56];tangent=[1,0,0];bitangent=[0,0,1];}else{n=[0,0,Math.sign(p[2])];uv=[p[0]/1.56+.5,.5-p[1]/1.56];tangent=[1,0,0];bitangent=[0,1,0];}}}
      else{const hit=-ro[2]/rd[2],p=ro.map((v,i)=>v+rd[i]*hit);if(hit>0&&Math.abs(p[0])<1&&Math.abs(p[1])<1){t=hit;n=[0,0,1];uv=[p[0]*.5+.5,-p[1]*.5+.5];tangent=[1,0,0];bitangent=[0,1,0];}}
      let color=[.07,.078,.087].map(v=>v*(1-clamp(Math.hypot(qx,qy)/3)*.3));
      if(t>0){const u=uv[0]*s.tiling,v=uv[1]*s.tiling,a=sample('baseColor',u,v),nm=sample('normal',u,v).map(c=>c*2-1);nm[1]*=s.normalY;n=norm(n.map((c,i)=>c*nm[2]+tangent[i]*nm[0]+bitangent[i]*nm[1]));const rough=clamp(sample('roughness',u,v)[0],.06,1),metal=sample('metallic',u,v)[0],ao=sample('ao',u,v)[0],view=rd.map(c=>-c),nv=Math.max(.001,dot(n,view));color=[0,0,0];
        for(const [l,radiance]of [[light,[3.3,2.85,2.4]],[fill,[1.3,1.8,2.5]]]){const half=norm(view.map((v,i)=>v+l[i])),nl=Math.max(0,dot(n,l)),nh=Math.max(0,dot(n,half)),vh=Math.max(0,dot(view,half)),a2=rough**4,den=nh*nh*(a2-1)+1,ndf=a2/(Math.PI*den*den+.00001),k=(rough+1)**2/8,g=nv/(nv*(1-k)+k)*nl/(nl*(1-k)+k);for(let c=0;c<3;c++){const f0=.04*(1-metal)+a[c]*metal,f=f0+(1-f0)*(1-vh)**5;const spec=ndf*g*f/(4*nv*nl+.0001);color[c]+=((1-f)*(1-metal)*a[c]/Math.PI+spec)*radiance[c]*nl;}}
        color=color.map((value,i)=>{let v=(value+(a[i]*(1-metal)*.25+(.04*(1-metal)+a[i]*metal)*.7)*ao)*2**s.exposure;v=clamp(v*(2.51*v+.03)/(v*(2.43*v+.59)+.14));return linearToSrgb(v);});
      }
      const i=(y*w+x)*4;out.data[i]=clamp(color[0])*255;out.data[i+1]=clamp(color[1])*255;out.data[i+2]=clamp(color[2])*255;out.data[i+3]=255;
    }this.ctx3.putImageData(out,0,0);
  }
}

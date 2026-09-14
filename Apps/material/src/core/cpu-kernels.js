import {packParams} from './registry.js';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const hashFloat=new Float32Array(1),hashUint=new Uint32Array(hashFloat.buffer);
function floatBits(x){hashFloat[0]=x;return hashUint[0];}
function hash(x,y,seed){let h=(Math.imul(floatBits(x),0x9e3779b9)^Math.imul(floatBits(y),0x85ebca6b)^floatBits(seed))>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>8)/16777216;}
const mod=(x,n)=>((x%n)+n)%n;
function noise(x,y,period,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return mix(mix(hash(mod(ix,period),mod(iy,period),seed),hash(mod(ix+1,period),mod(iy,period),seed),u),mix(hash(mod(ix,period),mod(iy+1,period),seed),hash(mod(ix+1,period),mod(iy+1,period),seed),u),v);}
function fbm(x,y,scale,octaves,persistence,seed){let sum=0,amplitude=1,norm=0;for(let i=0;i<octaves;i++){sum+=amplitude*noise(x*scale,y*scale,scale,seed+i*13);norm+=amplitude;amplitude*=persistence;scale*=2;}return sum/norm;}
const gray=x=>[x,x,x,1];
const srgb=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export function sample(entry,u,v){
  if(!entry)return [0,0,0,1];const {data,size}=entry,w=entry.width||size,h=entry.height||size;
  const px=fract(u)*w-.5,py=fract(v)*h-.5,x=Math.floor(px),y=Math.floor(py),a=fract(px),b=fract(py);
  const i=(mod(y,h)*w+mod(x,w))*4,j=(mod(y,h)*w+mod(x+1,w))*4,k=(mod(y+1,h)*w+mod(x,w))*4,l=(mod(y+1,h)*w+mod(x+1,w))*4;
  return [0,1,2,3].map(c=>mix(mix(data[i+c],data[j+c],a),mix(data[k+c],data[l+c],a),b));
}
export function cpuEvaluate(node,inputs,size,seed=0,bitmap=null){
  const data=new Float32Array(size*size*4),packed=packParams(node,seed),p=i=>packed[i*4],v=i=>Array.from(packed.slice(i*4,i*4+4));
  const A=(u,w)=>sample(node.type==='bitmap'?bitmap:inputs[0],u,w),B=(u,w)=>sample(inputs[1],u,w),C=(u,w)=>inputs[2]?sample(inputs[2],u,w):[1,1,1,1];
  function pixel(u,w){
    switch(node.type){
      case 'noise':return gray(clamp((fbm(u,w,p(0),p(1),p(2),p(3)+seed)-.5)*p(4)+.5));
      case 'clouds':return gray(smooth(.16,.84,fbm(u,w,p(0),6,p(2),p(1)+seed)));
      case 'cells':{const scale=p(0),x=u*scale,y=w*scale,cx=Math.floor(x),cy=Math.floor(y);let first=10,second=10,nearest=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const gx=cx+i,gy=cy+j,h=hash(mod(gx,scale),mod(gy,scale),p(2)+seed),h2=hash(mod(gx,scale)+43,mod(gy,scale)+43,p(2)+seed),d=Math.hypot(x-gx-mix(.5,h,p(1)),y-gy-mix(.5,h2,p(1)));if(d<first){second=first;first=d;nearest=h;}else second=Math.min(second,d);}return gray(p(3)>1.5?nearest:p(3)>.5?clamp((second-first)*2):clamp(first));}
      case 'bricks':{const row=Math.floor(w*p(1)),x=u*p(0)+(row%2===1?p(4):0),y=w*p(1),fx=fract(x),fy=fract(y),edge=Math.min(fx,1-fx,fy,1-fy);return gray(smooth(p(2),p(2)+Math.max(p(3),.001),edge)*(1-p(5)*hash(mod(Math.floor(x),Math.max(p(0),p(1))),mod(Math.floor(y),Math.max(p(0),p(1))),p(6)+seed)));}
      case 'tiles':{const x=u*p(0),y=w*p(0),fx=fract(x),fy=fract(y),edge=Math.min(fx,1-fx,fy,1-fy);return gray(smooth(p(1),p(1)+Math.max(p(2),.001),edge)*(1-p(3)*hash(Math.floor(x),Math.floor(y),p(4)+seed)));}
      case 'checker':return gray((Math.floor(u*p(0))+Math.floor(w*p(0)))%2);
      case 'dots':{const x=u*p(0),y=w*p(0),cx=Math.floor(x),cy=Math.floor(y),dx=Math.abs(fract(x)-.5-(hash(cx,cy,p(4)+seed)-.5)*p(3)*.6),dy=Math.abs(fract(y)-.5-(hash(cx+17,cy+17,p(4)+seed)-.5)*p(3)*.6);return gray(1-smooth(p(1)-p(2),p(1)+p(2),p(5)>1.5?dx+dy:p(5)>.5?Math.max(dx,dy):Math.hypot(dx,dy)));}
      case 'gradient':{const a=p(0)*Math.PI/180,t=p(2)>1.5?Math.atan2(w-.5,u-.5)/(Math.PI*2)+.5:p(2)>.5?Math.hypot(u-.5,w-.5)*Math.SQRT2:(u-.5)*Math.cos(a)+(w-.5)*Math.sin(a)+.5;return gray(fract(t*p(1)));}
      case 'value':return gray(p(0));case 'color':return v(0);case 'graphInput':return gray(0);case 'boundary':return A(u,w);
      case 'bitmap':{let a=A(u,w);if(p(1)<.5)a=a.map((x,i)=>i<3?srgb(x):x);return p(2)>.5&&p(2)<1.5?gray(a[0]*.2126+a[1]*.7152+a[2]*.0722):a;}
      case 'blend':{const a=A(u,w),b=B(u,w),t=p(1)*C(u,w)[0];return [0,1,2].map(i=>{let out=b[i];switch(p(0)){case 0:out=a[i]*b[i];break;case 1:out=a[i]+b[i];break;case 2:out=a[i]-b[i];break;case 3:out=1-(1-a[i])*(1-b[i]);break;case 4:out=a[i]<.5?2*a[i]*b[i]:1-2*(1-a[i])*(1-b[i]);break;case 5:out=Math.max(a[i],b[i]);break;case 6:out=Math.min(a[i],b[i]);break;}return clamp(mix(a[i],out,t));}).concat(1);}
      case 'levels':return A(u,w).slice(0,3).map(x=>mix(p(3),p(4),clamp((x-p(0))/Math.max(p(1)-p(0),.001))**(1/p(2)))).concat(1);
      case 'invert':return A(u,w).slice(0,3).map(x=>1-x).concat(1);
      case 'grayscale':{const a=A(u,w);return gray(a[0]*.2126+a[1]*.7152+a[2]*.0722);}
      case 'threshold':return gray(smooth(p(0)-p(1)*.5,p(0)+p(1)*.5,A(u,w)[0]));
      case 'gradientMap':{const x=A(u,w)[0],m=p(3),a=x>m?v(1):v(0),b=x>m?v(2):v(1),t=x>m?clamp((x-m)/(1-m)):clamp(x/m);return a.map((c,i)=>mix(c,b[i],t));}
      case 'blur':{const sum=[0,0,0,0];let weight=0;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const f=Math.exp(-(i*i+j*j)*.5),a=A(u+i*p(0)*.005,w+j*p(0)*.005);for(let c=0;c<4;c++)sum[c]+=a[c]*f;weight+=f;}return sum.map(x=>x/weight);}
      case 'warp':{const a=p(1)*Math.PI/180,d=(B(u,w)[0]-.5)*p(0);return A(u+Math.cos(a)*d,w+Math.sin(a)*d);}
      case 'transform':{const a=p(1)*Math.PI/180,x=(u-.5)*p(0),y=(w-.5)*p(0);return A(x*Math.cos(a)-y*Math.sin(a)+.5+p(2),x*Math.sin(a)+y*Math.cos(a)+.5+p(3));}
      case 'normal':{const s=1/(inputs[0]?.size||size),dx=(A(u+s,w)[0]-A(u-s,w)[0])/(2*s),dy=(A(u,w+s)[0]-A(u,w-s)[0])/(2*s),x=-dx*p(0)*.025,y=dy*p(0)*.025*(p(1)>.5?-1:1),l=Math.hypot(x,y,1);return [x/l*.5+.5,y/l*.5+.5,1/l*.5+.5,1];}
      case 'ao':{const h=A(u,w)[0];let occ=0;for(let i=0;i<8;i++){const a=i*Math.PI*.25,x=Math.cos(a)*p(0)*.01,y=Math.sin(a)*p(0)*.01;occ+=Math.max(0,A(u+x,w+y)[0]-h)+Math.max(0,A(u+x*.5,w+y*.5)[0]-h);}return gray(clamp(1-occ*p(1)/8));}
      default:throw new Error(`No CPU kernel: ${node.type}`);
    }
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)data.set(pixel((x+.5)/size,(y+.5)/size),(y*size+x)*4);
  return {data,size};
}

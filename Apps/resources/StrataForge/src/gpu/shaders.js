/** Generated WGSL: shared ABI, type-specific compute bodies, no per-pixel JS on WebGPU. */
export const COMMON = /* wgsl */`
const PI: f32 = 3.141592653589793;
fn hash21(p: vec2f, seed: f32) -> f32 {
  var h=(bitcast<u32>(p.x)*0x9e3779b9u) ^ (bitcast<u32>(p.y)*0x85ebca6bu) ^ bitcast<u32>(seed);
  h ^= h >> 16u; h *= 0x7feb352du; h ^= h >> 15u; h *= 0x846ca68bu; h ^= h >> 16u;
  return f32(h >> 8u)*(1.0/16777216.0);
}
fn wrap(p:vec2f,period:f32)->vec2f{return p-floor(p/period)*period;}
fn noise2(p:vec2f,period:f32,seed:f32)->f32 {
  let i=floor(p);let f=fract(p);let u=f*f*(3.0-2.0*f);
  let a=hash21(wrap(i,period),seed);let b=hash21(wrap(i+vec2f(1,0),period),seed);
  let c=hash21(wrap(i+vec2f(0,1),period),seed);let d=hash21(wrap(i+vec2f(1,1),period),seed);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
fn fbm(uv:vec2f,scale:f32,octaves:i32,persistence:f32,seed:f32)->f32 {
  var value=0.0;var amplitude=1.0;var norm=0.0;var frequency=scale;
  for(var i=0;i<8;i++){if(i>=octaves){break;}value+=amplitude*noise2(uv*frequency,frequency,seed+f32(i)*13.0);norm+=amplitude;amplitude*=persistence;frequency*=2.0;}
  return value/norm;
}
fn sRGBToLinear(c:vec3f)->vec3f{return select(pow((c+0.055)/1.055,vec3f(2.4)),c/12.92,c<=vec3f(0.04045));}
fn linearToSRGB(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-0.055,c*12.92,c<=vec3f(0.0031308));}
fn gray(x:f32)->vec4f{return vec4f(x,x,x,1);}
`;
const BODIES = {
 noise:`let v=fbm(uv,P(0),i32(P(1)),P(2),P(3)+P(15));return gray(clamp((v-0.5)*P(4)+0.5,0.0,1.0));`,
 clouds:`let v=fbm(uv,P(0),6,P(2),P(1)+P(15));return gray(smoothstep(0.16,0.84,v));`,
 cells:`let scale=P(0);let pos=uv*scale;let cell=floor(pos);var first=10.0;var second=10.0;var nearest=0.0;
 for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){let g=cell+vec2f(f32(x),f32(y));let w=wrap(g,scale);let h=hash21(w,P(2)+P(15));let h2=hash21(w+43.0,P(2)+P(15));let point=g+mix(vec2f(0.5),vec2f(h,h2),P(1));let d=length(pos-point);if(d<first){second=first;first=d;nearest=h;}else{second=min(second,d);}}}
 if(P(3)>1.5){return gray(nearest);}if(P(3)>0.5){return gray(clamp((second-first)*2.0,0.0,1.0));}return gray(clamp(first,0.0,1.0));`,
 bricks:`let rows=P(1);let row=floor(uv.y*rows);let q=vec2f(uv.x*P(0)+select(0.0,P(4),i32(row)%2==1),uv.y*rows);let f=fract(q);let edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));let mortar=smoothstep(P(2),P(2)+max(P(3),0.001),edge);let variation=1.0-P(5)*hash21(wrap(floor(q),max(P(0),P(1))),P(6)+P(15));return gray(mortar*variation);`,
 tiles:`let q=uv*P(0);let f=fract(q);let edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));let mask=smoothstep(P(1),P(1)+max(P(2),0.001),edge);return gray(mask*(1.0-P(3)*hash21(floor(q),P(4)+P(15))));`,
 checker:`let q=vec2i(floor(uv*P(0)));return gray(f32((q.x+q.y)%2));`,
 dots:`let q=uv*P(0);let cell=floor(q);let jitter=(vec2f(hash21(cell,P(4)+P(15)),hash21(cell+17.0,P(4)+P(15)))-0.5)*P(3)*0.6;let f=abs(fract(q)-0.5-jitter);var d=length(f);if(P(5)>1.5){d=f.x+f.y;}else if(P(5)>0.5){d=max(f.x,f.y);}return gray(1.0-smoothstep(P(1)-P(2),P(1)+P(2),d));`,
 gradient:`let angle=P(0)*PI/180.0;var v=dot(uv-0.5,vec2f(cos(angle),sin(angle)))+0.5;if(P(2)>1.5){v=atan2(uv.y-0.5,uv.x-0.5)/(2.0*PI)+0.5;}else if(P(2)>0.5){v=length(uv-0.5)*1.41421356;}return gray(fract(v*P(1)));`,
 value:`return gray(P(0));`,
 color:`return U.values[0];`,
 graphInput:`return gray(0.0);`,
 boundary:`return A(uv);`,
 bitmap:`var v=A(uv);if(P(1)<0.5){v=vec4f(sRGBToLinear(v.rgb),v.a);}if(P(2)>0.5&&P(2)<1.5){v=gray(dot(v.rgb,vec3f(0.2126,0.7152,0.0722)));}return v;`,
 blend:`let a=A(uv);let b=B(uv);let mode=i32(P(0));var v=b;switch mode{case 0:{v=a*b;}case 1:{v=a+b;}case 2:{v=a-b;}case 3:{v=1.0-(1.0-a)*(1.0-b);}case 4:{v=select(1.0-2.0*(1.0-a)*(1.0-b),2.0*a*b,a<vec4f(0.5));}case 5:{v=max(a,b);}case 6:{v=min(a,b);}default:{}}
 return vec4f(clamp(mix(a.rgb,v.rgb,P(1)*C(uv).r),vec3f(0),vec3f(1)),1);`,
 levels:`let x=clamp((A(uv).rgb-P(0))/max(P(1)-P(0),0.001),vec3f(0),vec3f(1));return vec4f(mix(vec3f(P(3)),vec3f(P(4)),pow(x,vec3f(1.0/P(2)))),1);`,
 invert:`return vec4f(1.0-A(uv).rgb,1);`,
 grayscale:`return gray(dot(A(uv).rgb,vec3f(0.2126,0.7152,0.0722)));`,
 threshold:`return gray(smoothstep(P(0)-P(1)*0.5,P(0)+P(1)*0.5,A(uv).r));`,
 gradientMap:`let v=A(uv).r;let m=P(3);var c=mix(U.values[0].rgb,U.values[1].rgb,clamp(v/m,0.0,1.0));if(v>m){c=mix(U.values[1].rgb,U.values[2].rgb,clamp((v-m)/(1.0-m),0.0,1.0));}return vec4f(c,1);`,
 blur:`var sum=vec4f(0);var weight=0.0;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let w=exp(-f32(x*x+y*y)*0.5);sum+=A(uv+vec2f(f32(x),f32(y))*P(0)*0.005)*w;weight+=w;}}return sum/weight;`,
 warp:`let angle=P(1)*PI/180.0;return A(uv+vec2f(cos(angle),sin(angle))*(B(uv).r-0.5)*P(0));`,
 transform:`let a=P(1)*PI/180.0;let q=(uv-0.5)*P(0);return A(vec2f(q.x*cos(a)-q.y*sin(a),q.x*sin(a)+q.y*cos(a))+0.5+vec2f(P(2),P(3)));`,
 normal:`let texel=1.0/vec2f(textureDimensions(texA));let dx=(A(uv+vec2f(texel.x,0)).r-A(uv-vec2f(texel.x,0)).r)/(2.0*texel.x);let dy=(A(uv+vec2f(0,texel.y)).r-A(uv-vec2f(0,texel.y)).r)/(2.0*texel.y);let signY=select(1.0,-1.0,P(1)>0.5);let n=normalize(vec3f(-dx*P(0)*0.025,dy*P(0)*0.025*signY,1));return vec4f(n*0.5+0.5,1);`,
 ao:`let h=A(uv).r;var occ=0.0;for(var i=0;i<8;i++){let angle=f32(i)*PI*0.25;let q=vec2f(cos(angle),sin(angle))*P(0)*0.01;occ+=max(0.0,A(uv+q).r-h);occ+=max(0.0,A(uv+q*0.5).r-h);}return gray(clamp(1.0-occ*P(1)/8.0,0.0,1.0));`,
};
export function computeShader(type) {
  const body=BODIES[type];if(!body)throw new Error(`No compute shader for ${type}`);
  return `${COMMON}
struct Uniforms {values:array<vec4f,16>};
@group(0) @binding(0) var texA:texture_2d<f32>;
@group(0) @binding(1) var texB:texture_2d<f32>;
@group(0) @binding(2) var texC:texture_2d<f32>;
@group(0) @binding(3) var texD:texture_2d<f32>;
@group(0) @binding(4) var result:texture_storage_2d<rgba16float,write>;
@group(0) @binding(5) var<uniform> U:Uniforms;
@group(0) @binding(6) var smp:sampler;
fn P(i:u32)->f32{return U.values[i].x;}
fn A(uv:vec2f)->vec4f{return textureSampleLevel(texA,smp,uv,0);}
fn B(uv:vec2f)->vec4f{return textureSampleLevel(texB,smp,uv,0);}
fn C(uv:vec2f)->vec4f{return textureSampleLevel(texC,smp,uv,0);}
fn D(uv:vec2f)->vec4f{return textureSampleLevel(texD,smp,uv,0);}
fn evaluate(uv:vec2f)->vec4f{${body}}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id:vec3u){let dims=textureDimensions(result);if(any(id.xy>=dims)){return;}let uv=(vec2f(id.xy)+0.5)/vec2f(dims);textureStore(result,vec2i(id.xy),evaluate(uv));}
`;
}
export const DISPLAY_SHADER = /* wgsl */`
${COMMON}
struct Settings {size:vec2f,zoom:f32,mode:f32,offset:vec2f,tiling:f32,exposure:f32};
@group(0) @binding(0) var img:texture_2d<f32>;
@group(0) @binding(1) var smp:sampler;
@group(0) @binding(2) var<uniform> s:Settings;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn fs(@builtin(position)p:vec4f)->@location(0)vec4f{
 let extent=min(s.size.x,s.size.y)*0.88*s.zoom;let uv=(p.xy-s.size*0.5-s.offset)/extent+0.5;
 if(s.tiling<0.5&&any(abs(uv-0.5)>vec2f(0.5))){let bg=select(0.078,0.085,(i32(p.x/12)+i32(p.y/12))%2==0);return vec4f(vec3f(bg),1);}
 var c=textureSampleLevel(img,smp,uv,0).rgb;if(s.mode<0.5){c=linearToSRGB(c);}return vec4f(clamp(c,vec3f(0),vec3f(1)),1);
}
`;
/** Analytic sphere/cube/plane intersection, tangent normal maps, GGX/Smith/Schlick direct lights and procedural studio IBL. */
export const PBR_SHADER = /* wgsl */`
${COMMON}
struct Scene {size:vec2f,yaw:f32,pitch:f32,distance:f32,exposure:f32,tiling:f32,mesh:f32,environment:f32,rotation:f32,normalY:f32,pad:f32};
@group(0) @binding(0) var baseMap:texture_2d<f32>;
@group(0) @binding(1) var normalMap:texture_2d<f32>;
@group(0) @binding(2) var roughMap:texture_2d<f32>;
@group(0) @binding(3) var metalMap:texture_2d<f32>;
@group(0) @binding(4) var aoMap:texture_2d<f32>;
@group(0) @binding(5) var smp:sampler;
@group(0) @binding(6) var<uniform> s:Scene;
fn studio(d:vec3f,rough:f32)->vec3f{
 let sun=pow(max(0.0,dot(d,normalize(vec3f(-0.7,0.95,0.8)))),mix(160.0,2.0,rough*rough));
 let strip=pow(max(0.0,dot(d,normalize(vec3f(0.9,0.4,-0.3)))),mix(220.0,3.0,rough*rough));
 let top=smoothstep(-0.4,0.9,d.y);
 let cool=mix(vec3f(0.095,0.12,0.16),vec3f(0.56,0.68,0.84),top);
 let warm=mix(vec3f(0.1,0.095,0.085),vec3f(0.7,0.65,0.56),top);
 let bg=mix(warm,cool,s.environment);
 return bg+vec3f(1.0,0.91,0.79)*sun*5.0+vec3f(0.68,0.83,1.0)*strip*3.0;
}
fn fresnel(cosTheta:f32,f0:vec3f)->vec3f{return f0+(1.0-f0)*pow(clamp(1.0-cosTheta,0.0,1.0),5.0);}
fn light(n:vec3f,v:vec3f,l:vec3f,radiance:vec3f,albedo:vec3f,rough:f32,metal:f32)->vec3f{
 let h=normalize(v+l);let nv=max(dot(n,v),0.001);let nl=max(dot(n,l),0.0);let nh=max(dot(n,h),0.0);let vh=max(dot(v,h),0.0);
 let a=rough*rough;let a2=a*a;let den=nh*nh*(a2-1.0)+1.0;let ndf=a2/(PI*den*den+0.00001);
 let k=(rough+1.0)*(rough+1.0)/8.0;let g=(nv/(nv*(1.0-k)+k))*(nl/(nl*(1.0-k)+k));
 let f=fresnel(vh,mix(vec3f(0.04),albedo,metal));let spec=ndf*g*f/(4.0*nv*nl+0.0001);let kd=(1.0-f)*(1.0-metal);
 return (kd*albedo/PI+spec)*radiance*nl;
}
fn aces(x:vec3f)->vec3f{return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),vec3f(0),vec3f(1));}
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn fs(@builtin(position)pixel:vec4f)->@location(0)vec4f{
 let q=(2.0*pixel.xy-s.size)/s.size.y;let origin=vec3f(sin(s.yaw)*cos(s.pitch),sin(s.pitch),cos(s.yaw)*cos(s.pitch))*s.distance;
 let forward=normalize(-origin);let right=normalize(cross(forward,vec3f(0,1,0)));let up=cross(right,forward);
 let ray=normalize(forward*2.25+right*q.x-up*q.y);
 var t=-1.0;var n=vec3f(0,1,0);var uv=vec2f(0);var tangent=vec3f(1,0,0);var bitangent=vec3f(0,0,1);
 if(s.mesh<0.5){let b=dot(origin,ray);let c=dot(origin,origin)-1.0;let det=b*b-c;if(det>0.0){t=-b-sqrt(det);if(t>0.0){let p=origin+ray*t;n=normalize(p);uv=vec2f(atan2(n.z,n.x)/(2.0*PI)+0.5+s.rotation,acos(clamp(n.y,-1.0,1.0))/PI);let pole=vec3f(-n.z,0,n.x);tangent=vec3f(1,0,0);if(dot(pole,pole)>0.000001){tangent=normalize(pole);}bitangent=normalize(cross(tangent,n));}}}
 else if(s.mesh<1.5){let safeRay=select(ray,vec3f(0.00000001),abs(ray)<vec3f(0.00000001));let inv=1.0/safeRay;let lo=(-vec3f(0.78)-origin)*inv;let hi=(vec3f(0.78)-origin)*inv;let mn=min(lo,hi);let mx=max(lo,hi);let near=max(max(mn.x,mn.y),mn.z);let far=min(min(mx.x,mx.y),mx.z);if(far>max(near,0.0)){t=near;let p=origin+ray*t;let a=abs(p);if(a.x>a.y&&a.x>a.z){n=vec3f(sign(p.x),0,0);uv=p.zy/1.56+0.5;tangent=vec3f(0,0,1);bitangent=vec3f(0,1,0);}else if(a.y>a.z){n=vec3f(0,sign(p.y),0);uv=p.xz/1.56+0.5;tangent=vec3f(1,0,0);bitangent=vec3f(0,0,1);}else{n=vec3f(0,0,sign(p.z));uv=p.xy/1.56+0.5;tangent=vec3f(1,0,0);bitangent=vec3f(0,1,0);}uv.y=1.0-uv.y;}}
 else {if(abs(ray.z)>0.0001){let hit=-origin.z/ray.z;let p=origin+ray*hit;if(hit>0.0&&abs(p.x)<1.0&&abs(p.y)<1.0){t=hit;n=vec3f(0,0,1);uv=vec2f(p.x,-p.y)*0.5+0.5;tangent=vec3f(1,0,0);bitangent=vec3f(0,1,0);}}}
 var result=vec3f(0.045,0.05,0.057)+(1.0-length(q)*0.2)*0.035;
 if(t>0.0){uv*=s.tiling;let albedo=textureSampleLevel(baseMap,smp,uv,0).rgb;let rough=clamp(textureSampleLevel(roughMap,smp,uv,0).r,0.06,1.0);let metal=textureSampleLevel(metalMap,smp,uv,0).r;let ao=textureSampleLevel(aoMap,smp,uv,0).r;
 var nm=textureSampleLevel(normalMap,smp,uv,0).xyz*2.0-1.0;nm.y*=s.normalY;n=normalize(tangent*nm.x+bitangent*nm.y+n*nm.z);let v=-ray;
 let key=normalize(vec3f(-0.7,1.0,1.2));let fill=normalize(vec3f(1.0,0.4,-0.8));
 var color=light(n,v,key,vec3f(3.3,2.85,2.4),albedo,rough,metal)+light(n,v,fill,vec3f(1.3,1.8,2.5),albedo,rough,metal);
 let f0=mix(vec3f(0.04),albedo,metal);let f=fresnel(max(dot(n,v),0.0),f0);let env=studio(reflect(-v,n),rough);
 color+=((1.0-metal)*albedo*studio(n,1.0)*0.42+env*f*(1.0-rough*0.45))*ao;
 result=linearToSRGB(aces(color*exp2(s.exposure)));
 }else{let ground=(-1.14-origin.y)/ray.y;if(ground>0.0){let p=origin+ground*ray;let shadow=exp(-dot(p.xz,p.xz)*1.5)*0.38;let grid=pow(max(0.0,1.0-abs(fract(p.x*0.8)-0.5)*50.0),2.0)+pow(max(0.0,1.0-abs(fract(p.z*0.8)-0.5)*50.0),2.0);result=mix(result,vec3f(0.075)+grid*0.012,0.35)* (1.0-shadow);}let vignette=1.0-smoothstep(0.3,2.0,length(q))*0.3;result*=vignette;}
 return vec4f(result,1);
}
`;

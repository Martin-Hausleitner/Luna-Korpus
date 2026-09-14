import {createProject,createNode,uid} from './graph.js';
export const PRESETS=[{id:'copper',name:'Oxidized Copper',tag:'METAL · WEATHERED',desc:'Layered verdigris over warm, exposed copper.'},{id:'brick',name:'Fired Clay',tag:'ARCHITECTURE · BRICK',desc:'Handmade brick with recessed mortar and surface grain.'},{id:'ceramic',name:'Glazed Ceramic',tag:'ARCHITECTURE · TILE',desc:'Deep blue ceramic tiles, beveled grout, subtle glaze variation.'},{id:'stone',name:'Volcanic Stone',tag:'NATURAL · STONE',desc:'Dark cellular stone with fine, porous mineral detail.'}];
export function preset(id='copper'){
  const meta=PRESETS.find(x=>x.id===id)||PRESETS[0],p=createProject(meta.name);p.description=meta.desc;
  const add=(type,x,y,params={},label)=>{const n=createNode(type,x,y,params);if(label)n.label=label;p.nodes.push(n);return n;};
  const link=(a,b,input=0)=>p.edges.push({id:uid(),from:a.id,to:b.id,input});
  if(id==='copper'){
    const coarse=add('noise',0,70,{scale:7,octaves:6,roughness:.62,contrast:1.55,seed:28},'Oxidation field');
    const fine=add('noise',0,270,{scale:36,octaves:4,roughness:.65,contrast:1.6,seed:43},'Surface grain');
    const warp=add('warp',215,70,{strength:.04,angle:37},'Organic distortion');link(coarse,warp);link(fine,warp,1);
    const mask=add('threshold',430,70,{position:.5,width:.24},'Patina coverage');link(warp,mask);
    const color=add('gradientMap',650,15,{dark:'#173e34',mid:'#4c8b72',light:'#d7985c',position:.52},'Copper / verdigris');link(mask,color);
    const height=add('blend',430,290,{mode:'multiply',opacity:.36},'Corrosion relief');link(warp,height);link(fine,height,1);
    const normal=add('normal',650,220,{strength:2.3},'Micro-surface normal');link(height,normal);
    const rough=add('levels',650,415,{low:0,high:1,gamma:1,outLow:.82,outHigh:.28},'Oxide roughness');link(mask,rough);
    const metal=add('levels',865,75,{low:.1,high:.85,gamma:1,outLow:.08,outHigh:.98},'Exposed metal');link(mask,metal);
    const ao=add('ao',865,300,{radius:1.4,strength:3},'Cavity occlusion');link(height,ao);
    p.outputs={baseColor:color.id,normal:normal.id,roughness:rough.id,metallic:metal.id,height:height.id,ao:ao.id};
    p.exposed=[{id:uid(),label:'Patina coverage',node:mask.id,param:'position'},{id:uid(),label:'Surface detail',node:normal.id,param:'strength'},{id:uid(),label:'Oxidation scale',node:coarse.id,param:'scale'}];
  } else {
    const pattern=id==='brick'?add('bricks',0,55,{columns:6,rows:9,mortar:.035,bevel:.045,variation:.25},'Brick courses'):id==='ceramic'?add('tiles',0,55,{count:7,gap:.04,bevel:.045,variation:.2},'Ceramic tiles'):add('cells',0,55,{scale:24,mode:'edges',jitter:1},'Mineral structure');
    const fine=add('noise',0,265,{scale:id==='stone'?48:32,contrast:1.8,octaves:4,seed:22},'Surface grain');
    const height=add('blend',240,135,{mode:'multiply',opacity:id==='ceramic'?.08:.35},'Surface relief');link(pattern,height);link(fine,height,1);
    const params=id==='brick'?{dark:'#4e443c',mid:'#863f26',light:'#c87a52',position:.32}:id==='ceramic'?{dark:'#25292e',mid:'#174052',light:'#397d88',position:.15}:{dark:'#111820',mid:'#323b42',light:'#626661',position:.52};
    const color=add('gradientMap',490,0,params,'Material colors');link(height,color);
    const normal=add('normal',490,195,{strength:id==='ceramic'?1.6:2.5},'Surface normal');link(height,normal);
    const rough=add('levels',490,395,{low:0,high:1,outLow:id==='ceramic'?.65:.7,outHigh:id==='ceramic'?.19:.9},'Surface roughness');link(height,rough);
    const ao=add('ao',730,195,{strength:4,radius:1.2},'Grout / cavity AO');link(height,ao);
    const metal=add('value',730,395,{value:0},'Dielectric');
    p.outputs={baseColor:color.id,normal:normal.id,roughness:rough.id,metallic:metal.id,height:height.id,ao:ao.id};
    p.exposed=[{id:uid(),label:'Surface relief',node:normal.id,param:'strength'},{id:uid(),label:'Grain blend',node:height.id,param:'opacity'}];
  }
  return p;
}

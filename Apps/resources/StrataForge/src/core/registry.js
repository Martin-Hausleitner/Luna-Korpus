/** Typed node schema. The descriptor order is also the 16-byte-slot GPU uniform ABI. */
const number = (label, value, min, max, step = .01) => ({label, value, min, max, step, type:'number'});
const color = (label, value) => ({label, value, type:'color'});
const choice = (label, value, options) => ({label, value, options, type:'select'});
const port = (name, type = 'scalar', optional = false) => ({name, type, optional});
const node = (label, category, output, inputs, params, description) => ({label, category, output, inputs, params, description});
export const REGISTRY = {
  noise: node('Fractal Noise','Generators','scalar',[],{
    scale:number('Scale',8,1,64,1),octaves:number('Octaves',5,1,8,1),roughness:number('Persistence',.55,.1,.95),seed:number('Seed',17,0,9999,1),contrast:number('Contrast',1.4,.1,5)
  },'Seamless, seeded fractal value noise with periodic lattice hashing.'),
  cells: node('Cells / Voronoi','Generators','scalar',[],{
    scale:number('Cells',12,2,64,1),jitter:number('Jitter',.9,0,1),seed:number('Seed',4,0,9999,1),mode:choice('Output','distance',['distance','edges','random'])
  },'Periodic Voronoi distance, cell borders, or per-cell random values.'),
  clouds: node('Clouds','Generators','scalar',[],{
    scale:number('Scale',4,1,32,1),seed:number('Seed',32,0,9999,1),detail:number('Detail',.65,.1,.9)
  },'Soft layered periodic noise for broad material variation.'),
  bricks: node('Brick Pattern','Patterns','scalar',[],{
    columns:number('Columns',8,1,32,1),rows:number('Rows',12,1,32,1),mortar:number('Mortar',.06,.005,.35,.005),bevel:number('Bevel',.04,.001,.2,.005),offset:number('Row offset',.5,0,1),variation:number('Variation',.3,0,1),seed:number('Seed',4,0,9999,1)
  },'Staggered brick courses, beveled mortar, and deterministic brick variation.'),
  tiles: node('Tile Pattern','Patterns','scalar',[],{
    count:number('Tile count',8,1,32,1),gap:number('Grout',.055,.005,.35,.005),bevel:number('Bevel',.04,.001,.2,.005),variation:number('Variation',.2,0,1),seed:number('Seed',8,0,9999,1)
  },'Beveled square tiles with per-tile height variation.'),
  checker: node('Checker','Patterns','scalar',[],{count:number('Repetitions',8,1,64,1)},'Alternating periodic squares.'),
  dots: node('Shape Scatter','Patterns','scalar',[],{
    count:number('Repetitions',9,1,48,1),radius:number('Radius',.3,.02,.49),softness:number('Softness',.02,.001,.2),jitter:number('Jitter',.25,0,1),seed:number('Seed',7,0,9999,1),shape:choice('Shape','circle',['circle','square','diamond'])
  },'Tiled circle, square, and diamond masks with seeded position variation.'),
  gradient: node('Gradient','Generators','scalar',[],{angle:number('Angle',0,0,360,1),repeat:number('Repeat',1,1,32,1),mode:choice('Mode','linear',['linear','radial','angular'])},'Linear, radial, or angular gradient fields.'),
  value: node('Uniform Grayscale','Generators','scalar',[],{value:number('Value',.5,0,1)},'A constant linear data value.'),
  color: node('Uniform Color','Generators','color',[],{color:color('Color','#ba7745')},'sRGB color-picker values are decoded into linear-light working space.'),
  bitmap: node('Bitmap','Inputs','dynamic',[],{asset:{label:'Image',value:'',type:'asset'},space:choice('Color space','srgb',['srgb','linear']),kind:choice('Data type','color',['color','scalar','normal'])},'Embedded PNG, JPEG, or WebP. Explicit sRGB/linear decoding and semantic type.'),
  blend: node('Blend','Compositing','auto',[port('Background','any'),port('Foreground','any'),port('Mask','scalar',true)],{
    mode:choice('Blend mode','multiply',['multiply','add','subtract','screen','overlay','max','min','mix']),opacity:number('Opacity',.75,0,1)
  },'Linear-light compositing with an optional grayscale opacity mask.'),
  levels: node('Levels','Adjustments','auto',[port('Source','any')],{
    low:number('Input black',.1,0,.99),high:number('Input white',.9,.01,1),gamma:number('Gamma',1,.1,4),outLow:number('Output black',0,0,1),outHigh:number('Output white',1,0,1)
  },'Input/output remapping with a power curve. Works on scalar or color textures.'),
  invert: node('Invert','Adjustments','auto',[port('Source','any')],{},'One minus the linear source value.'),
  grayscale: node('Grayscale','Adjustments','scalar',[port('Source','color')],{},'Linear Rec.709 luminance conversion; intentionally explicit in the typed graph.'),
  threshold: node('Histogram Scan','Masks','scalar',[port('Source')],{position:number('Position',.5,0,1),width:number('Transition',.1,.001,.5)},'Threshold a height or noise field with an adjustable smooth transition.'),
  gradientMap: node('Gradient Map','Compositing','color',[port('Source')],{
    dark:color('Shadows','#183b36'),mid:color('Midtones','#568779'),light:color('Highlights','#c49a64'),position:number('Midpoint',.5,.01,.99)
  },'Three-stop gradient mapping in linear light.'),
  blur: node('Blur','Filters','auto',[port('Source','any')],{radius:number('Radius (UV %)',.4,0,4,.05)},'Resolution-independent 25-tap separable-weight Gaussian kernel.'),
  warp: node('Directional Warp','Filters','auto',[port('Source','any'),port('Intensity')],{strength:number('Intensity',.06,0,.5,.005),angle:number('Angle',30,0,360,1)},'Periodic UV displacement from a scalar intensity field.'),
  transform: node('Transform 2D','Filters','auto',[port('Source','any')],{scale:number('Tiling',2,.1,16,.1),angle:number('Rotation',0,-180,180,1),x:number('Offset X',0,-1,1),y:number('Offset Y',0,-1,1)},'Scale, rotate and translate tiled texture coordinates.'),
  normal: node('Normal from Height','Material','normal',[port('Height')],{strength:number('Intensity',2.5,0,12,.1),format:choice('Convention','OpenGL',['OpenGL','DirectX'])},'Resolution-normalized central differences, tangent-space normals, Y convention switch.'),
  ao: node('Ambient Occlusion','Material','scalar',[port('Height')],{radius:number('Radius (UV %)',1,.1,8,.1),strength:number('Intensity',3,0,12,.1)},'Local multi-direction height-field occlusion approximation (not a mesh bake).'),
  graphInput: node('Graph Input','Inputs','dynamic',[],{name:{label:'Name',value:'Input',type:'text'},kind:choice('Type','scalar',['scalar','color','normal'])},'Typed boundary input inside a reusable subgraph.'),
  subgraph: node('Subgraph','Subgraphs','dynamic',[],{},'Reusable single-output graph, inlined into the evaluation DAG.'),
};
export const CHANNELS = {
  baseColor:{label:'Base Color',type:'color',space:'srgb',default:[.38,.24,.12,1]},
  normal:{label:'Normal',type:'normal',space:'linear',default:[.5,.5,1,1]},
  roughness:{label:'Roughness',type:'scalar',space:'linear',default:[.45,.45,.45,1]},
  metallic:{label:'Metallic',type:'scalar',space:'linear',default:[0,0,0,1]},
  height:{label:'Height',type:'scalar',space:'linear',default:[.5,.5,.5,1]},
  ao:{label:'Ambient Occlusion',type:'scalar',space:'linear',default:[1,1,1,1]},
};
export function defaults(type) {
  const d = REGISTRY[type]; if (!d) throw new Error(`Unknown node type: ${type}`);
  return Object.fromEntries(Object.entries(d.params).map(([key,p]) => [key,p.value]));
}
export function definition(n, project) {
  const base = REGISTRY[n.type];
  if (!base) throw new Error(`Unknown node type: ${n.type}`);
  if(n.type !== 'subgraph') return base;
  const sub = project.subgraphs[n.subgraph];
  if(!sub) throw new Error(`Missing subgraph: ${n.subgraph}`);
  return {...base,label:sub.name,inputs:sub.inputs.map(i => port(i.name,i.type)),params:Object.fromEntries((sub.parameters||[]).map(p=>[p.key,p.descriptor])),output:sub.outputType};
}
export function canConnect(from, to) {return to === 'any' || from === to || (from === 'scalar' && to === 'color');}
export function srgbToLinear(x){return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;}
export function linearToSrgb(x){return x <= .0031308 ? 12.92*x : 1.055 * Math.max(0,x)**(1/2.4)-.055;}
export function hexLinear(hex){return [1,3,5].map(i=>srgbToLinear(parseInt(hex.slice(i,i+2),16)/255));}
export function packParams(n, projectSeed = 0, project = null) {
  const out = new Float32Array(64);
  const d = project ? definition(n,project) : REGISTRY[n.type];
  Object.entries(d.params).forEach(([k,p],i)=>{
    const value=n.params[k] ?? p.value;
    if(p.type==='color')out.set([...hexLinear(value),1],i*4);
    else if(p.type==='select')out[i*4]=p.options.indexOf(value);
    else if(p.type==='number')out[i*4]=Number(value);
  });
  out[60]=projectSeed;
  return out;
}

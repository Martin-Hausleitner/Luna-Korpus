/* Package original modules for an offline HTML host. No application behavior is rewritten. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {parse} from 'acorn';
const base=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(base,'release/app-mapping.json'),'utf8'));
const payload=JSON.parse(await fs.readFile(path.join(base,'payload-raw.json'),'utf8'));
const report=[];
for(const item of manifest.filter(x=>x.assetRoot)){
 const root=path.join(base,'release',item.assetRoot),pack=payload[item.id];pack.bundles={};
 const candidates=Object.keys(pack.assets).filter(x=>/\.(m?js)$/.test(x)&&!/(?:^|\/)(?:pages-sw|sw|service-worker)\./.test(x));
 for(const relative of candidates){
  try {
   const result=await build({entryPoints:[path.join(root,relative)],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,legalComments:'inline',logLevel:'silent',plugins:[{name:'portable-resource-addresses',setup(api){
    api.onLoad({filter:/\.(m?js)$/},async args=>{
     let source=await fs.readFile(args.path,'utf8');
     const rel=path.relative(root,args.path).split(path.sep).join('/');
     const address='https://luna-assets.invalid/'+item.id+'/'+rel;
     const changes=[], tree=parse(source,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true});
     function walk(node){if(!node||typeof node!=='object')return;
      if(node.type==='ImportExpression')changes.push([node.start,node.source.start,'globalThis.__LUNA_IMPORT_FROM__('+JSON.stringify(address)+',']);
      if(node.type==='MemberExpression'&&node.object?.type==='MetaProperty'&&node.object.meta?.name==='import'&&node.property?.name==='url')changes.push([node.start,node.end,JSON.stringify(address)]);
      for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
     }
     walk(tree);for(const [a,b,value] of changes.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+value+source.slice(b);
     return {contents:source,loader:'js',resolveDir:path.dirname(args.path)};
    });
   }}]});
   pack.bundles[relative]=result.outputFiles[0].text;
  }catch(error){report.push({app:item.id,path:relative,error:error.message});}
 }
 console.log(item.id,candidates.length,'original script assets;',Object.keys(pack.bundles).length,'portable bundles');
}
await fs.writeFile(path.join(base,'payload-bundled.json'),JSON.stringify(payload));
await fs.writeFile(path.join(base,'bundle-report.json'),JSON.stringify(report,null,2));
console.log('Packaging diagnostics',report.length);if(report.length)console.log(JSON.stringify(report,null,2));

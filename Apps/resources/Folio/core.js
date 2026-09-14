/** Folio replicated data engine. No framework or runtime dependencies. */
export const uid=()=>globalThis.crypto.randomUUID();
const clone=v=>v===undefined?undefined:structuredClone(v);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v};
export const cmp=(a,b)=>a<b?-1:a>b?1:0;
export class Replica{
 constructor(actor=uid()){this.actor=actor;this.clock=0;this.ops=new Map();this.entities=new Map();this.texts=new Map();this.listeners=new Set();this.localListeners=new Set();this.batch=[];this.depth=0;this.undoStack=[];this.redoStack=[];this.recording=true;}
 on(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 onLocal(fn){this.localListeners.add(fn);return()=>this.localListeners.delete(fn)}
 next(){this.clock=Math.max(this.clock+1,Date.now()*1000);return `${String(this.clock).padStart(16,'0')}:${this.actor}`}
 textState(entity,field='text'){let k=entity+'\0'+field;if(!this.texts.has(k))this.texts.set(k,{nodes:new Map(),children:new Map(),deleted:new Set(),formats:new Map(),cache:null});return this.texts.get(k)}
 apply(op,local=false){if(!op||typeof op.id!=='string'||!/^\d{16}:[A-Za-z0-9-]{1,80}$/.test(op.id)||typeof op.entity!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(op.entity)||typeof op.field!=='string'||!/^[A-Za-z0-9:_-]{1,100}$/.test(op.field)||['__proto__','constructor','prototype'].includes(op.field)||!Number.isSafeInteger(Number(op.id.split(':')[0]))||Number(op.id.split(':')[0])>8e15)throw Error('Invalid operation clock');if(this.ops.has(op.id)){if(JSON.stringify(this.ops.get(op.id))!==JSON.stringify(op))throw Error('Conflicting operation ID');return false;}op=freeze(clone(op));this.ops.set(op.id,op);this.clock=Math.max(this.clock,Number(op.id.split(':')[0])||0);if(!this.entities.has(op.entity))this.entities.set(op.entity,new Map());
  if(op.kind==='set'){let e=this.entities.get(op.entity),p=e.get(op.field);if(!p||cmp(op.id,p.id)>0)e.set(op.field,{id:op.id,value:op.value});}
  else{const t=this.textState(op.entity,op.field);t.cache=null;
   if(op.kind==='insert'){let after=op.after||'';Array.from(op.chars).forEach((char,i)=>{let id=op.id+'.'+String(i).padStart(5,'0');t.nodes.set(id,{id,after,char});let siblings=t.children.get(after)||[];siblings.push(id);siblings.sort((a,b)=>cmp(b,a));t.children.set(after,siblings);after=id;});}
   else if(op.kind==='deleteText')op.targets.forEach(id=>t.deleted.add(id));
   else if(op.kind==='format')op.targets.forEach(id=>{let m=t.formats.get(id)||new Map();for(const [key,value]of Object.entries(op.marks)){let old=m.get(key);if(!old||cmp(op.id,old.id)>0)m.set(key,{id:op.id,value})}t.formats.set(id,m)});
  }
  if(this.depth)this.batch.push(op);else this.listeners.forEach(fn=>fn([op],local));
  if(local)this.localListeners.forEach(fn=>fn(op));return true;
 }
 transact(fn){this.depth++;try{return fn()}finally{this.depth--;if(!this.depth&&this.batch.length){let b=this.batch;this.batch=[];this.listeners.forEach(fn=>fn(b,true))}}}
 make(entity,kind,args){let op={id:this.next(),entity,kind,...args};this.apply(op,true);return op}
 field(entity,key){return clone(this.entities.get(entity)?.get(key)?.value)}
 set(entity,field,value){let old=this.field(entity,field);if(JSON.stringify(old)===JSON.stringify(value))return;let op=this.make(entity,'set',{field,value});return {op,undo:()=>this.set(entity,field,old??null)}}
 create(type,props={},id=uid()){this.transact(()=>{this.set(id,'type',type);for(let[k,v]of Object.entries(props)){if(k==='text'||k==='title')this.edit(id,k,String(v));else this.set(id,k,v)}});return id}
 visible(entity,field='text'){let t=this.textState(entity,field);if(t.cache)return t.cache;let out=[],stack=[...(t.children.get('')||[])].reverse(),seen=new Set();while(stack.length){let id=stack.pop();if(seen.has(id))continue;seen.add(id);let n=t.nodes.get(id);if(!n)continue;if(!t.deleted.has(id))out.push(n);let c=t.children.get(id)||[];for(let i=c.length-1;i>=0;i--)stack.push(c[i]);}return t.cache=out}
 text(entity,field='text'){return this.visible(entity,field).map(n=>n.char).join('')}
 edit(entity,field,newValue,baseline=null){let a=baseline||this.visible(entity,field),b=Array.from(newValue),start=0,end=0;while(start<a.length&&start<b.length&&a[start].char===b[start])start++;while(end<a.length-start&&end<b.length-start&&a[a.length-1-end].char===b[b.length-1-end])end++;if(start===a.length&&start===b.length)return;
  let removed=a.slice(start,a.length-end),chars=b.slice(start,b.length-end).join(''),after=a[start-1]?.id||'',inserted=[];
  this.transact(()=>{this.deleteChars(entity,field,removed.map(n=>n.id));inserted=this.insertChunks(entity,field,after,chars)});
  return()=>this.transact(()=>{this.deleteChars(entity,field,inserted);if(removed.length)this.insertChunks(entity,field,after,removed.map(n=>n.char).join(''))});
 }
 insertChunks(entity,field,after,chars){let points=Array.from(chars),ids=[];for(let offset=0;offset<points.length;offset+=1500){let chunk=points.slice(offset,offset+1500),op=this.make(entity,'insert',{field,after,chars:chunk.join('')});let added=chunk.map((_,i)=>op.id+'.'+String(i).padStart(5,'0'));ids.push(...added);after=added.at(-1)}return ids}
 deleteChars(entity,field,targets){for(let i=0;i<targets.length;i+=400)this.make(entity,'deleteText',{field,targets:targets.slice(i,i+400)})}
 format(entity,field,start,end,marks){let nodes=this.visible(entity,field).slice(start,end);this.transact(()=>{for(let i=0;i<nodes.length;i+=400)this.make(entity,'format',{field,targets:nodes.slice(i,i+400).map(n=>n.id),marks})})}
 runs(entity,field='text'){let t=this.textState(entity,field),runs=[];for(let n of this.visible(entity,field)){let marks={};for(let [k,v]of(t.formats.get(n.id)||[]))if(v.value)marks[k]=v.value;let key=JSON.stringify(marks),last=runs.at(-1);if(last?.key===key)last.text+=n.char;else runs.push({text:n.char,marks,key})}return runs}
 get(id){let e=this.entities.get(id);if(!e)return null;let out={id};for(let[k,v]of e)out[k]=clone(v.value);for(let f of['title','text'])if(this.texts.has(id+'\0'+f))out[f]=this.text(id,f);return out}
 all(type,includeDeleted=false){return [...this.entities.keys()].map(id=>this.get(id)).filter(e=>(!type||e.type===type)&&(includeDeleted||!e.deleted)).sort((a,b)=>(a.order??0)-(b.order??0)||cmp(a.id,b.id))}
 export(){return clone([...this.ops.values()])}
 import(ops){this.transact(()=>ops.forEach(op=>this.apply(op)))}
}
export function evaluateFormula(expression,record){
 // Small bounded expression parser. No eval, Function, or access to host objects.
 const re=/\s*(\[([^\]]+)\]|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\d*\.?\d+)|([A-Za-z_][\w]*)|(>=|<=|==|!=|&&|\|\||[+\-*/%(),<>!]))/gy;let tokens=[],m,pos=0;
 while(pos<expression.length){re.lastIndex=pos;m=re.exec(expression);if(!m){if(!expression.slice(pos).trim())break;throw Error('Invalid formula near '+expression.slice(pos, pos+15))}tokens.push(m[2]!=null?{p:m[2]}:m[3]!=null||m[4]!=null?{v:m[3]??m[4]}:m[5]!=null?{v:Number(m[5])}:m[6]||m[7]);pos=re.lastIndex;if(tokens.length>256)throw Error('Formula too long')}
 let i=0;const funcs={sum:(...x)=>x.flat().reduce((a,b)=>a+Number(b||0),0),round:Math.round,abs:Math.abs,min:Math.min,max:Math.max,if:(c,a,b)=>c?a:b,concat:(...x)=>x.join(''),length:x=>String(x??'').length,empty:x=>x==null||x==='',contains:(a,b)=>String(a).includes(String(b)),lower:x=>String(x).toLowerCase(),upper:x=>String(x).toUpperCase()};
 const prec={'||':1,'&&':2,'==':3,'!=':3,'>':4,'<':4,'>=':4,'<=':4,'+':5,'-':5,'*':6,'/':6,'%':6};
 function atom(){let t=tokens[i++];if(t&&typeof t==='object')return 'p'in t?record[t.p]??0:t.v;if(t==='('){let v=expr(0);if(tokens[i++]!==')')throw Error('Missing )');return v}if(t==='-')return -Number(atom());if(t==='!')return !atom();if(t==='true'||t==='false')return t==='true';if(t==='null')return null;if(typeof t==='string'&&Object.hasOwn(funcs,t.toLowerCase())){if(tokens[i++]!=='(')throw Error('Expected (');let a=[];if(tokens[i]!==')'){do{a.push(expr(0));if(tokens[i]!==',')break;i++}while(true)}if(tokens[i++]!==')')throw Error('Expected )');return funcs[t.toLowerCase()](...a)}throw Error('Unknown term')}
 function expr(p){let a=atom();while(i<tokens.length&&prec[tokens[i]]>=p){let op=tokens[i++],b=expr(prec[op]+1);switch(op){case '+':a=typeof a==='string'||typeof b==='string'?String(a)+b:Number(a)+Number(b);break;case '-':a=Number(a)-Number(b);break;case '*':a=Number(a)*Number(b);break;case '/':a=Number(b)===0?null:Number(a)/Number(b);break;case '%':a=Number(a)%Number(b);break;case '>':a=a>b;break;case '<':a=a<b;break;case '>=':a=a>=b;break;case '<=':a=a<=b;break;case '==':a=a===b;break;case '!=':a=a!==b;break;case '&&':a=Boolean(a&&b);break;case '||':a=Boolean(a||b);break}}return a}let result=expr(0);if(i!==tokens.length)throw Error('Unexpected token');return result;
}
export function filterRecords(records,filters=[],mode='and'){return records.filter(r=>{const check=f=>{let v=f.field==='title'?r.title:r.values?.[f.field],s=String(v??'').toLowerCase(),q=String(f.value??'').toLowerCase();return f.op==='equals'?s===q:f.op==='not'?s!==q:f.op==='gt'?Number(v)>Number(f.value):f.op==='lt'?Number(v)<Number(f.value):f.op==='empty'?!s:s.includes(q)};return !filters.length||(mode==='or'?filters.some(check):filters.every(check))})}
export function parseCSV(text){let rows=[],row=[],field='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(quoted)throw Error('Unterminated quoted CSV value');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}return rows}
export const toCSV=rows=>rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');

const identifier=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(x);
const propertyTypes=new Set(['text','number','status','select','multi','date','person','checkbox','url','formula','relation','rollup','created']);
export function validateOp(op){
 if(!op||typeof op.id!=='string'||!/^\d{16}:[A-Za-z0-9-]{1,80}$/.test(op.id)||!Number.isSafeInteger(Number(op.id.split(':')[0]))||Number(op.id.split(':')[0])>8e15||!['set','insert','deleteText','format'].includes(op.kind)||!identifier(op.entity)||typeof op.field!=='string'||!/^[A-Za-z0-9:_-]{1,100}$/.test(op.field)||['__proto__','constructor','prototype'].includes(op.field))return false;
 if(JSON.stringify(op).length>100000)return false;
 if(op.kind==='insert')return typeof op.chars==='string'&&op.chars.length<=30000&&typeof op.after==='string'&&op.after.length<140;
 if(op.kind==='deleteText'||op.kind==='format')return Array.isArray(op.targets)&&op.targets.length<=30000&&op.targets.every(x=>typeof x==='string'&&x.length<140)&&(op.kind!=='format'||op.marks&&typeof op.marks==='object'&&!Array.isArray(op.marks)&&Object.keys(op.marks).every(x=>['bold','italic','underline','strike','code','link','color','highlight'].includes(x)));
 const v=op.value;
 if(['page','db','parent','target'].includes(op.field)&&v!=null&&!identifier(v))return false;
 if(['order','indent'].includes(op.field)&&v!=null&&(typeof v!=='number'||!Number.isFinite(v)))return false;
 if(['type','kind','style','font','cover','icon','description','detail'].includes(op.field)&&v!=null&&typeof v!=='string')return false;
 if(op.field==='properties'&&(!Array.isArray(v)||v.length>100||!v.every(p=>p&&identifier(p.id)&&typeof p.name==='string'&&p.name.length<=200&&propertyTypes.has(p.type)&&(p.options==null||Array.isArray(p.options)&&p.options.length<=200&&p.options.every(o=>typeof o==='string'&&o.length<=200))&&(p.database==null||identifier(p.database)))))return false;
 if(op.field==='filters'&&(!Array.isArray(v)||v.length>50||!v.every(f=>f&&identifier(f.field)&&['contains','equals','not','gt','lt','empty'].includes(f.op))))return false;
 if(op.field==='sort'&&(!Array.isArray(v)||v.length>20||!v.every(s=>s&&identifier(s.field))))return false;
 if(op.field==='hidden'&&(!Array.isArray(v)||!v.every(identifier)))return false;
 return true;
}
export function validateImport(operations){if(operations.length>100000)throw Error('This backup is too large to import in one pass');if(!operations.every(validateOp))throw Error('Invalid operation in backup');}

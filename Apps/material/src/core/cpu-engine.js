import {CHANNELS} from './registry.js';
export class CPUEngine {
  constructor(){
    this.kind='CPU worker';this.pending=new Map();this.counter=0;this.worker=new Worker(new URL('./cpu-worker.js',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);if(data.error)p.reject(new Error(data.error));else{this.stats=data.stats;p.resolve(new Map(data.results));}};
    this.worker.onerror=e=>{for(const p of this.pending.values())p.reject(new Error(e.message));this.pending.clear();};
    this.defaults=Object.fromEntries(Object.entries(CHANNELS).map(([k,c])=>[k,{size:1,data:new Float32Array(c.default),key:'default-'+k}]));
  }
  async evaluate(flat,roots,resolution){const id=++this.counter;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,flat,roots,resolution});});}
  async read(entry){return entry;}
  clear(){this.worker.postMessage({type:'clear'});}
}

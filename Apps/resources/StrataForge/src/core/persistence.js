import {validateProject,uid} from './graph.js';
export class ProjectStorage {
  async open(){if(this.db)return this.db;this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('strataforge',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return this.db;}
  async save(project){validateProject(project);const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(structuredClone(project),'autosave');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  async load(){const db=await this.open();return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('autosave');r.onsuccess=()=>{try{if(r.result)validateProject(r.result);resolve(r.result||null);}catch(e){reject(e);}};r.onerror=()=>reject(r.error);});}
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
export function serialize(project){validateProject(project);return JSON.stringify(project,null,2);}
export async function loadProjectFile(file){if(file.size>48*1024*1024)throw new Error('Project exceeds the 48 MiB import limit.');const project=JSON.parse(await file.text());validateProject(project);return project;}
export async function importBitmap(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPEG, or WebP.');if(file.size>12*1024*1024)throw new Error('Image exceeds the 12 MiB import limit.');
  const bitmap=await createImageBitmap(file);const width=bitmap.width,height=bitmap.height;bitmap.close();if(width>4096||height>4096)throw new Error('Bitmap dimensions must not exceed 4096 × 4096.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});return {name:file.name,width,height,data,revision:uid()};
}

import {linearToSrgb} from './registry.js';
export function toRGBA8(data,space='linear'){
  const out=new Uint8ClampedArray(data.length);
  for(let i=0;i<data.length;i++)out[i]=Math.round(Math.max(0,Math.min(1,i%4===3?data[i]:space==='srgb'?linearToSrgb(data[i]):data[i]))*255);
  return out;
}
export async function pngBlob(entry,space='linear'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=entry.size;
  canvas.getContext('2d').putImageData(new ImageData(toRGBA8(entry.data,space),entry.size,entry.size),0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG encoder failed.')),'image/png'));
}
/** PFM: little-endian RGB float32, bottom-up scanlines, always scene-linear / data. */
export function pfmBlob(entry){const header=new TextEncoder().encode(`PF\n${entry.size} ${entry.size}\n-1.0\n`),buffer=new ArrayBuffer(entry.size*entry.size*12),view=new DataView(buffer);let offset=0;for(let y=entry.size-1;y>=0;y--)for(let x=0;x<entry.size;x++)for(let c=0;c<3;c++){view.setFloat32(offset,entry.data[(y*entry.size+x)*4+c],true);offset+=4;}return new Blob([header,buffer],{type:'application/octet-stream'});}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
/** Dependency-free ZIP STORE encoder with UTF-8 filenames, CRC-32 and central directory. */
export async function zipBlob(files){
  const chunks=[],central=[];let offset=0,centralSize=0;
  for(const file of files){const name=new TextEncoder().encode(file.name),data=new Uint8Array(await file.blob.arrayBuffer()),crc=crc32(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,data);
    const c=new Uint8Array(46+name.length),v=new DataView(c.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);c.set(name,46);central.push(c);centralSize+=c.length;offset+=local.length+data.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...chunks,...central,end],{type:'application/zip'});
}

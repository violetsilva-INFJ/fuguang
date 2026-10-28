import {ENGINE_VERSION} from './analysis.js';

// Keys contain only in-memory snapshots; neither journal data nor results leave this origin.
export function analysisSnapshot(records,config){
 return JSON.stringify([ENGINE_VERSION,config,[...records].sort((a,b)=>a.id.localeCompare(b.id))]);
}
export class AnalysisClient {
 constructor(factory=()=>new Worker(new URL('./analysis-worker.js',import.meta.url),{type:'module'})){
  this.factory=factory;this.worker=null;this.generation=0;this.active=null;
 }
 cancel(){
  this.generation++;
  if(this.active){this.worker?.postMessage({type:'cancel',id:this.active.id});this.active.resolve({cancelled:true});this.active=null;}
 }
 run(records,config,{onProgress=()=>{}}={}){
  this.cancel();const id=this.generation,key=analysisSnapshot(records,config);
  if(!this.worker){this.worker=this.factory();this.worker.onmessage=event=>{
   const m=event.data,a=this.active;
   if(!a||m.id!==a.id||m.key!==a.key||a.id!==this.generation)return;
   if(m.type==='progress'){a.onProgress(m);return;}
   this.active=null;
   if(m.type==='error')a.reject(new Error(m.message||'计算未完成'));
   else a.resolve({result:m.result,key:m.key,cached:m.cached??false,cancelled:m.type==='cancelled'});
  };this.worker.onerror=()=>{const a=this.active;this.active=null;this.worker?.terminate();this.worker=null;a?.reject(new Error('当前浏览器未能运行本地计算线程，记录仍安全保留。'));};}
  return new Promise((resolve,reject)=>{this.active={id,key,onProgress,resolve,reject};this.worker.postMessage({type:'run',id,key,version:ENGINE_VERSION,records,config});});
 }
 dispose(){this.cancel();this.worker?.terminate();this.worker=null;}
}

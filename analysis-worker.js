import {ENGINE_VERSION,createAnalysis,bootstrapAnalysis} from './analysis.js';
import {SCALE_ENGINE_VERSION,createScaleAnalysis} from './scale-analysis.js';
const RUNTIME_VERSION=ENGINE_VERSION+'|'+SCALE_ENGINE_VERSION;
let current=0;const cache=new Map();
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
self.onmessage=async event=>{
 const m=event.data;
 if(m.type==='cancel'){if(m.id===current)current++;return;}
 if(m.type!=='run')return;
 current=m.id;const id=m.id,key=m.key;
 try{
  if(m.version!==RUNTIME_VERSION)throw new Error('计算版本已变化，请刷新页面后重试。');
  if(cache.has(key)){self.postMessage({type:'result',id,key,result:cache.get(key),cached:true});return;}
  const prepared=m.config.view==='scale'?createScaleAnalysis(m.records,m.config):createAnalysis(m.records,m.config);
  const result=m.config.view==='scale'?prepared:await bootstrapAnalysis(prepared,{shouldCancel:()=>current!==id,yieldControl:pause,onProgress:p=>{
   if(current===id)self.postMessage({type:'progress',id,key,...(typeof p==='number'?{completed:p}:p)});
  }});
  if(current!==id||result.cancelled){self.postMessage({type:'cancelled',id,key});return;}
  cache.set(key,result);while(cache.size>2)cache.delete(cache.keys().next().value);
  self.postMessage({type:'result',id,key,result,cached:false});
 }catch(err){if(current===id)self.postMessage({type:'error',id,key,message:err.message||'本地计算未完成'});}
};

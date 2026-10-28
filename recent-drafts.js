// Shortcuts are derived from records. This module never saves an event or sends data.
import {localDay,localInput} from './core.js';

export const SHORTCUT_PREFS_KEY='fuguang-shortcut-prefs-v1';
const TYPES=['medication','caffeine','diet','activity'];
const FIELDS={
 medication:['name','dose','unit','category','use','route'],
 caffeine:['drink','name','drinkKind','originalDrinkType','amount','unit','cupCount','volumePerCupMl','strength','brew','brand','caffeineMode','estimatedCaffeineMg'],
 diet:['categoryId','categoryLabel','category','name','quantity','quantityUnit','quantityUnitLabel','amount','unit'],
 activity:['groupId','categoryId','categoryLabel','name','durationMinutes','intensity'],
};
const LABEL_FIELDS=['valueMg','basis','note'];
const ESTIMATE_FIELDS=['method','lowMg','highMg','labelMg','labelBasis','labelNote','sourceId','sourceUrl','sourceServingMl','sourceMinMg','sourceMaxMg','volumeUsedMl'];
const primitive=v=>v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);
const copyFields=(source,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(source??{},key)&&primitive(source[key])).map(key=>[key,source[key]]));
function allowedFields(type,record={}){
 if(!TYPES.includes(type))throw new RangeError('这个记录类型没有快捷草稿');
 const fields=copyFields(record,FIELDS[type]);
 if(type==='activity'&&Array.isArray(record.tags))fields.tags=[...new Set(record.tags.filter(t=>typeof t==='string'))].sort();
 if(type==='caffeine'){
  if(record.caffeineLabel&&typeof record.caffeineLabel==='object')fields.caffeineLabel=copyFields(record.caffeineLabel,LABEL_FIELDS);
  if(record.caffeineEstimate&&typeof record.caffeineEstimate==='object')fields.caffeineEstimate=copyFields(record.caffeineEstimate,ESTIMATE_FIELDS);
 }
 return fields;
}
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
function fingerprint(text){
 // Four independently seeded 32-bit hashes keep preference keys bounded. This is
 // an identifier for hiding UI items, not encryption or a security boundary.
 const seeds=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35];
 return seeds.map(seed=>{
  let hash=seed;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);hash^=hash>>>13;}
  return (hash>>>0).toString(16).padStart(8,'0');
 }).join('');
}
export function stableShortcutKey(type,fields){return type+':'+fingerprint(canonical([type,allowedFields(type,fields)]));}

const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const cleanPrefs=value=>({version:1,hidden:[...new Set(Array.isArray(value?.hidden)?value.hidden.filter(v=>typeof v==='string'&&/^(medication|caffeine|diet|activity):[a-f0-9]{32}$/.test(v)):[])].slice(-256),clearedBefore:validDate(value?.clearedBefore)?new Date(value.clearedBefore).toISOString():null});
const emptyPrefs=()=>({version:1,hidden:[],clearedBefore:null});
function browserStorage(storage){if(storage!==undefined)return storage;try{return globalThis.localStorage;}catch{return null;}}
export function loadShortcutPrefs(storage){
 try{const raw=browserStorage(storage)?.getItem(SHORTCUT_PREFS_KEY);if(!raw)return emptyPrefs();const value=JSON.parse(raw);return value?.version===1?cleanPrefs(value):emptyPrefs();}catch{return emptyPrefs();}
}
export function saveShortcutPrefs(prefs,storage){try{const s=browserStorage(storage);if(!s)return false;s.setItem(SHORTCUT_PREFS_KEY,JSON.stringify(cleanPrefs(prefs)));return true;}catch{return false;}}
export function hideShortcut(prefs,key){return cleanPrefs({...cleanPrefs(prefs),hidden:[...cleanPrefs(prefs).hidden,key]});}
export function clearShortcutHistory(prefs,now=new Date()){
 const date=new Date(now);if(!Number.isFinite(date.getTime()))throw new RangeError('快捷草稿清理时间无效');
 return {...cleanPrefs(prefs),clearedBefore:date.toISOString()};
}
export function restoreShortcutPrefs(){return emptyPrefs();}
export function forgetShortcutPrefs(storage){try{const s=browserStorage(storage);if(!s)return false;s.removeItem(SHORTCUT_PREFS_KEY);return true;}catch{return false;}}

function lastUse(record){
 for(const key of ['updatedAt','createdAt','occurredAt'])if(validDate(record?.[key]))return Date.parse(record[key]);
 return 0;
}
function compact(value,length=62){return [...String(value??'')].slice(0,length).join('');}
function label(type,f){
 if(type==='medication')return compact([f.name,typeof f.dose==='number'?`${f.dose} ${f.unit??''}`:'',f.use==='as-needed'?'曾记为按需':f.use==='regular'?'曾记为常规':'',f.route].filter(Boolean).join(' · '));
 if(type==='caffeine'){
  const drink={coffee:'咖啡',tea:'茶',energy:'能量饮料',other:'饮品'}[f.drink]??'饮品';
  const count=f.cupCount??(f.unit==='杯'?f.amount:null),amount=count!==null&&count!==undefined?`${count} 杯`:f.amount!==null&&f.amount!==undefined?`${f.amount} ${f.unit??''}`:'';
  return compact([f.name||drink,amount,f.volumePerCupMl!==null&&f.volumePerCupMl!==undefined?`每杯 ${f.volumePerCupMl} ml`:''].filter(Boolean).join(' · '));
 }
 if(type==='diet'){
  const quantity=f.quantity??f.amount,unit=f.quantity!==null&&f.quantity!==undefined?({g:'g',ml:'ml',portion:'份',piece:'个',bowl:'碗',cup:'杯',other:f.quantityUnitLabel??'自定义单位'}[f.quantityUnit]??''):f.unit;
  return compact([f.name||f.categoryLabel||f.category,quantity!==null&&quantity!==undefined?`${quantity} ${unit??''}`:'',!f.categoryId?'旧分类待核对':''].filter(Boolean).join(' · '));
 }
 const intensity={light:'轻松',moderate:'适中',vigorous:'较高'}[f.intensity]??'';
 return compact([f.categoryLabel||f.name||'活动',f.durationMinutes!==null&&f.durationMinutes!==undefined?`${f.durationMinutes} 分钟`:'',intensity,!f.categoryId?'旧分类待核对':''].filter(Boolean).join(' · '));
}

export function shortcutGroups(records,type,prefs={},options={}){
 if(!TYPES.includes(type))return {items:[],recent:[],frequent:[],total:0};
 const limit=options.limit===12?12:4,p=cleanPrefs(prefs),cutoff=p.clearedBefore?Date.parse(p.clearedBefore):null,hidden=new Set(p.hidden),groups=new Map();
 for(const record of Array.isArray(records)?records:[]){
  if(record?.type!==type)continue;
  const fields=allowedFields(type,record);if(!Object.keys(fields).length)continue;
  const last=lastUse(record);if(cutoff!==null&&last<=cutoff)continue;
  // Structural equality is exact; hashes are used only for local hiding preferences.
  const structural=canonical([type,fields]),key=type+':'+fingerprint(structural);
  if(hidden.has(key))continue;
  const previous=groups.get(structural);
  if(previous){previous.count++;if(last>previous.lastUsedMs){previous.lastUsedMs=last;previous.lastUsedAt=last?new Date(last).toISOString():null;}}
  else groups.set(structural,{key,type,fields,label:label(type,fields),count:1,lastUsedAt:last?new Date(last).toISOString():null,lastUsedMs:last});
 }
 const recent=[...groups.values()].sort((a,b)=>b.lastUsedMs-a.lastUsedMs||a.key.localeCompare(b.key));
 const frequent=[...groups.values()].filter(item=>item.count>1).sort((a,b)=>b.count-a.count||b.lastUsedMs-a.lastUsedMs||a.key.localeCompare(b.key));
 const selected=[],seen=new Set(),take=items=>{for(const item of items)if(selected.length<limit&&!seen.has(item.key)){selected.push(item);seen.add(item.key);}};
 take(recent.slice(0,Math.ceil(limit/2)));take(frequent);take(recent);
 const publicItem=item=>{const {lastUsedMs,...rest}=item;return structuredClone(rest);};
 return {items:selected.map(publicItem),recent:recent.slice(0,limit).map(publicItem),frequent:frequent.slice(0,limit).map(publicItem),total:groups.size};
}

export function draftFromShortcut(item,now=new Date()){
 const date=new Date(now);if(!Number.isFinite(date.getTime()))throw new RangeError('这次记录的时间无效');
 if(!item||!TYPES.includes(item.type))throw new RangeError('快捷草稿类型不正确');
 const fields=allowedFields(item.type,item.fields??{});
 return {...fields,...(item.type==='activity'?{startAt:null}:{}),time:localInput(date),day:localDay(date)};
}

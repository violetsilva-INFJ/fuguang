// Pure local statistics. No requests, storage, credentials or clinical inference.
import {ACTIVITY_GROUPS,DIET_CATEGORIES,QUANTITY_UNITS} from './core.js';
export const ENGINE_VERSION='fuguang-association-1.1.0';
export const VARIABLES=[
 {id:'sleepHours',label:'夜间睡眠时长（按醒来日期）',kind:'continuous',role:'x',unit:'小时'},
 {id:'exerciseMinutes',label:'旧版未分类每日运动分钟',kind:'continuous',role:'x',unit:'分钟'},
 {id:'activityMinutes',label:'已记录活动分钟（每个事件只计一次）',kind:'continuous',role:'x',unit:'分钟'},
 {id:'activityEventCount',label:'已记录活动事件数',kind:'continuous',role:'x',unit:'次'},
 {id:'activityPresence',label:'当天明确记录活动情况',kind:'binary',role:'x',levels:[0,1],levelLabels:['明确记录未活动','明确记录有活动']},
 {id:'legacyActivityMinutes',label:'旧版未分类活动分钟',kind:'continuous',role:'x',unit:'分钟'},
 {id:'dietEventCount',label:'已记录饮食事件数（含咖啡与茶）',kind:'continuous',role:'x',unit:'次'},
 {id:'legacyDietEventCount',label:'旧版未分类饮食事件数',kind:'continuous',role:'x',unit:'次'},
 {id:'gameMinutes',label:'已记录游戏分钟',kind:'continuous',role:'x',unit:'分钟'},
 {id:'caffeineCups',label:'已记录咖啡 / 茶杯数',kind:'continuous',role:'x',unit:'杯'},
 {id:'caffeineLabelMg',label:'标签注明的咖啡因量',kind:'continuous',role:'x',unit:'mg',note:'仅完整产品标签总量；参照范围和旧估计不混入。'},
 {id:'symptomIntensity',label:'已记录身体不适强度中位数',kind:'ordinal',role:'x',unit:'分'},
 {id:'dailyMood',label:'每日心情（旧版五级）',kind:'ordinal',role:'x',unit:'级'},
 {id:'medicationPresence',label:'当日有记录用药',kind:'binary',role:'x',levels:[0,1],levelLabels:['明确记录未用药','有记录用药'],medication:true},
 {id:'prnPresence',label:'当日有记录按需用药',kind:'binary',role:'x',levels:[0,1],levelLabels:['明确记录未用药','有记录按需用药'],medication:true,prn:true},
 {id:'caffeinePresence',label:'当日有记录咖啡 / 茶等',kind:'binary',role:'x',levels:[0,1],levelLabels:['明确记录未饮用','有记录饮用']},
 {id:'drinkType',label:'当日记录的饮品品类',kind:'nominal',role:'x',note:'多个品类作为“混合品类”一组，不给品类编码或排序。'},
 {id:'sleepQuality',label:'主观睡眠感受',kind:'nominal',role:'both',note:'自述感受；不是设备睡眠分期。'},
 {id:'anxiety',label:'不安 · 已记录时刻强度中位数',kind:'ordinal',role:'y',score:true,unit:'分'},
 {id:'lowMood',label:'低落 · 已记录时刻强度中位数',kind:'ordinal',role:'y',score:true,unit:'分'},
 {id:'anxietyOccurrence',label:'当天是否记录到焦虑',kind:'binary',role:'both',levels:[0,1],levelLabels:['明确记录未出现','有记录出现']},
 {id:'lowMoodOccurrence',label:'当天是否记录到低落',kind:'binary',role:'both',levels:[0,1],levelLabels:['明确记录未出现','有记录出现']},
 ...ACTIVITY_GROUPS.flatMap(g=>[
  ...['count','minutes'].map(measure=>activityDescriptor(g,null,measure)),
  ...g.categories.flatMap(c=>['count','minutes'].map(measure=>activityDescriptor(g,c,measure))),
 ]),
 ...DIET_CATEGORIES.map(c=>dietDescriptor(c,'count')),
];
function activityDescriptor(group,category,measure){return {id:category?`activityCategory:${group.id}:${category.id}:${measure}`:`activityGroup:${group.id}:${measure}`,label:`${group.label}${category?' · '+category.label:''} · 已记录${measure==='count'?'事件数':'分钟'}`,kind:'continuous',role:'x',unit:measure==='count'?'次':'分钟',domain:'activity',groupId:group.id,categoryId:category?.id??null,measure,note:'按明确保存的稳定分类计数；同一事件多标签只计一次，未登记不算0。'};}
function dietDescriptor(category,measure,unit=null,unitLabel=null){return {id:measure==='count'?`dietCategory:${category.id}:count`:`dietCategory:${category.id}:quantity:${unit}${unit==='other'?':'+encodeURIComponent(unitLabel):''}`,label:`${category.label} · ${measure==='count'?'已记录事件数':'已记录数量（'+(unitLabel??QUANTITY_UNITS.find(u=>u.id===unit)?.label??unit)+'）'}`,kind:'continuous',role:'x',unit:measure==='count'?'次':unitLabel??QUANTITY_UNITS.find(u=>u.id===unit)?.label??unit,domain:'diet',categoryId:category.id,measure,quantityUnit:unit,quantityUnitLabel:unitLabel,note:'只汇总同一稳定分类、同一明确数量单位；旧自由文本不自动分类，缺失不算0。'};}
const customId=id=>typeof id==='string'&&/^custom-[A-Za-z0-9_-]{8,73}$/.test(id);
function activityClassification(r){const group=ACTIVITY_GROUPS.find(g=>g.id===r.groupId);if(!group)return null;const category=group.categories.find(c=>c.id===r.categoryId);return category||customId(r.categoryId)&&r.categoryLabel?{group,category:category??{id:r.categoryId,label:r.categoryLabel}}:null;}
function dietClassification(r){const category=DIET_CATEGORIES.find(c=>c.id===r.categoryId);return category??(customId(r.categoryId)&&r.categoryLabel?{id:r.categoryId,label:r.categoryLabel}:null);}
function customCatalog(records){
 const entries=new Map();
 for(const r of records){if(r.entryProvenance?.source==='narrative-reviewed'||!customId(r.categoryId))continue;const a=r.type==='activity'?activityClassification(r):null,d=r.type==='diet'?dietClassification(r):null;if(!a&&!d)continue;const key=JSON.stringify([r.type,a?.group.id??'',r.categoryId]);const candidate={key,domain:r.type,group:a?.group??null,category:a?.category??d};const old=entries.get(key);if(!old||candidate.category.label<old.category.label)entries.set(key,candidate);}
 return [...entries.values()].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
}
export function analysisCatalogInfo(records){const all=customCatalog(records);return {customCategories:all.length,customIncluded:Math.min(50,all.length),customOmitted:Math.max(0,all.length-50)};}
export function analysisVariables(records=[]){
 const catalog=[...VARIABLES],custom=customCatalog(records).slice(0,50),allowedCustom=new Set(custom.map(c=>c.key));
 for(const c of custom)if(c.domain==='activity')catalog.push(...['count','minutes'].map(m=>activityDescriptor(c.group,c.category,m)));else catalog.push(dietDescriptor(c.category,'count'));
 const quantities=new Map();for(const r of records){if(r.type!=='diet'||r.entryProvenance?.source==='narrative-reviewed'||!numeric(r.quantity)||!QUANTITY_UNITS.some(u=>u.id===r.quantityUnit)||r.quantityUnit==='other'&&!r.quantityUnitLabel)continue;const c=dietClassification(r);if(!c||customId(c.id)&&!allowedCustom.has(JSON.stringify(['diet','',c.id])))continue;const d=dietDescriptor(c,'quantity',r.quantityUnit,r.quantityUnit==='other'?r.quantityUnitLabel:null);if(!quantities.has(d.id)||d.label<quantities.get(d.id).label)quantities.set(d.id,d);}
 catalog.push(...[...quantities.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));return catalog;
}
const descriptor=(id,records=[])=>analysisVariables(records).find(v=>v.id===id);
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const choose2=n=>n*(n-1)/2;
const unique=a=>[...new Set(a)];
export const dateOrdinal=date=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date??''))return NaN;const ms=Date.parse(date+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===date?Math.round(ms/86400000):NaN;};
export const calendarDate=ordinal=>new Date(ordinal*86400000).toISOString().slice(0,10);
export const median=a=>{const v=a.filter(numeric).sort((a,b)=>a-b);return v.length?v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2:null;};
function agreed(a){const u=unique(a.filter(v=>v!==null&&v!==undefined));return u.length===1?u[0]:null;}
function ratingIncluded(r,metric,view){
 if(!['moment','narrative'].includes(r.type)||!numeric(r[metric])||r[metric]<0||r[metric]>10)return false;
 const p=r.ratingProvenance?.[metric];
 return p?.confirmed===true&&(view==='estimated'?['estimated-language','relative-baseline','edited-suggestion'].includes(p.origin):['explicit-number','user-slider'].includes(p.origin));
}
function occurrence(records,metric,view){
 const key=metric+'Occurrence';
 const explicit=records.filter(r=>['daily','occurrence'].includes(r.type)&&r.entryProvenance?.source!=='narrative-reviewed');
 const yes=explicit.some(r=>r[key]==='yes')||records.some(r=>ratingIncluded(r,metric,view)&&r[metric]>0);
 return yes?1:explicit.some(r=>r[key]==='no')?0:null;
}
function positiveOrExplicitNo(events,daily,key,checkins=[],domain=''){return events.length||daily.some(r=>r[key]==='some')||checkins.some(r=>r.domain===domain&&r.status==='some')?1:daily.some(r=>r[key]==='none')||checkins.some(r=>r.domain===domain&&r.status==='none')?0:null;}
function sumKnown(events,fn){if(!events.length)return null;const vals=events.map(fn);return vals.every(numeric)?vals.reduce((a,b)=>a+b,0):null;}
function defaultDates(records,config){
 const valid=records.map(r=>r.localDate).filter(d=>Number.isFinite(dateOrdinal(d))).sort();
 const end=config.endDate??valid.at(-1)??new Date().toISOString().slice(0,10);
 return {startDate:config.startDate??(valid[0]??end),endDate:end};
}
export function buildDailyData(records,config={}){
 const view=config.scoreView==='estimated'?'estimated':'primary';
 const dates=defaultDates(records,config),start=dateOrdinal(dates.startDate),end=dateOrdinal(dates.endDate);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||end-start>3660)throw new Error('分析日期范围无效或超过十年。');
 const byDay=new Map();
 const catalog=analysisVariables(records);
 const excluded={estimatedRatings:0,legacyRatings:0,dailyRatings:0,screeningObservations:0,narrativeExposureTags:0,invalidDates:0};
 for(const r of records){
  if(!Number.isFinite(dateOrdinal(r.localDate))){excluded.invalidDates++;continue;}
  if(r.localDate<dates.startDate||r.localDate>dates.endDate)continue;
  if(!byDay.has(r.localDate))byDay.set(r.localDate,[]);byDay.get(r.localDate).push(r);
  if(r.type==='screening')excluded.screeningObservations++;
  if(r.type==='narrative')excluded.narrativeExposureTags+=(r.topics?.length??0);
  for(const m of ['anxiety','lowMood'])if(numeric(r[m])){
   if(r.type==='daily')excluded.dailyRatings++;
   else if(!ratingIncluded(r,m,view)){
    if(['estimated-language','relative-baseline','edited-suggestion'].includes(r.ratingProvenance?.[m]?.origin))excluded.estimatedRatings++;
    else excluded.legacyRatings++;
   }
  }
 }
 const rows=[];
 for(let ordinal=start;ordinal<=end;ordinal++){
  const date=calendarDate(ordinal),all=byDay.get(date)??[],daily=all.filter(r=>r.type==='daily'&&r.entryProvenance?.source!=='narrative-reviewed');
  const activity=all.filter(r=>r.type==='activity'&&r.entryProvenance?.source!=='narrative-reviewed');
  const beverages=all.filter(r=>r.type==='caffeine'&&r.entryProvenance?.source!=='narrative-reviewed');
  const meds=all.filter(r=>r.type==='medication'&&r.entryProvenance?.source!=='narrative-reviewed');
  const checkins=all.filter(r=>r.type==='checkin'&&r.entryProvenance?.source!=='narrative-reviewed');
  const caffeinePresence=positiveOrExplicitNo(beverages,daily,'caffeineStatus',checkins,'caffeine');
  const medPresence=positiveOrExplicitNo(meds,daily,'medicationStatus',checkins,'medication');
  const activityPresence=positiveOrExplicitNo(activity,[],'',checkins,'activity'),activityNone=activityPresence===0;
  const food=all.filter(r=>r.type==='diet'&&r.entryProvenance?.source!=='narrative-reviewed');
  const sleepRecords=all.filter(r=>r.type==='sleep'&&r.entryProvenance?.source!=='narrative-reviewed');
  const sleep=sleepRecords.length?sleepRecords:daily;
  const categories=unique(beverages.map(r=>r.originalDrinkType?.trim()||r.drinkKind&&r.drinkKind!=='unknown'&&r.drinkKind||r.drink).filter(Boolean));
  const values={
   anxiety:median(all.filter(r=>ratingIncluded(r,'anxiety',view)).map(r=>r.anxiety)),
   lowMood:median(all.filter(r=>ratingIncluded(r,'lowMood',view)).map(r=>r.lowMood)),
   anxietyOccurrence:occurrence(all,'anxiety',view),lowMoodOccurrence:occurrence(all,'lowMood',view),
   sleepHours:agreed(sleep.map(r=>numeric(r.sleepHours)?r.sleepHours:null)),
   exerciseMinutes:agreed(daily.map(r=>numeric(r.exerciseMinutes)?r.exerciseMinutes:null)),
   activityMinutes:activity.length?sumKnown(activity,r=>r.durationMinutes):activityNone?0:null,
   activityEventCount:activity.length||activityNone?activity.length:null,activityPresence,
   legacyActivityMinutes:activity.filter(r=>!activityClassification(r)).length?sumKnown(activity.filter(r=>!activityClassification(r)),r=>r.durationMinutes):activityNone?0:null,
   dietEventCount:food.length+beverages.length||null,legacyDietEventCount:food.filter(r=>!dietClassification(r)).length||null,
   gameMinutes:activity.some(r=>r.tags?.includes('game'))?sumKnown(activity.filter(r=>r.tags?.includes('game')),r=>r.durationMinutes):activityNone?0:null,
   dailyMood:agreed(daily.map(r=>numeric(r.mood)?r.mood:null)),
   symptomIntensity:median(all.filter(r=>r.type==='symptom'&&r.entryProvenance?.source!=='narrative-reviewed').map(r=>r.intensity)),
   medicationPresence:medPresence,
   prnPresence:meds.some(r=>r.use==='as-needed')?1:medPresence===0?0:null,
   caffeinePresence,
   caffeineCups:beverages.length?sumKnown(beverages,r=>numeric(r.cupCount)?r.cupCount:r.unit==='杯'&&numeric(r.amount)?r.amount:null):caffeinePresence===0?0:null,
   caffeineLabelMg:beverages.length?sumKnown(beverages,r=>r.caffeineEstimate?.method==='product-label'&&numeric(r.caffeineEstimate.lowMg)&&r.caffeineEstimate.lowMg===r.caffeineEstimate.highMg?r.caffeineEstimate.lowMg:null):caffeinePresence===0?0:null,
   drinkType:categories.length>1?'混合品类':categories[0]??(caffeinePresence===0?'明确未饮用':null),
   sleepQuality:agreed(sleep.map(r=>r.sleepDetails?.subjective&&r.sleepDetails.subjective!=='unknown'?r.sleepDetails.subjective:null)),
  };
  for(const v of catalog){
   if(v.domain==='activity'){
    const events=activity.filter(r=>{const c=activityClassification(r);return c&&c.group.id===v.groupId&&(!v.categoryId||c.category.id===v.categoryId);});
    values[v.id]=events.length?(v.measure==='count'?events.length:sumKnown(events,r=>r.durationMinutes)):activityNone?0:null;
   }else if(v.domain==='diet'){
    const events=food.filter(r=>dietClassification(r)?.id===v.categoryId);
    if(v.measure==='count')values[v.id]=events.length||null;
    else {const sameUnit=events.filter(r=>r.quantityUnit===v.quantityUnit&&(v.quantityUnit!=='other'||r.quantityUnitLabel===v.quantityUnitLabel));values[v.id]=sumKnown(sameUnit,r=>r.quantity);}
   }
  }
  rows.push({date,ordinal,values,provenance:{recordIds:all.map(r=>r.id),momentCounts:{anxiety:all.filter(r=>ratingIncluded(r,'anxiety',view)).length,lowMood:all.filter(r=>ratingIncluded(r,'lowMood',view)).length},retrospectiveRecords:all.filter(r=>r.entryProvenance?.mode==='retrospective').length,ambiguousDaily:daily.length>1&&['sleepHours','exerciseMinutes','mood'].some(k=>unique(daily.filter(r=>numeric(r[k])).map(r=>r[k])).length>1),sleepSource:sleepRecords.length?'sleep':'legacy-daily',sleepDeviceSources:unique(sleep.map(r=>r.sleepDetails?.deviceSource).filter(Boolean))}});
 }
 return {rows,excluded,scoreView:view,...dates};
}

// Pair once on actual calendar dates. Resampling subsequently copies these rows;
// it never invents a next-day pair across two newly concatenated blocks.
export function pairCalendar(dailyRows,config={}){
 const x=config.x??'sleepHours',y=config.y??'anxiety',lag=config.lag??0;
 if(![0,1].includes(lag))throw new Error('只支持同日或次日配对。');
 const phases=(config.phaseBoundaries??[]).filter(p=>Number.isFinite(dateOrdinal(p.date))).sort((a,b)=>a.date.localeCompare(b.date));
 const phase=date=>phases.filter(p=>p.date<=date).length;
 const map=new Map(dailyRows.map(r=>[r.date,r]));
 return dailyRows.map(r=>{
  const targetDate=calendarDate(r.ordinal+lag),target=map.get(targetDate),xv=r.values[x]??null,yv=target?.values[y]??null;
  const samePhase=phase(r.date)===phase(targetDate);
  return {date:r.date,targetDate,ordinal:r.ordinal,x:xv,y:yv,valid:xv!==null&&yv!==null&&samePhase,phase:phase(r.date),phaseLabel:phases[phase(r.date)-1]?.label??'未标记阶段',crossPhase:!samePhase};
 });
}
export function splitSegments(rows){
 const chunks=[];let current=[];
 for(const r of rows){if(current.length&&current.at(-1).phase!==r.phase){chunks.push(current);current=[];}current.push(r);}if(current.length)chunks.push(current);
 const segments=[];
 for(const chunk of chunks){
  let start=0,i=0;
  while(i<chunk.length){if(chunk[i].valid){i++;continue;}const a=i;while(i<chunk.length&&!chunk[i].valid)i++;if(i-a>=14){if(a>start)segments.push(chunk.slice(start,a));start=i;}}
  if(start<chunk.length)segments.push(chunk.slice(start));
 }
 return segments.filter(r=>r.some(d=>d.valid)).map((r,index)=>({index,startDate:r[0].date,endDate:r.at(-1).date,phase:r[0].phase,label:r[0].phaseLabel,calendarDays:r.length,validDays:r.filter(d=>d.valid).length,rows:r}));
}

function numericPairs(x,y){if(x.length!==y.length)throw new Error('配对长度不同。');const p=[];for(let i=0;i<x.length;i++)if(numeric(x[i])&&numeric(y[i]))p.push([x[i],y[i]]);return p;}
export function kendallTauB(x,y){
 const pairs=numericPairs(x,y),n=pairs.length;if(n<2)return null;
 const ys=unique(pairs.map(p=>p[1])).sort((a,b)=>a-b),rank=new Map(ys.map((v,i)=>[v,i+1]));
 const tree=new Float64Array(ys.length+2),add=i=>{for(;i<tree.length;i+=i&-i)tree[i]++;},sum=i=>{let s=0;for(;i>0;i-=i&-i)s+=tree[i];return s;};
 pairs.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let tieX=0,tieY=0,seen=0,score=0;
 const countsY=new Map();for(const [,yv]of pairs)countsY.set(yv,(countsY.get(yv)??0)+1);for(const c of countsY.values())tieY+=choose2(c);
 for(let i=0;i<n;){let j=i+1;while(j<n&&pairs[j][0]===pairs[i][0])j++;tieX+=choose2(j-i);
  for(let k=i;k<j;k++){const r=rank.get(pairs[k][1]);score+=sum(r-1)-(seen-sum(r));}
  for(let k=i;k<j;k++)add(rank.get(pairs[k][1]));seen+=j-i;i=j;
 }
 const denominator=Math.sqrt((choose2(n)-tieX)*(choose2(n)-tieY));return denominator?score/denominator:null;
}
function lowerBound(a,v){let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<v)lo=m+1;else hi=m;}return lo;}
function upperBound(a,v){let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m]<=v)lo=m+1;else hi=m;}return lo;}
export function cliffsDelta(exposed,baseline){
 const a=exposed.filter(numeric),b=baseline.filter(numeric).sort((a,b)=>a-b);if(!a.length||!b.length)return null;
 let s=0;for(const v of a)s+=lowerBound(b,v)-(b.length-upperBound(b,v));return s/(a.length*b.length);
}
export function averageRanks(values){const sorted=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v),r=Array(values.length);for(let i=0;i<sorted.length;){let j=i+1;while(j<sorted.length&&sorted[j].v===sorted[i].v)j++;const rank=(i+j+1)/2;for(let k=i;k<j;k++)r[sorted[k].i]=rank;i=j;}return r;}
export function rankEtaSquared(groups,scores){
 if(groups.length!==scores.length)throw new Error('配对长度不同。');const p=groups.map((g,i)=>[g,scores[i]]).filter(([g,v])=>g!==null&&g!==undefined&&numeric(v));if(p.length<2)return null;
 const ranks=averageRanks(p.map(v=>v[1])),mean=(p.length+1)/2,map=new Map();let total=0;
 for(let i=0;i<p.length;i++){const g=p[i][0];if(!map.has(g))map.set(g,[]);map.get(g).push(ranks[i]);total+=(ranks[i]-mean)**2;}
 if(map.size<2||!total)return null;let between=0;for(const g of map.values()){const m=g.reduce((a,b)=>a+b,0)/g.length;between+=g.length*(m-mean)**2;}return Math.max(0,Math.min(1,between/total));
}
export function proportionDifference(x,y){
 const p=numericPairs(x,y).filter(([a,b])=>[0,1].includes(a)&&[0,1].includes(b)),a=p.filter(r=>r[0]===1),b=p.filter(r=>r[0]===0);return a.length&&b.length?a.reduce((s,r)=>s+r[1],0)/a.length-b.reduce((s,r)=>s+r[1],0)/b.length:null;
}
export function phiCoefficient(x,y){const p=numericPairs(x,y).filter(([a,b])=>[0,1].includes(a)&&[0,1].includes(b));let a=0,b=0,c=0,d=0;for(const [xv,yv]of p){if(xv&&yv)a++;else if(xv)b++;else if(yv)c++;else d++;}const den=Math.sqrt((a+b)*(c+d)*(a+c)*(b+d));return den?(a*d-b*c)/den:null;}
export function cramerV(table){
 if(!Array.isArray(table)||table.length<2||table[0]?.length<2||table.some(r=>r.length!==table[0].length||r.some(v=>!numeric(v)||v<0)))return null;
 const rs=table.map(r=>r.reduce((a,b)=>a+b,0)),cs=table[0].map((_,j)=>table.reduce((s,r)=>s+r[j],0)),n=rs.reduce((a,b)=>a+b,0);if(!n||rs.some(v=>!v)||cs.some(v=>!v))return null;
 let chi=0;for(let i=0;i<table.length;i++)for(let j=0;j<table[0].length;j++){const e=rs[i]*cs[j]/n;chi+=(table[i][j]-e)**2/e;}return Math.sqrt(chi/(n*Math.min(table.length-1,table[0].length-1)));
}
function contingency(pairs,levelsX,levelsY){return levelsX.map(x=>levelsY.map(y=>pairs.filter(p=>p.x===x&&p.y===y).length));}
export function methodFor(x,y,records=[]){
 const a=descriptor(x,records),b=descriptor(y,records);if(!a||!b||x===y)return null;
 if(b.score){if(a.kind==='binary')return 'cliffs_delta';if(a.kind==='nominal')return 'rank_eta_squared';if(['continuous','ordinal'].includes(a.kind))return 'kendall_tau_b';}
 if(a.kind==='binary'&&b.kind==='binary')return 'proportion_difference';
 if(['nominal','binary'].includes(a.kind)&&['nominal','binary'].includes(b.kind))return 'cramers_v';
 return null;
}
export function effectStatistic(method,pairs,expectedLevels=null){
 const p=pairs.filter(r=>r.valid!==false&&r.x!==null&&r.y!==null);
 const xs=p.map(r=>r.x),ys=p.map(r=>r.y),lx=unique(xs),ly=unique(ys);
 if(expectedLevels&&(expectedLevels.x?.some(v=>!lx.includes(v))||expectedLevels.y?.some(v=>!ly.includes(v))))return null;
 if(method==='kendall_tau_b')return kendallTauB(xs,ys);
 if(method==='cliffs_delta')return cliffsDelta(p.filter(r=>r.x===1).map(r=>r.y),p.filter(r=>r.x===0).map(r=>r.y));
 if(method==='rank_eta_squared')return rankEtaSquared(xs,ys);
 if(method==='proportion_difference')return proportionDifference(xs,ys);
 if(method==='cramers_v')return cramerV(contingency(p,lx,ly));
 return null;
}
export function rngFromSeed(seed){let a=Number(seed)>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function movingBlockIndices(length,blockLength,rng){
 if(!Number.isInteger(length)||!Number.isInteger(blockLength)||blockLength<1||blockLength>length)throw new Error('分块长度无效。');
 const indices=[],blocks=[];while(indices.length<length){const start=Math.floor(rng()*(length-blockLength+1)),count=Math.min(blockLength,length-indices.length);blocks.push({start,count});for(let j=0;j<count;j++)indices.push(start+j);}return {indices,blocks};
}
export function percentile(sorted,p){if(!sorted.length)return null;const at=(sorted.length-1)*p,lo=Math.floor(at),hi=Math.ceil(at);return sorted[lo]+(sorted[hi]-sorted[lo])*(at-lo);}
function acfOne(rows,key){
 const vals=rows.map(r=>numeric(r[key])?r[key]:null),observed=vals.filter(v=>v!==null);if(observed.length<3)return null;
 const mean=observed.reduce((a,b)=>a+b,0)/observed.length,den=observed.reduce((s,v)=>s+(v-mean)**2,0);if(!den)return null;
 let numerator=0,count=0;for(let i=1;i<vals.length;i++)if(vals[i]!==null&&vals[i-1]!==null){numerator+=(vals[i]-mean)*(vals[i-1]-mean);count++;}return count>=3?numerator/den:null;
}
function groupCounts(pairs,key){return unique(pairs.map(p=>p[key])).map(value=>({value,n:pairs.filter(p=>p[key]===value).length,weeks:unique(pairs.filter(p=>p[key]===value).map(p=>Math.floor((p.ordinal+3)/7))).length}));}
function transitions(pairs,key){let n=0;for(let i=1;i<pairs.length;i++)if(pairs[i][key]!==pairs[i-1][key])n++;return n;}
export function createAnalysis(records,config={}){
 const dates=defaultDates(records,config),c={x:'sleepHours',y:'anxiety',lag:0,scoreView:'primary',blockLength:7,repetitions:2000,seed:20261028,segmentIndex:0,phaseBoundaries:[],...config,...dates};
 c.phaseBoundaries=(c.phaseBoundaries??[]).map(p=>({date:p.date,label:String(p.label??'已标记阶段').slice(0,120)}));
 const a=descriptor(c.x,records),b=descriptor(c.y,records),method=methodFor(c.x,c.y,records);
 const daily=buildDailyData(records,c),calendarRows=pairCalendar(daily.rows,c),segments=splitSegments(calendarRows),selectedSegment=segments[c.segmentIndex]??null,rows=selectedSegment?.rows??[],validPairs=rows.filter(r=>r.valid);
 const rawPoint=effectStatistic(method,validPairs),states=[],intervalStates=[],warnings=[];
 const add=(s,summary=false)=>{if(!intervalStates.includes(s))intervalStates.push(s);if(summary&&!states.includes(s))states.push(s);};
 const n=validPairs.length,calendarDays=rows.length,span=n?validPairs.at(-1).ordinal-validPairs[0].ordinal+1:0,coverage=calendarDays?n/calendarDays:0;
 const groupsX=groupCounts(validPairs,'x'),groupsY=groupCounts(validPairs,'y');
 if(!method||!a||!b||c.lag!==0&&c.lag!==1||calendarRows.length>366||![3,7,14].includes(c.blockLength)||c.repetitions!==2000||!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||groupsX.length>8&&a?.kind==='nominal'||groupsY.length>8&&b?.kind==='nominal'||c.phaseBoundaries.some(p=>!Number.isFinite(dateOrdinal(p.date)))||unique(c.phaseBoundaries.map(p=>p.date)).length!==c.phaseBoundaries.length)add('outside_tested_support',true);
 if(n<20)add('insufficient_pairs',true);else if(n<60)add('insufficient_pairs');
 if(span<28)add('time_span',true);else if(calendarDays<Math.max(84,8*c.blockLength))add('time_span');
 if(rawPoint===null||groupsX.length<2||groupsY.length<2)add('constant',true);
 for(const [d,groups]of [[a,groupsX],[b,groupsY]])if(d&&['binary','nominal'].includes(d.kind)){
  if(groups.length<2)add('constant',true);
  if(groups.some(g=>g.n<5))add('sparse_group',true);
  if(d.kind==='binary'&&groups.some(g=>g.n<15||g.weeks<4))add('sparse_group');
 }
 if(coverage<.7)add('coverage');
 const time=validPairs.map(r=>r.ordinal),trendX=a&&['continuous','ordinal','binary'].includes(a.kind)?kendallTauB(time,validPairs.map(r=>r.x)):null,trendY=b&&['continuous','ordinal','binary'].includes(b.kind)?kendallTauB(time,validPairs.map(r=>r.y)):null;
 const singleSwitch=a&&['binary','nominal'].includes(a.kind)&&groupsX.length>1&&transitions(validPairs,'x')<=groupsX.length-1||b&&['binary','nominal'].includes(b.kind)&&groupsY.length>1&&transitions(validPairs,'y')<=groupsY.length-1;
 const majorTrend=n>=20&&(Math.abs(trendX??0)>=.7||Math.abs(trendY??0)>=.7||Math.abs(trendX??0)>=.5&&Math.abs(trendY??0)>=.5);
 if(singleSwitch||majorTrend){add('phase_or_trend_confounding');warnings.push(singleSwitch?'暴露几乎只发生一次阶段转换，难以与时间或治疗阶段区分。':'明显时间趋势可能造成共同变化，无法据此判断方向。');}
 const acfX=a&&['continuous','ordinal','binary'].includes(a.kind)?acfOne(rows,'x'):null,acfY=b&&['continuous','ordinal','binary'].includes(b.kind)?acfOne(rows,'y'):null;
 if(Math.abs(acfX??0)>.8||Math.abs(acfY??0)>.8){add('outside_tested_support');warnings.push('相邻日期依赖较强，当前有限验证不足以支持区间。');}
 if(c.scoreView==='estimated')warnings.push('此视图仅使用叙述生成并经确认的数值建议；不是独立、直接自评，不能与主视图混合解释。');
 const catalogInfo=analysisCatalogInfo(records);if(catalogInfo.customOmitted)warnings.push(`自定义分类超过50个，按稳定标识顺序仅纳入前50个；另有${catalogInfo.customOmitted}个未纳入当前分析目录，原始记录仍保留。`);
 if(a?.medication)warnings.push(a.prn?'按需用药常因先出现不适而发生；适应证混杂与反向因果会影响结果。不能据此调整药物。':'用药记录受适应证、剂量、时间与其他治疗影响；这里不能评价药物效果或指导调整。');
 if(segments.length>1)warnings.push('存在已标记阶段或至少14天的配对缺口；只分析所选的一段，不跨段汇总。');
 if(rows.length&&daily.rows.some(r=>r.provenance.ambiguousDaily))warnings.push('同日多份每日记录的数值不一致时该字段按未知处理，未静默挑选一份。');
 const allowedPoint=states.some(s=>['insufficient_pairs','time_span','sparse_group','constant','outside_tested_support'].includes(s))?null:rawPoint;
 const directionAllowed=allowedPoint!==null&&!intervalStates.includes('phase_or_trend_confounding')&&!intervalStates.includes('outside_tested_support');
 return {version:ENGINE_VERSION,config:c,method,xVariable:a??null,yVariable:b??null,calendarRows,segments,selectedSegment,rows,validPairs,point:allowedPoint,rawPoint,interval:null,states,intervalStates,intervalEligible:intervalStates.length===0,directionAllowed,diagnostics:{trendX,trendY,acfX,acfY,singleSwitch:Boolean(singleSwitch),majorTrend,warnings,phi:method==='proportion_difference'?phiCoefficient(validPairs.map(p=>p.x),validPairs.map(p=>p.y)):null},counts:{pairedDays:n,calendarDays,fullCalendarDays:calendarRows.length,spanDays:span,coverage,missingDays:calendarDays-n,groupsX,groupsY,retrospectiveRecords:daily.rows.reduce((s,r)=>s+r.provenance.retrospectiveRecords,0)},excluded:daily.excluded,calibration:'exploratory-method-based-not-calibrated',rangeLabel:'探索性方法区间（第2.5–97.5百分位；未验证名义覆盖率）'};
}
function abort(){const e=new Error('分析已取消。');e.name='AbortError';throw e;}
export async function bootstrapAnalysis(prepared,{onProgress=()=>{},shouldCancel=()=>false,yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
 if(shouldCancel())abort();
 const out={...prepared,states:[...prepared.states],intervalStates:[...prepared.intervalStates],interval:null};
 if(!prepared.intervalEligible)return out;
 const {blockLength:L,repetitions:B,seed}=prepared.config,rng=rngFromSeed(seed),values=[],rows=prepared.rows;
 const expectedLevels={x:['binary','nominal'].includes(prepared.xVariable.kind)?unique(prepared.validPairs.map(p=>p.x)):null,y:['binary','nominal'].includes(prepared.yVariable.kind)?unique(prepared.validPairs.map(p=>p.y)):null};
 for(let i=0;i<B;i++){
  if(shouldCancel())abort();
  const {indices}=movingBlockIndices(rows.length,L,rng),sample=indices.map(i=>rows[i]);
  const v=effectStatistic(prepared.method,sample,expectedLevels);if(numeric(v))values.push(v);
  if((i+1)%25===0||i+1===B){onProgress({completed:i+1,total:B,finite:values.length});await yieldControl();}
 }
 if(shouldCancel())abort();
 out.bootstrap={finite:values.length,total:B,finiteFraction:values.length/B,blockLength:L,seed};
 if(values.length/B<.99){out.states.push('bootstrap_unstable');out.intervalStates.push('bootstrap_unstable');out.intervalEligible=false;return out;}
 values.sort((a,b)=>a-b);
 out.interval={low:percentile(values,.025),high:percentile(values,.975),finite:values.length,total:B,blockLength:L,seed,method:'moving-block-percentile',calibrated:false};
 return out;
}
export async function analyzeRecords(records,config,options){return bootstrapAnalysis(createAnalysis(records,config),options);}
// Exact deterministic serialization instead of a short collision-prone hash.
// It includes every record and engine version so old data cannot share a key.
export function cacheKey(records,config){return ENGINE_VERSION+'\n'+JSON.stringify(config)+'\n'+JSON.stringify(records);}

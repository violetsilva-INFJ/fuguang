// Assessment-window observations. This module never turns a scale into daily scores.
import {SCREENERS} from './core.js';
import {analysisVariables,buildDailyData,dateOrdinal,calendarDate,kendallTauB,rankEtaSquared} from './analysis.js';

export const SCALE_ENGINE_VERSION='fuguang-scale-windows-1.1.0';
const supported=['sleepHours','exerciseMinutes','activityMinutes','activityEventCount','activityPresence','legacyActivityMinutes','dietEventCount','legacyDietEventCount','gameMinutes','caffeineCups','caffeineLabelMg','medicationPresence','prnPresence','caffeinePresence','drinkType','sleepQuality','symptomIntensity'];
const minKnownFor=recallDays=>Math.ceil(recallDays*10/14);
export function scaleExposures(records=[],{recallDays=14}={}){const minKnownDays=minKnownFor(recallDays);return analysisVariables(records).filter(v=>supported.includes(v.id)||['activity','diet'].includes(v.domain)).map(v=>({
 ...v,originalKind:v.kind,kind:v.kind==='nominal'?'nominal':'continuous',role:'x',
 aggregation:v.kind==='nominal'?'stable-category':v.kind==='binary'?'fraction-known-days':'mean-known-days',
 label:v.label+(v.kind==='nominal'?' · 窗口内一致的品类':v.kind==='binary'?' · 已知日期的出现比例':' · 已知日期的平均值'),
 note:[v.note,v.kind==='nominal'?`${recallDays}天内至少${minKnownDays}个已知日，且已知日品类一致才配对；混合品类不编码。`:v.kind==='binary'?`只用明确的0/1日，至少${minKnownDays}/${recallDays}日；分母是已知日，不是默认${recallDays}天，也不改成“任何一天有”。`:`只用明确填写的日值，至少${minKnownDays}/${recallDays}日；缺失不按0补齐。`].filter(Boolean).join(' '),
}));}
export const SCALE_EXPOSURES=scaleExposures();
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
const unique=a=>[...new Set(a)];
function compareText(a,b){return a<b?-1:a>b?1:0;}
const byEnd=(a,b)=>compareText(a.windowEnd,b.windowEnd)||compareText(a.windowStart,b.windowStart)||compareText(a.recordId,b.recordId);
function provenanceOf(record){return {recordId:String(record.id??''),type:record.type??null,localDate:record.localDate??null,occurredAt:record.occurredAt??null,createdAt:record.createdAt??null,updatedAt:record.updatedAt??null,timezoneOffsetMinutes:record.timezoneOffsetMinutes??null,entryProvenance:record.entryProvenance?{...record.entryProvenance}:null};}

function assessmentWindow(record,spec){
 const recallDays=spec?.recallDays??14;
 const w={recordId:String(record.id??''),windowStart:record.windowStart??null,windowEnd:record.windowEnd??null,date:record.windowEnd??record.localDate??null,targetDate:record.windowEnd??record.localDate??null,recallDays,total:null,status:'invalid',reasons:[],coverage:null,knownDays:null,missingDays:null,knownDates:[],missingDates:[],x:null,source:null,assessmentProvenance:provenanceOf(record)};
 if(!spec||record.scaleVersion!==spec.version)w.reasons.push('unverified_scale_version');
 if(!w.recordId)w.reasons.push('missing_record_id');
 const start=dateOrdinal(w.windowStart),end=dateOrdinal(w.windowEnd);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end-start!==recallDays-1||record.localDate!==w.windowEnd||record.recallDays!==recallDays)w.reasons.push('invalid_recall_window');
 if(record.entryProvenance?.source==='narrative-reviewed')w.reasons.push('not_independent_assessment');
 const answers=record.answers;
 if(!spec||!Array.isArray(answers)||answers.length!==spec.items.length||answers.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>3))){w.reasons.push('invalid_item_responses');return w;}
 const incomplete=answers.some(v=>v===null);
 if(incomplete){
  if(record.total!==null)w.reasons.push('score_integrity_mismatch');
  if(w.reasons.length)return w;
  w.status='incomplete';w.reasons.push('incomplete_assessment');return w;
 }
 const total=answers.reduce((sum,v)=>sum+v,0);
 if(record.total!==total)w.reasons.push('score_integrity_mismatch');
 if(w.reasons.length)return w;
 w.total=total;w.status='complete';return w;
}
function sourceRelevant(r,variable,allDay=[]){
 if(r.entryProvenance?.source==='narrative-reviewed')return false;
 const id=variable?.id;
 if(variable?.domain==='activity')return r.type==='checkin'&&r.domain==='activity'||r.type==='activity'&&r.groupId===variable.groupId&&(!variable.categoryId||r.categoryId===variable.categoryId);
 if(variable?.domain==='diet')return r.type==='diet'&&r.categoryId===variable.categoryId&&(variable.measure!=='quantity'||r.quantityUnit===variable.quantityUnit&&(variable.quantityUnit!=='other'||r.quantityUnitLabel===variable.quantityUnitLabel));
 if(id==='sleepHours'||id==='sleepQuality'){const independent=allDay.some(s=>s.type==='sleep'&&s.entryProvenance?.source!=='narrative-reviewed');return r.type===(independent?'sleep':'daily')&&(id==='sleepHours'?numeric(r.sleepHours):r.sleepDetails?.subjective&&r.sleepDetails.subjective!=='unknown');}
 if(id==='exerciseMinutes')return r.type==='daily'&&numeric(r[id]);
 if(['activityMinutes','activityEventCount','activityPresence','legacyActivityMinutes','gameMinutes'].includes(id))return r.type==='checkin'&&r.domain==='activity'||r.type==='activity'&&(id==='gameMinutes'?r.tags?.includes('game'):id==='legacyActivityMinutes'?!r.groupId:true);
 if(['dietEventCount','legacyDietEventCount'].includes(id))return r.type==='diet'&&(id==='dietEventCount'||!r.categoryId)||id==='dietEventCount'&&r.type==='caffeine';
 if(id==='symptomIntensity')return r.type==='symptom'&&numeric(r.intensity);
 if(['medicationPresence','prnPresence'].includes(id))return r.type==='medication'||r.type==='daily'&&['none','some'].includes(r.medicationStatus)||r.type==='checkin'&&r.domain==='medication';
 if(['caffeinePresence','caffeineCups','caffeineLabelMg','drinkType'].includes(id))return r.type==='caffeine'||r.type==='daily'&&['none','some'].includes(r.caffeineStatus)||r.type==='checkin'&&r.domain==='caffeine';
 return false;
}
function aggregateWindow(window,xVariable,byDay){
 const records=[];for(let i=dateOrdinal(window.windowStart);i<=dateOrdinal(window.windowEnd);i++)records.push(...(byDay.get(calendarDate(i))??[]));
 const daily=buildDailyData(records,{startDate:window.windowStart,endDate:window.windowEnd,scoreView:'primary'}).rows;
 const key=xVariable?.id;
 const known=daily.filter(r=>{const v=r.values[key];return xVariable?.kind==='nominal'?typeof v==='string'&&v.length>0:numeric(v);});
 const knownDates=known.map(r=>r.date),missingDates=daily.filter(r=>!knownDates.includes(r.date)).map(r=>r.date);
 const relevant=records.filter(r=>sourceRelevant(r,xVariable,byDay.get(r.localDate)??[]));
 const source={mode:'explicit-structured-local',label:`结构化本地记录；按实际${window.recallDays}天窗口汇总`,aggregation:xVariable?.aggregation??null,scoreMode:'independent-item-responses',scaleRecordId:window.recordId,assessment:window.assessmentProvenance,exposureRecords:relevant.map(provenanceOf),
  exposureRecordIds:unique(relevant.map(r=>r.id).filter(Boolean)),retrospectiveRecordIds:unique(relevant.filter(r=>r.entryProvenance?.mode==='retrospective').map(r=>r.id).filter(Boolean)),
  knownDates,missingDates,days:known.map(r=>({date:r.date,value:r.values[key],recordIds:(byDay.get(r.date)??[]).filter(s=>sourceRelevant(s,xVariable,byDay.get(r.date)??[])).map(s=>s.id).filter(Boolean)})),
  measurementSources:key==='sleepQuality'?['subjective-self-report']:key==='caffeineLabelMg'?['product-label-only']:['explicit-user-records'],
 };
 const extra={coverage:known.length/window.recallDays,knownDays:known.length,missingDays:window.recallDays-known.length,knownDates,missingDates,source,x:null};
 if(!xVariable)return {...extra,reasons:['unsupported_exposure'],status:'invalid'};
 if(known.length<minKnownFor(window.recallDays))return {...extra,reasons:['insufficient_exposure_coverage'],status:'coverage_excluded'};
 const values=known.map(r=>r.values[key]);
 if(xVariable.kind==='nominal'){
  const categories=unique(values);
  if(categories.length!==1||categories[0]==='混合品类')return {...extra,reasons:['mixed_window_category'],status:'mixed_category_excluded'};
  extra.x=categories[0];
 }else extra.x=values.reduce((sum,value)=>sum+value,0)/values.length;
 return {...extra,reasons:[],status:'eligible'};
}

export function createScaleAnalysis(records,config={}){
 const c={view:'scale',scaleId:'gad7',x:'sleepHours',...config};
 const spec=SCREENERS.find(s=>s.id===c.scaleId),recallDays=spec?.recallDays??14,minKnownDays=minKnownFor(recallDays),minSpanDays=7*recallDays,xVariable=scaleExposures(records,{recallDays}).find(x=>x.id===c.x)??null;
 const selected=records.filter(r=>r.type==='screening'&&r.scaleId===c.scaleId);
 const knownEnds=selected.map(r=>Number.isFinite(dateOrdinal(r.windowEnd))?r.windowEnd:r.localDate).filter(d=>Number.isFinite(dateOrdinal(d))).sort();
 c.startDate??=knownEnds[0]??new Date().toISOString().slice(0,10);c.endDate??=knownEnds.at(-1)??c.startDate;
 const datesValid=Number.isFinite(dateOrdinal(c.startDate))&&Number.isFinite(dateOrdinal(c.endDate))&&c.startDate<=c.endDate;
 const windows=selected.filter(r=>{
  const date=Number.isFinite(dateOrdinal(r.windowEnd))?r.windowEnd:r.localDate;
  return !Number.isFinite(dateOrdinal(date))||datesValid&&date>=c.startDate&&date<=c.endDate;
 }).map(r=>assessmentWindow(r,spec));
 const counts={assessments:windows.length,complete:windows.filter(w=>w.status==='complete').length,incomplete:windows.filter(w=>w.status==='incomplete').length,invalid:windows.filter(w=>w.status==='invalid').length,overlapExcluded:0,nonOverlapping:0,coverageExcluded:0,mixedCategoryExcluded:0,pairedWindows:0,spanDays:0};
 // Select earliest-ending non-overlapping assessments before looking at X or Y.
 // A poorly recorded selected window cannot be replaced by an overlapping one.
 const selectedWindows=[];let lastEnd=-Infinity;
 for(const w of windows.filter(w=>w.status==='complete').sort(byEnd)){
  if(dateOrdinal(w.windowStart)>lastEnd){selectedWindows.push(w);lastEnd=dateOrdinal(w.windowEnd);}
  else {w.status='overlap_excluded';w.reasons.push('overlapping_recall_window');counts.overlapExcluded++;}
 }
 counts.nonOverlapping=selectedWindows.length;
 const byDay=new Map();for(const r of records)if(Number.isFinite(dateOrdinal(r.localDate))){if(!byDay.has(r.localDate))byDay.set(r.localDate,[]);byDay.get(r.localDate).push(r);}
 for(const w of windows.filter(w=>w.status==='complete'||w.status==='overlap_excluded')){
  const overlap=w.status==='overlap_excluded',priorReasons=[...w.reasons],a=aggregateWindow(w,xVariable,byDay);
  Object.assign(w,a,{exposureStatus:a.status});
  if(overlap){w.status='overlap_excluded';w.reasons=[...priorReasons,...a.reasons];}
  else if(a.status==='coverage_excluded')counts.coverageExcluded++;else if(a.status==='mixed_category_excluded')counts.mixedCategoryExcluded++;
 }
 const eligibleWindows=selectedWindows.filter(w=>w.status==='eligible');
 const validPairs=eligibleWindows.map(w=>({date:w.windowEnd,targetDate:w.windowEnd,windowStart:w.windowStart,windowEnd:w.windowEnd,x:w.x,y:w.total,coverage:w.coverage,knownDays:w.knownDays,missingDays:w.missingDays,knownDates:w.knownDates,missingDates:w.missingDates,source:w.source,recordId:w.recordId}));
 counts.pairedWindows=validPairs.length;counts.spanDays=validPairs.length?dateOrdinal(validPairs.at(-1).date)-dateOrdinal(validPairs[0].date):0;
 const states=[],warnings=[],groups=unique(validPairs.map(p=>p.x)).map(value=>({value,n:validPairs.filter(p=>p.x===value).length}));
 const method=xVariable?(xVariable.kind==='nominal'?'rank_eta_squared':'kendall_tau_b'):null;
 const rawPoint=method==='rank_eta_squared'?rankEtaSquared(validPairs.map(p=>p.x),validPairs.map(p=>p.y)):method==='kendall_tau_b'?kendallTauB(validPairs.map(p=>p.x),validPairs.map(p=>p.y)):null;
 if(!spec||!xVariable||!datesValid||c.view!=='scale'||xVariable.kind==='nominal'&&groups.length>8)states.push('outside_tested_support');
 if(validPairs.length<8)states.push('insufficient_windows');
 if(counts.spanDays<minSpanDays)states.push('time_span');
 if(rawPoint===null||unique(validPairs.map(p=>p.x)).length<2||unique(validPairs.map(p=>p.y)).length<2)states.push('constant');
 if(xVariable?.kind==='nominal'&&groups.some(g=>g.n<3))states.push('sparse_group');
 const times=validPairs.map(p=>dateOrdinal(p.date)),trendX=xVariable?.kind!=='nominal'?kendallTauB(times,validPairs.map(p=>p.x)):null,trendY=kendallTauB(times,validPairs.map(p=>p.y));
 let changes=0;for(let i=1;i<validPairs.length;i++)if(validPairs[i].x!==validPairs[i-1].x)changes++;
 const singleSwitch=Boolean(xVariable&&['binary','nominal'].includes(xVariable.originalKind)&&groups.length>1&&changes<=groups.length-1);
 const majorTrend=validPairs.length>=8&&(Math.abs(trendX??0)>=.7||Math.abs(trendY??0)>=.7||Math.abs(trendX??0)>=.5&&Math.abs(trendY??0)>=.5);
 if(singleSwitch||majorTrend)warnings.push('时间趋势或单次阶段转换使方向难以区分；保留原始观察，不作方向结论。');
 warnings.push('两周量表回顾与同期暴露仍可能相互影响，且受缺失、测量误差和未记录因素混杂；不是因果或诊断。');
 if(xVariable?.medication)warnings.push(xVariable.prn?'按需用药可能发生在不适之后，存在适应证混杂与反向因果；不能据此调整药物。':'适应证、剂量、其他治疗与时间变化会影响用药记录；不能评价药物效果或据此调整药物。');
 const point=states.length?null:rawPoint;
 return {version:SCALE_ENGINE_VERSION,config:c,scale:{id:c.scaleId,label:spec?.label??c.scaleId,version:spec?.version??null,max:spec?spec.items.length*3:null,recallDays,minKnownDays,minSpanDays},xVariable,method,windows,eligibleWindows,selectedWindows,validPairs,point,rawPoint,interval:null,rangeReason:'sparse-window-interval-not-validated',states,directionAllowed:point!==null&&xVariable?.kind!=='nominal'&&!singleSwitch&&!majorTrend,
  diagnostics:{trendX,trendY,singleSwitch,majorTrend,groupsX:groups,warnings,intervalValidated:false,coverageRule:`至少${minKnownDays}/${recallDays}个已知日；工程门槛，不保证可推断性`,selectionRule:'按结束日、起始日、记录ID排序，先贪心选择最早结束且不重叠的完整同版本评估，再检查暴露覆盖；不按得分或暴露挑选',otherInstrumentsExcluded:records.filter(r=>r.type==='screening'&&r.scaleId!==c.scaleId).length},counts};
}

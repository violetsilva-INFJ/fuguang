import {TOPICS,localDay,shiftDay,ratingSource} from './core.js';
const UNCERTAIN=/(可能|也许|或许|好像|似乎|不确定|大概|大约|左右|说不准|如果|打算|计划|准备|想要|听说|别人|朋友说|他说|她说)/;
const NEGATION=/(没有|没喝|没吃|没用|没服|没去|没做|未曾|未服|未用|不曾|不是|并非|并不|不想|不用|不喝|不吃|不要|不焦虑|不紧张|不低落|不难过|已不|不再)/;
const NUM={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
const topicPatterns=[['感受',/焦虑|不安|心情|感受|低落|郁闷|紧张|难过|开心|烦躁/],['饮食',/吃了|吃过|午餐|晚餐|早餐|午饭|晚饭|早饭/],['咖啡与茶',/喝了[^。！；]*?(咖啡|茶|拿铁|美式)|咖啡因/],['用药',/(服用|吃了|用了|用药)[^。！；]*?(药|mg|毫克|片|粒)|服药/],['睡眠',/睡了|睡眠|失眠|入睡|醒来/],['运动',/跑了|跑步|散步|运动|游泳|健身/],['情感与关系',/伴侣|感情|关系|恋人|爱人|吵架|相处/],['社交与独处',/朋友|同事|社交|独处|见面|聚会|聊天/]];
export function sentences(text){return text.match(/[^。！？；\n，,]+[。！？；\n，,]?/g)?.flatMap(s=>s.split(/(?=但是|不过|但)/)).map(s=>s.trim()).filter(Boolean)??[];}
export function contextualClauses(text){
 let temporal='present';return sentences(text).map(quote=>{
  const anchor=quote.replace(/比(?:昨天|昨日|早上|上午|刚才|之前)/g,'');
  if(/现在|此刻|目前|眼下|今天/.test(anchor))temporal='present';
  else if(/明天|后天|将来|以后|等会|稍后|待会|打算|计划|准备|如果/.test(anchor))temporal='future';
  else if(/昨天|昨日|昨晚|前天|上周|去年|以前|曾经|之前|刚才|刚刚|早上|上午|那时|过去/.test(anchor))temporal='past';
  return {quote,temporal};
 });
}
export function isAffirmative(text){return !NEGATION.test(text)&&!UNCERTAIN.test(text);}
const terms={anxiety:'(?:焦虑(?:感|强度|程度)?|不安(?:感|程度)?|紧张(?:感|程度)?)',lowMood:'(?:低落(?:感|程度)?|郁闷(?:感|程度)?|难过(?:感|程度)?|抑郁感)'};
function blankSuggestion(){return {value:null,provenance:{origin:'unset',sourcePhrase:'',suggestedValue:null,confirmed:false,relativeChange:null,baseline:null,delta:null},comparison:null};}
function comparisonRequest(quote,metric){
 const term=new RegExp(terms[metric]);if(!term.test(quote))return null;
 const down=/(?:少|轻|低|减轻|减少|缓解|缓和|好)(?:了)?(?:一点|一些|点|些|不少|很多|\d+分)|没(?:有)?那么|不再那么/.test(quote);
 const up=/(?:更|更加|越来越|加重|增加|多了|高了)|(?:焦虑|不安|低落|郁闷|难过)了(?:一些|一点|点|些)/.test(quote);
 if(!down&&!up)return null;
 const target=/比(?:昨天|昨日)/.test(quote)?'yesterday':/比(?:早上|上午)/.test(quote)?'morning':/比刚才/.test(quote)?'recent':'unspecified';
 const m=quote.match(/(?:多|高|少|低|增加|减少|加重|减轻)(?:了)?\s*(10|[0-9]|[一二两三四五六七八九十])\s*分/);
 const step=m?(NUM[m[1]]??Number(m[1])):1;
 return {metric,target,direction:down&&!up?'decrease':up&&!down?'increase':'mixed',delta:down&&!up?-step:up&&!down?step:null,explicitDelta:!!m,sourcePhrase:quote};
}
export function emotionSuggestions(text){
 const result={anxiety:blankSuggestion(),lowMood:blankSuggestion()};
 for(const metric of ['anxiety','lowMood']){
  const candidates=[],comparisons=[];
  for(const {quote,temporal}of contextualClauses(text)){
   if(temporal!=='present'||UNCERTAIN.test(quote))continue;
   if(NEGATION.test(quote)&&!/(?:没|没有|不再)那么(?:的)?(?:焦虑|不安|低落|郁闷|难过)/.test(quote))continue;
   const comparison=comparisonRequest(quote,metric);
   if(comparison){if(!/没有(?:增加|减少|减轻|加重)|并不|并非|不是|不确定/.test(quote))comparisons.push(comparison);continue;}
   if(!isAffirmative(quote)||/时而|有时|忽高忽低|一会儿|从.+到|降到|升到/.test(quote))continue;
   const term=terms[metric];
   if(!/\d\s*[.．～~\-到至]/.test(quote)){
    const m=quote.match(new RegExp(`${term}(?:是|为|有)?\\s*(10|[0-9]|[零一二两三四五六七八九十])\\s*(?:分|/10)(?!\\d)`));
    if(m){candidates.push({value:NUM[m[1]]??Number(m[1]),origin:'explicit-number',sourcePhrase:m[0]});continue;}
   }
   for(const [degree,value]of [['极度|非常|特别|十分',9],['很|明显',7],['比较',6],['有些|中等',5],['有点|有一点|一点点|稍微|轻微',2]]){
    const m=quote.match(new RegExp(`(?:${degree})(?:地|的)?\\s*${term}`));
    if(m){candidates.push({value,origin:'estimated-language',sourcePhrase:m[0]});break;}
   }
  }
  if(candidates.length===1&&comparisons.length===0){const c=candidates[0];result[metric]={value:c.value,provenance:{origin:c.origin,sourcePhrase:c.sourcePhrase,suggestedValue:c.value,confirmed:false,relativeChange:null,baseline:null,delta:null},comparison:null};}
  else if(comparisons.length===1&&candidates.length===0){const c=comparisons[0];result[metric]={...blankSuggestion(),comparison:c,provenance:{...blankSuggestion().provenance,sourcePhrase:c.sourcePhrase,relativeChange:c.direction}};}
  else if(candidates.length+comparisons.length>1)result[metric].provenance={...result[metric].provenance,sourcePhrase:[...candidates.map(x=>x.sourcePhrase),...comparisons.map(x=>x.sourcePhrase)].join('；'),relativeChange:'mixed'};
 }
 return result;
}
export function explicitAnxiety(text){const s=emotionSuggestions(text).anxiety;return s.provenance.origin==='explicit-number'?{value:s.value,evidence:s.provenance.sourcePhrase}:null;}
export function baselineCandidates(records,request,now=new Date()){
 const day=localDay(now),cutoff=now.getTime();
 return records.filter(r=>['moment','narrative','daily'].includes(r.type)&&Number.isFinite(r[request.metric])&&Date.parse(r.occurredAt)<cutoff).filter(r=>{
  if(request.target==='yesterday')return r.localDate===shiftDay(day,-1);
  if(request.target==='morning'){const wall=new Date(Date.parse(r.occurredAt)-r.timezoneOffsetMinutes*60000),hour=wall.getUTCHours();return r.localDate===day&&hour>=5&&hour<12;}
  if(request.target==='recent')return Date.parse(r.occurredAt)>=cutoff-2*60*60000;
  return true;
 }).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,100);
}
export function comparedSuggestion(request,record){
 if(request.delta===null)throw new Error('变化方向不明确，请直接选择当下强度。');
 const value=Math.max(0,Math.min(10,record[request.metric]+request.delta));
 return {value,provenance:{origin:'relative-baseline',sourcePhrase:request.sourcePhrase,suggestedValue:value,confirmed:false,relativeChange:request.direction,delta:request.delta,baseline:{recordId:record.id,value:record[request.metric],occurredAt:record.occurredAt,localDate:record.localDate,timezoneOffsetMinutes:record.timezoneOffsetMinutes,excerpt:(record.originalText||record.event||record.note||'只有自评数字').slice(0,1000),origin:ratingSource(record,request.metric).origin}}};
}
export function parseNarrative(raw){
 const text=raw.trim();if(!text)throw new Error('先说一点，或写下一句话。');if(text.length>6000)throw new Error('这段叙述最多 6000 字。');
 const fragments=[];for(const {quote,temporal}of contextualClauses(text)){
  if(temporal!=='present'||!isAffirmative(quote))continue;
  for(const [topic,pattern]of topicPatterns)if(pattern.test(quote)&&!fragments.some(f=>f.topic===topic&&f.quote===quote))fragments.push({topic,quote});
 }
 const suggestions=emotionSuggestions(text);
 const timeMatches=text.match(/(?:今天|昨日|昨天|昨晚|刚才|刚刚|现在|此刻|前天|上午|下午|晚上|早上|[零一二两三四五六七八九十\d]+(?:个)?\s*(?:分钟|小时)前|[零一二两三四五六七八九十\d]+点(?:半)?)/g)||[];
 return {originalText:text,anxiety:suggestions.anxiety.value,lowMood:suggestions.lowMood.value,ratingProvenance:{anxiety:suggestions.anxiety.provenance,lowMood:suggestions.lowMood.provenance},comparisonRequests:[suggestions.anxiety.comparison,suggestions.lowMood.comparison].filter(Boolean),topics:[...new Set(fragments.map(f=>f.topic))],fragments:fragments.slice(0,12),timeNote:[...new Set(timeMatches)].join('、'),method:'local'};
}
export function validateAISuggestions(data,originalText){
 if(!data||typeof data!=='object'||!Array.isArray(data.fragments)||data.fragments.length>12)throw new Error('AI 返回格式不符合约定；可以继续使用本地整理。');
 const fragments=data.fragments.map(f=>{
  if(!f||!TOPICS.includes(f.topic)||typeof f.quote!=='string'||!f.quote.trim()||!originalText.includes(f.quote))throw new Error('AI 包含不在原话中的内容，已拒绝采用。');
  const containing=contextualClauses(originalText).filter(s=>s.quote.includes(f.quote));
  if(!containing.length||containing.some(s=>s.temporal!=='present'||!isAffirmative(s.quote)))throw new Error('AI 把否定、历史或不确定叙述当作事实，已拒绝采用。');
  return {topic:f.topic,quote:f.quote};
 });
 const local=parseNarrative(originalText);
 return {...local,fragments,topics:[...new Set(fragments.map(f=>f.topic))],method:'ai'};
}

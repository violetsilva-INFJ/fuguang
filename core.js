export const VERSION = 3;
export const MAX_RECORDS = 20000;
export const MAX_FILE = 12 * 1024 * 1024;
export const TYPES = ['narrative', 'moment', 'daily', 'sleep', 'checkin', 'medication', 'caffeine', 'diet', 'activity', 'symptom', 'occurrence', 'screening'];
export const ACTIVITY_GROUPS=[
 {id:'exercise',label:'运动',categories:[{id:'exercise.aerobic',label:'有氧运动'},{id:'exercise.strength',label:'力量训练'},{id:'exercise.mobility',label:'拉伸与活动度'},{id:'exercise.mindbody',label:'身心运动'},{id:'exercise.other',label:'其他运动'}]},
 {id:'outdoor',label:'户外',categories:[{id:'outdoor.walk',label:'散步'},{id:'outdoor.sunlight',label:'晒太阳'},{id:'outdoor.outing',label:'外出活动'},{id:'outdoor.other',label:'其他户外活动'}]},
 {id:'social',label:'社交与独处',categories:[{id:'social.in-person',label:'线下交流'},{id:'social.call',label:'电话交流'},{id:'social.online',label:'线上交流'},{id:'social.group',label:'集体活动'},{id:'social.alone',label:'独处'},{id:'social.other',label:'其他社交情境'}]},
 {id:'relationship',label:'关系事件',categories:[{id:'relationship.conversation',label:'交谈'},{id:'relationship.together',label:'相伴'},{id:'relationship.disagreement',label:'意见不同'},{id:'relationship.support',label:'获得或给予支持'},{id:'relationship.space',label:'需要一些空间'},{id:'relationship.other',label:'其他关系事件'}]},
 {id:'game',label:'游戏',categories:[{id:'game.casual',label:'休闲游戏'},{id:'game.strategy',label:'策略游戏'},{id:'game.action',label:'动作游戏'},{id:'game.roleplay',label:'角色扮演'},{id:'game.simulation',label:'模拟游戏'},{id:'game.other',label:'其他游戏'}]},
 {id:'other',label:'其他活动',categories:[{id:'other.work',label:'工作'},{id:'other.chore',label:'家务'},{id:'other.learning',label:'学习'},{id:'other.creative',label:'创作'},{id:'other.other',label:'其他活动'}]},
];
export const DIET_CATEGORIES=[{id:'staple',label:'主食'},{id:'vegetable',label:'蔬菜'},{id:'fruit',label:'水果'},{id:'protein',label:'肉蛋豆等'},{id:'dairy',label:'乳品'},{id:'snack',label:'零食与甜点'},{id:'mixed',label:'混合餐食'},{id:'water',label:'水'},{id:'other-drink',label:'其他饮品'},{id:'other',label:'其他饮食'}];
export const QUANTITY_UNITS=[{id:'g',label:'克'},{id:'ml',label:'毫升'},{id:'portion',label:'份'},{id:'piece',label:'个 / 块'},{id:'bowl',label:'碗'},{id:'cup',label:'杯'},{id:'other',label:'自定义单位'}];
const customCategory=id=>typeof id==='string'&&/^custom-[A-Za-z0-9_-]{8,73}$/.test(id);
export const TOPICS = ['感受','饮食','咖啡与茶','用药','睡眠','运动','情感与关系','社交与独处'];
export const MOODS = ['低落', '偏低', '平常', '不错', '愉快'];
export const RATING_ORIGINS=['explicit-number','estimated-language','relative-baseline','user-slider','edited-suggestion','legacy-unclassified','unset'];
export const CAFFEINE_REFERENCES=[
 {id:'hc-instant-2025',drink:'coffee',kind:'instant',label:'速溶咖啡',servingMl:237,minMg:76,maxMg:106,source:'Health Canada',url:'https://www.canada.ca/en/health-canada/services/food-nutrition/food-safety/food-additives/caffeine-foods.html'},
 {id:'hc-brewed-tea-2025',drink:'tea',kind:'black',label:'冲泡红茶',servingMl:237,minMg:30,maxMg:50,source:'Health Canada',url:'https://www.canada.ca/en/health-canada/services/food-nutrition/food-safety/food-additives/caffeine-foods.html'},
 {id:'hc-brewed-green-2025',drink:'tea',kind:'green',label:'冲泡绿茶',servingMl:237,minMg:30,maxMg:50,source:'Health Canada',url:'https://www.canada.ca/en/health-canada/services/food-nutrition/food-safety/food-additives/caffeine-foods.html'},
 {id:'fda-brewed-coffee-2024',drink:'coffee',kind:'brewed',label:'普通冲煮咖啡（非特调）',servingMl:355,minMg:113,maxMg:247,source:'FDA',url:'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much'},
];
export const DRINK_KINDS=[['unknown','尚未分类'],['brewed','普通冲煮咖啡（非特调）'],['instant','速溶咖啡'],['espresso','意式浓缩'],['latte','拿铁 / 奶咖'],['black','冲泡红茶'],['green','冲泡绿茶'],['oolong','乌龙茶'],['decaf','低因 / 脱因饮品'],['other','其他 / 自定义']];
export const SCALE_SOURCE={version:'inform-zh-2017-11-18-items-12May2013',url:'https://inform-iadr.com/wp-content/uploads/2024/03/DC-TMD-Chinese-Assessment-Instruments_revised-2017_11_18.pdf',manualUrl:'https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf',credit:'Copyright Pfizer Inc. 中文译者 Fu KY, Yap AU, Lei J, Liu MQ, Fan XF；INfORM 收录文档 2017，量表页标示 Consortium version 12May2013。',permission:'No permission required to reproduce, translate, display, or distribute.'};
export const SCALE_OPTIONS=['根本没有','有几天','一半以上的时间','几乎每天'];
export const SCALE_INSTRUCTION='过去 2 周内，下列问题是如何困扰你的？请在选定答案的方框内画勾。';
export const FUNCTIONAL_QUESTION='如果你对以上任一问题打钩，该问题对你完成工作、照料家事或与他人相处造成了多大困难？';
export const FUNCTIONAL_OPTIONS=['一点也不困难','有点困难','非常困难','极度困难'];
const PHQ_ITEMS=['做事没有兴趣或愉悦感','感觉低落、郁闷或没有希望','很难入睡或容易醒，或睡眠过多','感觉疲劳或没有精力','食欲不佳或饮食过量','自我感觉差——或觉得自己很失败，或令自己或家人失望','做事很难集中注意力，比如阅读报纸或看电视','行动或说话过于迟缓，以致他人能够觉察到了，或正好相反——过于多动或不安分以致活动比平常要多得多','觉得自己死掉会更好，或想以某种方式伤害自己'];
const GAD_ITEMS=['感到紧张、焦虑或不安','无法停止或控制的忧虑','对各种事情过于担心','很难放松','过于焦躁不安，以致难以平静地坐着','容易恼怒或被激惹','害怕会发生不好的事情'];
export const SCREENERS=[
 {id:'phq2',label:'PHQ-2',title:'简短工具 · 抑郁症状',items:PHQ_ITEMS.slice(0,2),cutpoints:[3],recallDays:14,version:SCALE_SOURCE.version,page:50},
 {id:'gad2',label:'GAD-2',title:'简短工具 · 焦虑症状',items:GAD_ITEMS.slice(0,2),cutpoints:[3],recallDays:14,version:SCALE_SOURCE.version,page:52},
 {id:'phq9',label:'PHQ-9',title:'快速筛查 · 抑郁症状',items:PHQ_ITEMS,cutpoints:[5,10,15,20],recallDays:14,version:SCALE_SOURCE.version,page:50},
 {id:'gad7',label:'GAD-7',title:'快速筛查 · 焦虑症状',items:GAD_ITEMS,cutpoints:[5,10,15],recallDays:14,version:SCALE_SOURCE.version,page:52},
];

export function ratingDescription(kind,value){
 if(value===null||value===undefined)return {text:'还没有填写',emoji:'◌'};
 const band=value===0?0:value<=2?1:value<=4?2:value<=6?3:value<=8?4:5;
 return kind==='lowMood'?{text:['没有低落感','一点点低落','有些低落','低落比较明显','很低落','低落格外强烈'][band],emoji:['🙂','😶','😕','😔','😞','😟'][band]}:{text:['此刻没有焦虑感','一点点不安','有些不安','不安比较明显','很不安','不安格外强烈'][band],emoji:['😌','😶','😟','😕','😣','😖'][band]};
}
export function ratingSource(record,kind){
 return record.ratingProvenance?.[kind]??{origin:record[kind]===null||record[kind]===undefined?'unset':'legacy-unclassified',sourcePhrase:'',suggestedValue:null,confirmed:true,relativeChange:null,baseline:null,delta:null};
}
function validateProvenance(value,score){
 assert(value&&typeof value==='object','评分来源格式不正确');
 const p={origin:choice(value.origin,RATING_ORIGINS,'评分来源'),sourcePhrase:text(value.sourcePhrase??'','评分原话',6000),suggestedValue:numeric(value.suggestedValue??null,'建议强度',0,10,true,true),confirmed:value.confirmed===true,relativeChange:value.relativeChange===null||value.relativeChange===undefined?null:choice(value.relativeChange,['increase','decrease','mixed'],'变化方向'),delta:numeric(value.delta??null,'建议变化量',-10,10,true,true),baseline:null};
 if(value.baseline){const b=value.baseline;p.baseline={recordId:text(b.recordId,'参照记录',80,true),value:numeric(b.value,'参照强度',0,10,false,true),occurredAt:dateValue(b.occurredAt,'参照时间'),localDate:text(b.localDate,'参照日期',10,true),excerpt:text(b.excerpt??'','参照原文',1000),origin:choice(b.origin??'legacy-unclassified',RATING_ORIGINS,'参照来源'),...(b.timezoneOffsetMinutes!==undefined?{timezoneOffsetMinutes:numeric(b.timezoneOffsetMinutes,'参照时区',-840,840,false,true)}:{})};}
 if(p.origin==='unset')assert(score===null||score===undefined,'未填写来源不能对应有效评分');
 if(['estimated-language','relative-baseline','edited-suggestion'].includes(p.origin))assert(p.sourcePhrase&&p.suggestedValue!==null,'建议评分必须保留原话和建议值');
 if(p.origin==='relative-baseline')assert(p.baseline&&p.delta!==null,'比较评分必须保留已确认参照');
 assert(p.confirmed,'评分草稿必须经用户确认后保存');
 return p;
}
export function caffeineEstimate({drink,drinkKind,cupCount,volumePerCupMl,mode='reference',labelMg=null,labelBasis='total',labelNote=''}){
 if(mode==='unknown')return null;
 if(mode==='label'){
  if(labelMg===null)return null;
  numeric(labelMg,'标签咖啡因',0,10000,false);
  let total=labelMg;
  if(labelBasis==='per-cup'){if(!cupCount)return null;total*=cupCount;}
  if(labelBasis==='per100ml'){if(!cupCount||!volumePerCupMl)return null;total*=cupCount*volumePerCupMl/100;}
  assert(total<=10000,'本次总咖啡因超出记录上限');
  return {method:'product-label',lowMg:total,highMg:total,labelMg,labelBasis,labelNote:labelNote.trim().slice(0,500),sourceId:null,sourceUrl:null,sourceServingMl:null,sourceMinMg:null,sourceMaxMg:null,volumeUsedMl:cupCount&&volumePerCupMl?cupCount*volumePerCupMl:null};
 }
 const ref=CAFFEINE_REFERENCES.find(x=>x.drink===drink&&x.kind===drinkKind);
 if(!ref||!cupCount||!volumePerCupMl)return null;
 const volume=cupCount*volumePerCupMl;
 const low=volume/ref.servingMl*ref.minMg,high=volume/ref.servingMl*ref.maxMg;
 assert(high<=10000,'估计总量超出记录上限，请核对杯数与体积');
 return {method:'reference-range',lowMg:low,highMg:high,labelMg:null,labelBasis:null,labelNote:'',sourceId:ref.id,sourceUrl:ref.url,sourceServingMl:ref.servingMl,sourceMinMg:ref.minMg,sourceMaxMg:ref.maxMg,volumeUsedMl:volume};
}
function validateCaffeineEstimate(value,input){
 if(value===null)return null;
 assert(value&&typeof value==='object','咖啡因来源格式不正确');
 if(value.method==='product-label')return caffeineEstimate({...input,mode:'label',labelMg:value.labelMg,labelBasis:choice(value.labelBasis,['total','per-cup','per100ml'],'标签计量依据'),labelNote:text(value.labelNote??'','标签说明',500)});
 const ref=CAFFEINE_REFERENCES.find(x=>x.id===value.sourceId);
 assert(value.method==='reference-range'&&ref&&ref.drink===input.drink&&ref.kind===input.drinkKind,'不支持的咖啡因参照来源');
 const result=caffeineEstimate({...input,mode:'reference'});
 assert(result&&Math.abs(value.lowMg-result.lowMg)<0.001&&Math.abs(value.highMg-result.highMg)<0.001,'咖啡因范围与杯数、体积不一致');
 return result;
}
function validateSleep(input){
 const value=input??{}, out={};
 for(const k of ['nightmares','grinding','snoring']){out[k]=choice(value[k]??'unknown',['unknown','yes','no'],k);out[k+'Source']=choice(value[k+'Source']??'unknown',['unknown','self','other','device'],k+'来源');}
 out.subjective=choice(value.subjective??'unknown',['unknown','restful','poor','shallow','poor-and-shallow'],'主观睡眠感受');
 out.deviceSource=text(value.deviceSource??'','睡眠设备来源',120);
 out.deepMinutes=numeric(value.deepMinutes??null,'设备估计深睡分钟',0,1440);
 out.otherStageMinutes=numeric(value.otherStageMinutes??null,'设备估计其余睡眠分钟',0,1440);
 if(out.deepMinutes!==null||out.otherStageMinutes!==null)assert(out.deviceSource,'请注明设备估计数据的来源');
 assert((out.deepMinutes??0)+(out.otherStageMinutes??0)<=1440,'设备阶段合计不能超过 24 小时');
 assert(Array.isArray(value.naps??[])&&(value.naps??[]).length<=10,'补觉记录最多 10 段');
 out.naps=(value.naps??[]).map(n=>({startAt:dateValue(n.startAt,'补觉开始时间'),durationMinutes:numeric(n.durationMinutes,'补觉分钟',1,1440,false),kind:choice(n.kind,['nap','catch-up'],'补觉类型')}));
 const sorted=[...out.naps].sort((a,b)=>a.startAt.localeCompare(b.startAt));
 for(let i=0;i<sorted.length;i++){assert(Date.parse(sorted[i].startAt)+sorted[i].durationMinutes*60000<=Date.now()+5*60000,'补觉结束时间不能在未来');if(i)assert(Date.parse(sorted[i].startAt)>=Date.parse(sorted[i-1].startAt)+sorted[i-1].durationMinutes*60000,'补觉时段重叠，请核对，避免重复记录');}
 return out;
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function localInput(date = new Date()) {
  return `${localDay(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, n => n.toString(16).padStart(2,'0')).join('');
}
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function assert(ok, message) { if (!ok) throw new Error(message); }
function text(value, name, limit, required = false) {
  assert(typeof value === 'string', `${name}格式不正确`);
  const result = value.trim();
  assert(result.length <= limit, `${name}最多 ${limit} 字`);
  assert(!required || result.length > 0, `请填写${name}`);
  return result;
}
function verbatimText(value,name,limit,required=false){text(value,name,limit,required);assert(value.length<=limit,`${name}最多 ${limit} 字`);return value;}
function categoryFields(input,r){
 if(!['activity','diet'].includes(r.type)||!['categoryId','categoryLabel','groupId'].some(k=>Object.hasOwn(input,k)))return;
 const id=text(input.categoryId,'分类标识',80,true);let builtin;
 if(r.type==='activity'){
  const group=ACTIVITY_GROUPS.find(g=>g.id===input.groupId);assert(group,'请选择活动大类');
  builtin=group.categories.find(c=>c.id===id);assert(builtin||customCategory(id),'活动分类与大类不一致');r.groupId=group.id;
 }else {assert(!Object.hasOwn(input,'groupId'),'饮食分类不使用活动大类');builtin=DIET_CATEGORIES.find(c=>c.id===id);assert(builtin||customCategory(id),'饮食分类标识无效');}
 r.categoryId=id;r.categoryLabel=verbatimText(input.categoryLabel??builtin?.label??'','分类名称',80,true);
}
function validateNapsForDay(details,r){for(const nap of details.naps){const day=new Date(Date.parse(nap.startAt)-r.timezoneOffsetMinutes*60000).toISOString().slice(0,10);assert(day===r.localDate,'补觉开始日期需与这份睡眠记录一致，请按实际日期分开记录。');}}
function numeric(value, name, min, max, optional = true, integer = false) {
  if (value === null && optional) return null;
  assert(typeof value === 'number' && Number.isFinite(value), `请填写有效的${name}`);
  assert(value >= min && value <= max && (!integer || Number.isInteger(value)), `${name}需在 ${min}–${max} 之间${integer ? '，并使用整数' : ''}`);
  return value;
}
function choice(value, choices, name) {
  assert(choices.includes(value), `${name}格式不正确`); return value;
}
function dateValue(value, name) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), `${name}格式不正确`);
  return new Date(value).toISOString();
}
export function validateRecord(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), '记录格式不正确');
  const r = {
    id: text(input.id, '记录标识', 80, true),
    type: choice(input.type, TYPES, '记录类型'),
    occurredAt: dateValue(input.occurredAt, '记录时间'),
    localDate: text(input.localDate, '当地日期', 10, true),
    timezoneOffsetMinutes: numeric(input.timezoneOffsetMinutes, '时区偏移', -840, 840, false, true),
    createdAt: dateValue(input.createdAt, '创建时间'),
    updatedAt: dateValue(input.updatedAt, '修改时间'),
  };
  assert(/^[A-Za-z0-9_-]{1,80}$/.test(r.id), '记录标识格式不正确');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.localDate) && new Date(`${r.localDate}T12:00:00Z`).toISOString().slice(0,10) === r.localDate, '当地日期格式不正确');
  assert(Date.parse(r.occurredAt) <= Date.now() + 5*60000, '记录时间不能在未来');
  if (r.type === 'moment') Object.assign(r, {
    anxiety: numeric(input.anxiety, '此刻焦虑强度', 0, 10, false, true),
    event: text(input.event, '发生的事', 3000),
    worry: text(input.worry, '脑海里的担心', 3000),
    context: text(input.context ?? '', '情境', 120),
  });
  if (r.type === 'narrative') {
    assert(Array.isArray(input.topics) && input.topics.length <= TOPICS.length, '话题格式不正确');
    assert(Array.isArray(input.fragments) && input.fragments.length <= 12, '片段格式不正确');
    Object.assign(r, {
      originalText:text(input.originalText,'原始叙述',6000,true),
      sourceText:text(input.sourceText??input.originalText,'整理前原文',6000,true),
      anxiety:numeric(input.anxiety,'此刻焦虑强度',0,10,true,true),
      topics:[...new Set(input.topics.map(v=>choice(v,TOPICS,'话题')))],
      fragments:input.fragments.map(f=>({topic:choice(f.topic,TOPICS,'片段话题'),quote:text(f.quote,'原话片段',6000,true)})),
      timeNote:text(input.timeNote ?? '', '叙述中的时间',500),
      method:choice(input.method,['local','ai','manual'],'整理方式'),
    });
    for(const f of r.fragments)assert(r.originalText.includes(f.quote),'整理片段必须来自原话');
  }
  if (r.type === 'daily') Object.assign(r, {
    mood: numeric(input.mood??null, '心情', 0, 4, true, true),
    sleepHours: numeric(input.sleepHours??null, '睡眠时长', 0, 24),
    exerciseMinutes: numeric(input.exerciseMinutes??null, '运动分钟', 0, 1440),
    diet: verbatimText(input.diet??'', '饮食记录', 3000),
    note: verbatimText(input.note??'', '今日随笔', 3000),
    medicationStatus: choice(input.medicationStatus??'unknown', ['unknown', 'none', 'some'], '当日用药情况'),
    caffeineStatus: choice(input.caffeineStatus??'unknown', ['unknown', 'none', 'some'], '当日咖啡因情况'),
    relationshipNote: verbatimText(input.relationshipNote ?? '', '情感与关系', 3000),
    socialNote: verbatimText(input.socialNote ?? '', '社交与独处', 3000),
  });
  if (r.type === 'medication') Object.assign(r, {
    name: text(input.name, '药物名称', 120, true),
    dose: numeric(input.dose, '实际剂量', 0.000001, 1000000, false),
    unit: text(input.unit, '剂量单位', 30, true),
    category: choice(input.category, ['unspecified','sleep','anxiety','other'], '药物类别'),
    use: choice(input.use, ['regular','as-needed'], '用药方式'),
    reason: text(input.reason, '用药原因', 1000),
  });
  if(r.type==='medication'&&Object.hasOwn(input,'route'))r.route=verbatimText(input.route,'用药途径',120);
  if (r.type === 'caffeine') Object.assign(r, {
    drink: choice(input.drink, ['coffee','tea','energy','other'], '饮品类型'),
    name: text(input.name, '饮品名称', 120),
    amount: numeric(input.amount, '饮用量', 0.000001, 1000000, false),
    unit: choice(input.unit, ['ml','杯','份'], '饮用量单位'),
    estimatedCaffeineMg: numeric(input.estimatedCaffeineMg, '估计咖啡因', 0, 10000),
    note: text(input.note, '饮品备注', 1000),
  });
  if (r.type === 'diet') Object.assign(r, {
    category: verbatimText(input.category??input.categoryLabel??DIET_CATEGORIES.find(c=>c.id===input.categoryId)?.label??'', '饮食分类', 80, true),
    name: verbatimText(input.name, '食物或饮品', 120, true),
    amount: numeric(input.amount??null, '食用量', 0.000001, 1000000),
    unit: verbatimText(input.unit??'', '食用量单位', 30, input.amount !== null&&input.amount!==undefined),
    note: verbatimText(input.note??'', '饮食备注', 1000),
  });
  if(r.type==='diet'&&Object.hasOwn(input,'quantity')){
    r.quantity=numeric(input.quantity,'饮食数量',0,1000000);
    r.quantityUnit=input.quantityUnit===null||input.quantityUnit===undefined||input.quantityUnit===''?null:choice(input.quantityUnit,QUANTITY_UNITS.map(u=>u.id),'数量单位');
    assert(r.quantity===null||r.quantityUnit!==null,'请为数量选择单位');
    if(r.quantityUnit==='other')r.quantityUnitLabel=verbatimText(input.quantityUnitLabel??'','自定义单位',30,true);
    else if(Object.hasOwn(input,'quantityUnitLabel'))r.quantityUnitLabel=verbatimText(input.quantityUnitLabel??'','单位说明',30);
  }
  if(['moment','daily','narrative'].includes(r.type)){
    if(Object.hasOwn(input,'lowMood'))r.lowMood=numeric(input.lowMood,'低落感',0,10,true,true);
    if(r.type==='daily'&&Object.hasOwn(input,'anxiety'))r.anxiety=numeric(input.anxiety,'不安感',0,10,true,true);
    if(input.ratingProvenance){r.ratingProvenance={};for(const kind of ['anxiety','lowMood'])if(input.ratingProvenance[kind])r.ratingProvenance[kind]=validateProvenance(input.ratingProvenance[kind],r[kind]);}
  }
  if(r.type==='daily'){
    if(input.sleepDetails){r.sleepDetails=validateSleep(input.sleepDetails);validateNapsForDay(r.sleepDetails,r);}
    for(const metric of ['anxietyOccurrence','lowMoodOccurrence'])if(Object.hasOwn(input,metric))r[metric]=choice(input[metric],['unknown','yes','no'],'当天是否出现');
    if(input.occurrenceScope)r.occurrenceScope=choice(input.occurrenceScope,['so-far','whole-day'],'当天记录范围');
    assert(r.mood!==null||r.sleepHours!==null||r.exerciseMinutes!==null||r.diet||r.note||r.relationshipNote||r.socialNote||r.medicationStatus!=='unknown'||r.caffeineStatus!=='unknown'||Number.isFinite(r.anxiety)||Number.isFinite(r.lowMood)||(r.anxietyOccurrence&&r.anxietyOccurrence!=='unknown')||(r.lowMoodOccurrence&&r.lowMoodOccurrence!=='unknown')||(r.sleepDetails&&Object.entries(r.sleepDetails).some(([k,v])=>k==='naps'?v.length:typeof v==='number'||(['nightmares','grinding','snoring','subjective'].includes(k)&&v!=='unknown'))),'写下一项就好，也可以稍后再来');
  }
  if(r.type==='sleep'){
    r.wakeDate=verbatimText(input.wakeDate??r.localDate,'醒来日期',10,true);assert(r.wakeDate===r.localDate,'睡眠按醒来日期记录');
    r.sleepHours=numeric(input.sleepHours??null,'夜间睡眠时长',0,24);r.sleepDetails=validateSleep(input.sleepDetails);validateNapsForDay(r.sleepDetails,r);r.note=verbatimText(input.note??'','睡眠随记',3000);
    assert(r.sleepHours!==null||r.note||Object.entries(r.sleepDetails).some(([k,v])=>k==='naps'?v.length:typeof v==='number'||(['nightmares','grinding','snoring','subjective'].includes(k)&&v!=='unknown')),'记录一项睡眠感受即可');
  }
  if(r.type==='checkin')Object.assign(r,{domain:choice(input.domain,['caffeine','medication','activity'],'记录范围'),status:choice(input.status,['none','some'],'当天情况'),scope:choice(input.scope,['so-far','whole-day'],'记录时间范围'),note:verbatimText(input.note??'','情况备注',1000)});
  if(r.type==='occurrence')Object.assign(r,{anxietyOccurrence:choice(input.anxietyOccurrence,['unknown','yes','no'],'焦虑出现情况'),lowMoodOccurrence:choice(input.lowMoodOccurrence,['unknown','yes','no'],'低落出现情况'),occurrenceScope:choice(input.occurrenceScope,['so-far','whole-day'],'记录范围'),note:text(input.note??'','当天情况备注',1000)});
  if(r.type==='activity'){
    assert(Array.isArray(input.tags)&&input.tags.length>0&&input.tags.length<=8,'请至少选择一种活动');
    Object.assign(r,{tags:[...new Set(input.tags.map(t=>choice(t,['exercise','walk','outdoor','sunlight','game','social','relationship','other'],'活动标签')))],name:verbatimText(input.name??'','活动类型',120),durationMinutes:numeric(input.durationMinutes,'活动分钟',1,1440,false),intensity:choice(input.intensity??'unknown',['unknown','light','moderate','vigorous'],'活动强度'),startAt:input.startAt?dateValue(input.startAt,'活动开始时刻'):null,note:verbatimText(input.note??'','活动随记',3000)});
  }
  categoryFields(input,r);
  if(r.type==='symptom'){
    Object.assign(r,{name:text(input.name,'身体感受',120,true),site:text(input.site??'','部位',120),intensity:numeric(input.intensity??null,'不适强度',0,10,true,true),startAt:input.startAt?dateValue(input.startAt,'开始时间'):null,endAt:input.endAt?dateValue(input.endAt,'结束时间'):null,note:text(input.note??'','身体感受原话',3000)});
    if(r.startAt)assert(Date.parse(r.startAt)<=Date.now()+5*60000,'开始时间不能在未来');
    if(r.endAt){assert(r.startAt&&Date.parse(r.endAt)>=Date.parse(r.startAt),'结束时间需晚于开始时间');assert(Date.parse(r.endAt)<=Date.now()+5*60000,'结束时间不能在未来');}
  }
  if(r.type==='caffeine'){
    for(const key of ['cupCount','volumePerCupMl'])if(Object.hasOwn(input,key))r[key]=numeric(input[key],key==='cupCount'?'杯数':'每杯体积',0.000001,key==='cupCount'?1000:5000);
    for(const key of ['brand','brew','originalDrinkType'])if(Object.hasOwn(input,key))r[key]=text(input[key],key,120);
    if(input.drinkKind)r.drinkKind=choice(input.drinkKind,DRINK_KINDS.map(x=>x[0]),'饮品类别');
    if(input.caffeineMode)r.caffeineMode=choice(input.caffeineMode,['reference','label','unknown','legacy'],'咖啡因记录方式');
    if(input.strength)r.strength=choice(input.strength,['unknown','light','regular','strong'],'饮品浓度');
    if(Object.hasOwn(input,'caffeineEstimate'))r.caffeineEstimate=validateCaffeineEstimate(input.caffeineEstimate,r);
    if(input.caffeineLabel){r.caffeineLabel={valueMg:numeric(input.caffeineLabel.valueMg,'标签咖啡因',0,10000,false),basis:choice(input.caffeineLabel.basis,['total','per-cup','per100ml'],'标签计量依据'),note:text(input.caffeineLabel.note??'','标签说明',500)};}
  }
  if(r.type==='screening'){
    const spec=SCREENERS.find(s=>s.id===input.scaleId&&s.version===input.scaleVersion);assert(spec,'这份量表版本尚未核实，不能保存');
    assert(Array.isArray(input.answers)&&input.answers.length===spec.items.length,'量表答案数量不正确');
    const answers=input.answers.map(v=>numeric(v,'量表选项',0,3,true,true));
    const result=scoreScreener(spec.id,answers);
    const recallDays=spec.recallDays??14;
    Object.assign(r,{scaleId:spec.id,scaleVersion:spec.version,answers,total:result.total,recallDays,windowStart:text(input.windowStart,'回顾起始日期',10,true),windowEnd:text(input.windowEnd,'回顾结束日期',10,true),functionalImpairment:input.functionalImpairment===null?null:numeric(input.functionalImpairment??null,'功能影响',0,3,true,true)});
    if(input.recallDays!==undefined)assert(input.recallDays===recallDays,'回顾天数与量表版本不一致');
    assert(r.windowEnd===r.localDate&&r.windowStart===shiftDay(r.windowEnd,-(recallDays-1)),`量表回顾窗必须为评估日及此前 ${recallDays-1} 天`);
  }
  if(input.schemaVersion!==undefined)r.schemaVersion=choice(input.schemaVersion,[2,3],'记录版本');
  if(input.entryProvenance){const p=input.entryProvenance;r.entryProvenance={mode:choice(p.mode,['contemporaneous','retrospective'],'填写方式'),timeMeaning:choice(p.timeMeaning,['event','log-time','day-anchor','assessment'],'时间含义'),source:choice(p.source,['manual','narrative-reviewed','narrative-structured-confirmed','quick-checkin','screening'],'记录入口')};}
  if(Object.hasOwn(input,'sourceNarrativeId')||Object.hasOwn(input,'sourceFragmentKey')){
    assert(!['narrative','screening'].includes(r.type),'原始叙述和量表不能作为已整理子记录');
    r.sourceNarrativeId=verbatimText(input.sourceNarrativeId??'','原始叙述标识',80,true);assert(/^[A-Za-z0-9_-]{1,80}$/.test(r.sourceNarrativeId),'原始叙述标识格式不正确');
    r.sourceFragmentKey=verbatimText(input.sourceFragmentKey??'','原话片段标识',7000,true);assert(r.sourceFragmentKey.indexOf('|')>0&&r.sourceFragmentKey.indexOf('|')<r.sourceFragmentKey.length-1,'原话片段标识需包含范围和原话');
  }
  if(r.entryProvenance?.source==='narrative-structured-confirmed')assert(r.sourceNarrativeId&&r.sourceFragmentKey,'确认整理后的记录需保留原始叙述和片段标识');
  return r;
}
export function makeRecord(type, data, previous = null) {
  const now = new Date().toISOString();
  const date = new Date(data.time);
  assert(Number.isFinite(date.getTime()), '请填写有效的时间');
  const unchangedTime=previous && (['daily','sleep'].includes(type)?data.day===previous.localDate:data.time===localInput(new Date(previous.occurredAt)));
  const day = unchangedTime?previous.localDate:(['daily','sleep'].includes(type) ? data.day : localDay(date));
  const previousProvenance=previous?.entryProvenance?(previous.localDate===day?previous.entryProvenance:{...previous.entryProvenance,mode:day<localDay(new Date(previous.createdAt))?'retrospective':'contemporaneous'}):null;
  const entryProvenance=data.entryProvenance??previousProvenance??{mode:day<localDay(new Date(previous?.createdAt??now))?'retrospective':'contemporaneous',timeMeaning:['daily','sleep'].includes(type)?'day-anchor':type==='screening'?'assessment':'event',source:type==='narrative'?'narrative-reviewed':['occurrence','checkin'].includes(type)?'quick-checkin':type==='screening'?'screening':'manual'};
  return validateRecord({...previous,...data,...(type==='sleep'?{wakeDate:data.wakeDate??day}:{}), type, schemaVersion:3, entryProvenance,id: previous?.id ?? uid(), occurredAt: unchangedTime?previous.occurredAt:date.toISOString(), localDate: day,
    timezoneOffsetMinutes: unchangedTime?previous.timezoneOffsetMinutes:date.getTimezoneOffset(), createdAt: previous?.createdAt ?? now, updatedAt: now});
}
export function backupEnvelope(records) {
  return {format:'fuguang-backup', version:VERSION, exportedAt:new Date().toISOString(),
    semantics:{anxiety:'non-diagnostic 0–10 self-rating; see ratingProvenance for explicit / approximate / compared origin',lowMood:'non-diagnostic 0–10 low-mood self-rating, independent from formal scales',mood:'legacy daily mood 0–4 ordinal; never converted to lowMood',missing:'null or unknown; absent event does not mean zero',timezoneOffsetMinutes:'minutes UTC minus local (JavaScript getTimezoneOffset convention)',sleepHours:'night only, assigned by wake date; naps separately timestamped; independent sleep record supersedes same-day legacy daily sleep fields for analysis',caffeineEstimate:'sourced range or user product-label value; legacy estimatedCaffeineMg has unclassified provenance',screening:'independent item-level assessment with instrument-specific recallDays/windowStart/windowEnd; never replicated into daily outcomes',stableCategories:'optional explicit groupId/categoryId; absence means legacy unclassified, never inferred from free text',dietQuantity:'quantity and quantityUnit are independent of preserved legacy amount/unit; units are not mixed',checkin:'section-specific explicit status; absent checkin means unknown, positive events override earlier none',narrativeChildren:'sourceNarrativeId + exact sourceFragmentKey link a separately confirmed structured record; no duplicate source tuple'},
    records: records.map(validateRecord)};
}
export function parseBackup(raw) {
  assert(typeof raw === 'string' && new TextEncoder().encode(raw).length <= MAX_FILE, '备份文件过大（上限 12 MB）');
  let data; try { data = JSON.parse(raw); } catch { throw new Error('无法读取这个 JSON 文件'); }
  assert(data?.format === 'fuguang-backup' && [1,2,3].includes(data.version), '这不是支持的浮光备份（支持版本 1 / 2 / 3）');
  assert(Array.isArray(data.records) && data.records.length <= MAX_RECORDS, '备份记录数量不正确');
  const ids = new Set(), days = new Set(), fragments=new Set();
  const records = data.records.map(validateRecord);
  for (const r of records) {
    assert(!ids.has(r.id), '备份中存在重复记录标识'); ids.add(r.id);
    if (['daily','sleep'].includes(r.type)) { const key=r.type+':'+r.localDate;assert(!days.has(key), '备份中同一天有多条同类每日 / 睡眠记录'); days.add(key); }
    if(r.sourceNarrativeId){const key=JSON.stringify([r.sourceNarrativeId,r.sourceFragmentKey]);assert(!fragments.has(key),'备份中同一原话片段被重复整理');fragments.add(key);}
  }
  return records;
}
export function mergeRecords(existing, incoming) {
  const ids = new Set(existing.map(r => r.id));
  const days = new Set(existing.filter(r => ['daily','sleep'].includes(r.type)).map(r => r.type+':'+r.localDate));
  const fragments=new Set(existing.filter(r=>r.sourceNarrativeId).map(r=>JSON.stringify([r.sourceNarrativeId,r.sourceFragmentKey])));
  let skipped = 0; const added = [];
  for (const r of incoming) {
    const dayKey=r.type+':'+r.localDate,fragmentKey=r.sourceNarrativeId?JSON.stringify([r.sourceNarrativeId,r.sourceFragmentKey]):null;
    if (ids.has(r.id) || (['daily','sleep'].includes(r.type) && days.has(dayKey)) ||fragmentKey&&fragments.has(fragmentKey)) { skipped++; continue; }
    ids.add(r.id); if (['daily','sleep'].includes(r.type)) days.add(dayKey);if(fragmentKey)fragments.add(fragmentKey);added.push(r);
  }
  assert(existing.length + added.length <= MAX_RECORDS, '记录总数超出 20,000 条上限，请先保留备份');
  const records=[...existing,...added];
  assertBackupCapacity(records);
  return {records, added:added.length, skipped};
}
export function assertBackupCapacity(records) {
  assert(new TextEncoder().encode(JSON.stringify(records)).length + 4096 <= MAX_FILE, '本机记录已接近单份备份容量上限。请先导出并妥善保管，再整理旧记录。此次操作没有保存。');
}
export function shiftDay(day,delta){const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()+delta);return localDay(d);}
export function dayOccurrence(records,metric){
 const key=metric==='lowMood'?'lowMoodOccurrence':'anxietyOccurrence';
 const positive=records.some(r=>r[key]==='yes'||(['moment','narrative','daily'].includes(r.type)&&Number.isFinite(r[metric])&&r[metric]>0));
 const no=records.some(r=>r[key]==='no');
 return {value:positive?true:no?false:null,resolvedConflict:positive&&no,provisional:!positive&&records.some(r=>r[key]==='no'&&r.occurrenceScope==='so-far')};
}
export function summarize(records,days=14,now=new Date(),metric='anxiety'){
 const keys=Array.from({length:days},(_,i)=>shiftDay(localDay(now),i-days+1));
 const scored=r=>['moment','narrative','daily'].includes(r.type)&&Number.isFinite(r[metric]);
 const rows=keys.map(day=>{
  const all=records.filter(r=>r.localDate===day), ratings=all.filter(scored), daily=all.find(r=>r.type==='daily'),sleep=all.find(r=>r.type==='sleep')??daily;
  return {day,count:ratings.length,anxiety:ratings.length?ratings.reduce((sum,r)=>sum+r[metric],0)/ratings.length:null,
   mood:daily?.mood??null,sleepHours:sleep?.sleepHours??null,exerciseMinutes:daily?.exerciseMinutes??null,
   medicationCount:all.filter(r=>r.type==='medication').length||(!all.some(r=>r.type==='checkin'&&r.domain==='medication'&&r.status==='some')&&(daily?.medicationStatus==='none'||all.some(r=>r.type==='checkin'&&r.domain==='medication'&&r.status==='none'))?0:null),
   caffeineCount:all.filter(r=>r.type==='caffeine').length||(!all.some(r=>r.type==='checkin'&&r.domain==='caffeine'&&r.status==='some')&&(daily?.caffeineStatus==='none'||all.some(r=>r.type==='checkin'&&r.domain==='caffeine'&&r.status==='none'))?0:null),
   occurrence:dayOccurrence(all,metric),recorded:all.length>0};
 });
 const ratings=records.filter(r=>scored(r)&&keys.includes(r.localDate));
 return {rows,metric,count:ratings.length,observedDays:rows.filter(r=>r.count).length,
  mean:ratings.length?ratings.reduce((s,r)=>s+r[metric],0)/ratings.length:null,
  estimatedCount:ratings.filter(r=>['estimated-language','relative-baseline','edited-suggestion'].includes(ratingSource(r,metric).origin)).length,
  validOccurrenceDays:rows.filter(r=>r.occurrence.value!==null).length,occurrenceDays:rows.filter(r=>r.occurrence.value===true).length,
  recordedDays:rows.filter(r=>r.recorded).length};
}
export function scoreScreener(id,answers){
 const spec=SCREENERS.find(s=>s.id===id);assert(spec,'量表未核实');
 assert(Array.isArray(answers)&&answers.length===spec.items.length,'答案数量不正确');
 for(const v of answers)numeric(v,'量表答案',0,3,true,true);
  const complete=answers.every(v=>v!==null),total=complete?answers.reduce((a,b)=>a+b,0):null;
 let band=null;if(total!==null)band=spec.cutpoints.filter(n=>total>=n).length;
  return {total,complete,band,needsFurtherAssessment:total!==null&&['phq2','gad2'].includes(id)&&total>=3,item9Help:id==='phq9'&&answers[8]!==null&&answers[8]>0};
}

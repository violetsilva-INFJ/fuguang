import {TYPES, TOPICS, MOODS, MAX_FILE, SCREENERS, SCALE_SOURCE, SCALE_OPTIONS, SCALE_INSTRUCTION, FUNCTIONAL_QUESTION, FUNCTIONAL_OPTIONS, DRINK_KINDS, CAFFEINE_REFERENCES, ratingDescription, ratingSource, caffeineEstimate, scoreScreener, shiftDay, escapeHTML as e, localDay, localInput, makeRecord, backupEnvelope, parseBackup, mergeRecords, summarize} from './core.js';
import {baselineCandidates,comparedSuggestion} from './narrative.js';
import {aiStatus, configureAI, structureWithAI, cancelAI} from './ai.js';
import {openStorage, allRecords, saveRecord, deleteRecord, importRecords, clearRecords} from './storage.js';
import {createAssociationView} from './analysis-view.js';
import {dailyFields,activityFields,foodFields,sleepFieldsHTML,structuredData,activityCategoryOptions,classificationLabel,quantityText,createRecordControls} from './structured-entry.js';
import {shortcutGroups,draftFromShortcut,loadShortcutPrefs,saveShortcutPrefs,hideShortcut,clearShortcutHistory,restoreShortcutPrefs,forgetShortcutPrefs} from './recent-drafts.js';
import {createModalController,installButtonFeedback,installViewportLayout} from './modal-controller.js';
import {createWeatherController} from './weather-view.js';

const $ = selector => document.querySelector(selector);
const main=$('#main'), pageScroll=$('#page-scroll'), editor=$('#editor'), confirmDialog=$('#confirm');
let aiReturnToCapture=false,aiApprovalPending=false;
let narrativeDraft=null, narrativeRaw='', aiRunning=false, narrativeDay=localDay(), ratingState={}, reviewMetric='anxiety';
let records=[], tab='now', filter='all', search='', period=14, ready=false, editing=null, selectedAnxiety=null, selectedMood=null, dirty=false, busy=false, focusReturn=null, toastTimer;
let shortcutPrefs=loadShortcutPrefs(),presetExpanded=false,draftLink=null,routeParent=null;
const recordControls=createRecordControls(editor);
installButtonFeedback();
installViewportLayout();
const modal=createModalController(editor),weather=createWeatherController({openPanel:showEditor,closePanel:closeEditor,ask,toast});
const associationView=createAssociationView({readRecords:allRecords,onDataChanged:latest=>{records=latest;}});
const titles={narrative:'随手说一句',moment:'此刻',daily:'每日小记',sleep:'睡眠',checkin:'当天确认',medication:'用药',caffeine:'饮食 · 饮品',diet:'饮食 · 食物',activity:'活动',symptom:'身体感受',occurrence:'当天情况',screening:'筛查与评估'};
const icons={
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  book:'<path d="M5 4h13a1 1 0 0 1 1 1v15H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm0 0v13m-2 0h16M9 8h6m-6 4h4"/>',
  wave:'<path d="M3 15c3 0 3-8 6-8s3 10 6 10 3-6 6-6M3 21h18"/>',
  leaf:'<path d="M20 3C10 2 3 7 5 13s11 8 14 0c1-3 1-7 1-10ZM4 21 15 9"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  moon:'<path d="M20 14a8.5 8.5 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z"/>',
  pill:'<path d="m5 11 6-6a5 5 0 0 1 7 7l-6 6a5 5 0 0 1-7-7Zm3-3 8 8"/>',
  cup:'<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/>',
  bowl:'<path d="M3 12h18a9 9 0 0 1-18 0Zm5 9h8M7 4l1 5m4-6v6m5-5-1 5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4M8 8l4-4 4 4M4 16v5h16v-5"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  edit:'<path d="m5 14 10-10 5 5-10 10-6 1 1-6Zm8-8 5 5"/>',
  dot:'<circle cx="12" cy="12" r="7"/><path d="M9 12h6"/>',
};
function icon(name, className=''){return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" aria-hidden="true">${icons[name]||icons.leaf}</svg>`;}
const typeIcon={narrative:'book',moment:'sun',daily:'moon',sleep:'moon',checkin:'check',medication:'pill',caffeine:'cup',diet:'bowl',activity:'leaf',symptom:'wave',occurrence:'check',screening:'book'};
const shortDate=day=>new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date(`${day}T12:00:00`));
const timeLabel=r=>new Date(Date.parse(r.occurredAt)-(r.timezoneOffsetMinutes??new Date(r.occurredAt).getTimezoneOffset())*60000).toISOString().slice(11,16);
const sortRecords=list=>[...list].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
const numberValue=(form,name)=>{const value=form.elements[name]?.value.trim();return !value ? null : Number(value);};
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function textField(name,label,value='',placeholder='',max=3000){return `<label class="field"><span class="field-label">${label}<small>选填</small></span><textarea name="${name}" maxlength="${max}" placeholder="${placeholder}" rows="3">${e(value)}</textarea></label>`;}
function inputField(name,label,value='',type='text',attrs='',help=''){return `<label class="field"><span class="field-label">${label}</span><input type="${type}" name="${name}" value="${e(value??'')}" ${attrs}>${help?`<span class="field-help">${help}</span>`:''}</label>`;}
function selectField(name,label,options,value){return `<label class="field"><span class="field-label">${label}</span><select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${value===v?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;}
function optional(title,body,open=false,description='选填'){return `<details class="optional-fields" ${open?'open':''}><summary><span>${title}<small>${description}</small></span></summary>${body}</details>`;}
function empty(title,description,action=true){return `<div class="empty"><div class="empty-symbol">${icon('leaf')}</div><h2>${title}</h2><p>${description}</p>${action?`<button class="primary" data-add="moment">${icon('plus')}记录此刻</button>`:''}</div>`;}
function heading(english,title,description,action=''){return `<div class="page-heading"><div><div class="eyebrow">${english}</div><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${action}</div>`;}

function provenanceText(p,value){
 if(p.origin==='unset')return p.relativeChange?'原话表达了变化，但没有绝对强度；请选择并确认参照，或自行滑动。':'还未填写，可点按或滑动选择。';
 if(p.origin==='estimated-language')return `根据“${p.sourcePhrase}”粗略建议 ${p.suggestedValue}/10；这是便于记录的近似值，不是量表换算，请确认或调整。`;
 if(p.origin==='relative-baseline')return `已选择参照 ${p.baseline.localDate} ${timeLabel(p.baseline)} 的 ${p.baseline.value}/10，暂按 ${p.delta>0?'+':''}${p.delta} 分形成草稿；请确认或调整。`;
 if(p.origin==='edited-suggestion')return `你已调整原话“${p.sourcePhrase}”的建议值（原建议 ${p.suggestedValue}/10）。`;
 if(p.origin==='explicit-number')return `来自你明确说出的“${p.sourcePhrase}”；仍可修改。`;
 return p.origin==='legacy-unclassified'?'早期记录：评分来源未注明。':'由你主动选择的自评。';
}
function ratingControl(kind,value=null,provenance=null,required=false){
 value=value??null;
 const p=structuredClone(provenance??ratingSource({[kind]:value},kind));
 ratingState[kind]={value,provenance:p};
 const low=kind==='lowMood',desc=ratingDescription(kind,value),title=low?'心上的云':'心里的风',label=low?'低落感':'焦虑感';
 return `<fieldset class="rating-fieldset emotion-slider ${value===null?'is-unset':''}" data-rating-group="${kind}"><legend class="field-label">${title}<small>${label} · 0–10 · ${required?'需主动选择':'选填'}</small></legend><div class="slider-reading"><span class="rating-emoji" aria-hidden="true" data-rating-emoji="${kind}">${desc.emoji}</span><output for="rating-${kind}" id="reading-${kind}">${value===null?'—':value}<small> / 10</small></output><span class="degree-text" data-rating-degree="${kind}">${desc.text}</span></div><label class="visually-hidden" for="rating-${kind}">${label}，${required?'必填':'选填'}，0 到 10</label><input type="range" id="rating-${kind}" name="${kind}" data-emotion-slider="${kind}" min="0" max="10" step="1" value="${value??0}" aria-valuetext="${value===null?'未填写，请主动选择':value+'，'+desc.text}" aria-describedby="source-${kind}"><div class="slider-ends"><span>0 · ${low?'没有低落感':'没有焦虑感'}</span><span>10 · 格外强烈</span></div><div class="rating-note"><p id="source-${kind}" class="field-help">${e(provenanceText(p,value))}</p><button type="button" class="text-button" data-clear-rating="${kind}">留空</button></div></fieldset>`;
}
function updateRating(kind,value,fromBaseline=false){
 const state=ratingState[kind];if(!state)return;
 const p=state.provenance;
 if(!fromBaseline){if(p.origin==='estimated-language'||p.origin==='relative-baseline'||p.origin==='edited-suggestion'){if(value!==state.value)p.origin='edited-suggestion';}else if(value!==null)p.origin='user-slider';}
 if(value===null)p.origin='unset';state.value=value;
 const group=editor.querySelector(`[data-rating-group="${kind}"]`),desc=ratingDescription(kind,value);if(!group)return;
 group.classList.toggle('is-unset',value===null);const slider=group.querySelector('input[type=range]');slider.value=value??0;slider.setAttribute('aria-valuetext',value===null?'未填写，请主动选择':`${value}，${desc.text}`);
 group.querySelector('output').innerHTML=`${value===null?'—':value}<small> / 10</small>`;group.querySelector('[data-rating-emoji]').textContent=desc.emoji;group.querySelector('[data-rating-degree]').textContent=desc.text;group.querySelector('.field-help').textContent=provenanceText(p,value);dirty=true;
}
function sourceBadge(r,kind){const p=ratingSource(r,kind);return ['estimated-language','relative-baseline','edited-suggestion'].includes(p.origin)?' · 已确认的近似记录':'';}
function caffeineText(r){
 const q=r.cupCount??(r.unit==='杯'?r.amount:null),kind=DRINK_KINDS.find(x=>x[0]===r.drinkKind)?.[1],base={coffee:'咖啡',tea:'茶',energy:'能量饮料',other:'其他饮品'}[r.drink];
 return [q===null?`${r.amount} ${r.unit}`:`${q} 杯`,kind&&kind!=='尚未分类'?kind:base,r.name,r.volumePerCupMl?`每杯 ${r.volumePerCupMl} ml`:'',r.caffeineEstimate?`咖啡因${r.caffeineEstimate.method==='reference-range'?'约':''} ${Math.round(r.caffeineEstimate.lowMg)}${r.caffeineEstimate.highMg!==r.caffeineEstimate.lowMg?'–'+Math.round(r.caffeineEstimate.highMg):''} mg`:r.estimatedCaffeineMg!==null&&r.estimatedCaffeineMg!==undefined?`早期估计 ${r.estimatedCaffeineMg} mg`:'咖啡因未知'].filter(Boolean).join(' · ');
}
function comparisonPanel(d,now=new Date()){
 return (d.comparisonRequests??[]).map(req=>{
 const candidates=baselineCandidates(records,req,now),metric=req.metric==='anxiety'?'焦虑感':'低落感',target={yesterday:'昨天',morning:'当天早上 05:00–11:59',recent:'记录时间之前 2 小时',unspecified:'由你明确选择的一条旧记录'}[req.target];
 return `<div class="comparison-panel"><h3>${metric} · 比较哪一个片刻？</h3><p class="field-help">原话：“${e(req.sourcePhrase)}”。匹配范围：${target}。${req.explicitDelta?'按你说出的分差':'尚未说出绝对分差，采用参照后仅暂按 '+(req.delta>0?'+1':'−1')+' 分建议，可自行修改'}。</p>${candidates.length?`<label class="field"><span class="field-label">选择参照 <small>${candidates.length} 个候选，不自动选中</small></span><select data-baseline-select="${req.metric}"><option value="">先选择并核对一条记录</option>${candidates.map(r=>`<option value="${r.id}">${r.localDate} ${timeLabel(r)} · ${r[req.metric]}/10 · ${e((r.originalText||r.event||r.note||'自评记录').slice(0,45))}${sourceBadge(r,req.metric)}</option>`).join('')}</select></label><button type="button" class="secondary" data-use-baseline="${req.metric}">用这条参照生成草稿</button><p class="field-help" data-baseline-detail="${req.metric}"></p>`:'<p class="field-help">没有匹配到可用的数字记录；强度保持未填写。你可以直接滑动选择，不会使用其他日期的旧分数。</p>'}</div>`;
 }).join('');
}
function hasSleepDetails(d){return !!d&&(d.naps?.length||d.deepMinutes!==null&&d.deepMinutes!==undefined||d.otherStageMinutes!==null&&d.otherStageMinutes!==undefined||d.deviceSource||['nightmares','grinding','snoring','subjective'].some(k=>d[k]&&d[k]!=='unknown'));}
function sleepFields(details={},day=localDay()){
 const sourceOptions=[['unknown','未注明'],['self','自己感受到 / 推测'],['other','他人告诉我'],['device','设备提示（非诊断）']];
 let fields=selectField('sleep-subjective','自己的睡眠感受',[['unknown','未记录'],['restful','感觉休息得不错'],['poor','感觉睡得不好'],['shallow','自己感觉睡得浅'],['poor-and-shallow','睡得不好，也感觉浅']],details.subjective??'unknown');
 for(const [key,label]of [['nightmares','噩梦'],['grinding','磨牙'],['snoring','打鼾']])fields+=`<div class="two-fields">${selectField('sleep-'+key,label,[['unknown','未记录 / 不清楚'],['yes','有'],['no','明确没有']],details[key]??'unknown')}${selectField('sleep-'+key+'Source','信息来源',sourceOptions,details[key+'Source']??'unknown')}</div>`;
 fields+=inputField('sleep-deviceSource','设备来源 <small>手动输入，选填</small>',details.deviceSource??'','text','maxlength="120" placeholder="例如 Apple Watch / 某设备应用"')+`<div class="two-fields">${inputField('sleep-deepMinutes','设备估计深睡 <small>分钟</small>',details.deepMinutes,'number','min="0" max="1440" step="1" placeholder="未知"')}${inputField('sleep-otherStageMinutes','其余睡眠阶段 <small>分钟</small>',details.otherStageMinutes,'number','min="0" max="1440" step="1" placeholder="合计，未知留空"')}</div><p class="field-help">设备分期可手动抄录；自己的睡眠感受另记。</p><h3 class="nap-heading">午睡 / 补觉</h3><p class="field-help">另记开始时间与时长，不计入夜间睡眠。</p><div id="nap-rows">${(details.naps??[]).map(n=>napRow(n)).join('')}</div><button type="button" class="text-button" data-action="add-nap">＋ 记一段午睡或补觉</button>`;
 return fields;
}
function napRow(n={}){return `<div class="nap-row" data-nap><div class="two-fields">${selectField('napKind','这一段',[['nap','午睡 / 小憩'],['catch-up','补觉']],n.kind??'nap')}${inputField('napMinutes','时长 <small>分钟</small>',n.durationMinutes,'number','min="1" max="1440" step="1"')}</div>${inputField('napStart','开始时间',n.startAt?localInput(new Date(n.startAt)):'','datetime-local')}<button type="button" class="text-button" data-remove-nap>移除这一段</button></div>`;}
function beverageFields(r,time){
 const mode=r.caffeineMode??(r.caffeineEstimate?.method==='product-label'?'label':r.estimatedCaffeineMg!==null&&r.estimatedCaffeineMg!==undefined&&!r.caffeineEstimate?'legacy':'reference');
 return `<p class="sheet-intro">记下品类、杯数与饮用时间。</p>${selectField('drink','饮品大类',[['coffee','咖啡'],['tea','茶'],['energy','能量饮料'],['other','其他饮品']],r.drink??'coffee')}${inputField('name','原始品名 / 品类 <small>选填</small>',r.name??r.originalDrinkType??'','text','maxlength="120" placeholder="例如：拿铁、乌龙茶、某款瓶装茶"')}${selectField('drinkKind','用于估计的具体类别',DRINK_KINDS,r.drinkKind??'unknown')}<div class="two-fields">${inputField('amount','喝了多少',r.amount,'number','required min="0.000001" max="1000000" step="any" inputmode="decimal" placeholder="例如 2"')}${selectField('unit','计量单位',[['杯','杯'],['ml','ml（保留原记录）'],['份','份']],r.unit??'杯')}</div>${inputField('cupCountExtra','杯数 <small>原来按 ml / 份记录时可补充</small>',r.cupCount,'number','min="0.000001" max="1000" step="any" inputmode="decimal" placeholder="按杯记录时不必重复填写"')}${inputField('volumePerCupMl','每杯体积 <small>ml，选填</small>',r.volumePerCupMl,'number','min="0.000001" max="5000" step="any" inputmode="decimal" placeholder="未知，请留空"')}${inputField('time','饮用时间',time,'datetime-local','required')}${optional('浓淡、冲泡与品牌',selectField('strength','你记录的浓淡',[['unknown','未记录'],['light','偏淡'],['regular','一般'],['strong','偏浓']],r.strength??'unknown')+inputField('brew','冲泡方式 <small>选填</small>',r.brew,'text','maxlength="120" placeholder="浸泡多久、手冲、冲泡次数等"')+inputField('brand','品牌 <small>选填</small>',r.brand,'text','maxlength="120"'),!!(r.brand||r.brew))}${selectField('caffeineMode','咖啡因如何记录',[['reference','按已核实的类别与体积估计范围'],['label','按产品标签明确填写'],['unknown','保持未知，不估计'],...(mode==='legacy'?[['legacy','保留早期自行估计，来源未注明']]:[])],mode)}<div class="caffeine-label-fields">${inputField('labelMg','标签 / 包装上的咖啡因 <small>mg，选填</small>',r.caffeineLabel?.valueMg??r.caffeineEstimate?.labelMg??(mode==='legacy'?r.estimatedCaffeineMg:null),'number','min="0" max="10000" step="any" inputmode="decimal" placeholder="未知与 0 分开"')}${selectField('labelBasis','标签标注的依据',[['total','本次饮用总量'],['per-cup','每杯'],['per100ml','每 100 ml']],r.caffeineLabel?.basis??r.caffeineEstimate?.labelBasis??'total')}${inputField('labelNote','标签出处 <small>选填</small>',r.caffeineLabel?.note??r.caffeineEstimate?.labelNote??'','text','maxlength="500" placeholder="包装名称、标签文字等"')}</div><div class="caffeine-preview" id="caffeine-preview" role="status">咖啡因未知</div>${textField('note','备注',r.note,'其他想补充的内容。',1000)}`;
}
function beverageData(form){
 const value=name=>form.elements[name]?.value??'';
 const unit=value('unit'),cupCount=unit==='杯'?numberValue(form,'amount'):numberValue(form,'cupCountExtra');
 const input={drink:value('drink'),drinkKind:value('drinkKind'),cupCount,volumePerCupMl:numberValue(form,'volumePerCupMl'),mode:value('caffeineMode'),labelMg:numberValue(form,'labelMg'),labelBasis:value('labelBasis'),labelNote:value('labelNote')};
 return {...input,estimate:input.mode==='legacy'?null:caffeineEstimate(input)};
}
function updateBeveragePreview(){const form=$('#record-form');if(form?.dataset.type!=='caffeine')return;const preview=$('#caffeine-preview');try{const d=beverageData(form),v=d.estimate,ref=v&&CAFFEINE_REFERENCES.find(r=>r.id===v.sourceId);preview.innerHTML=v?`<strong>${v.method==='reference-range'?'估计范围':'按标签'}：${Math.round(v.lowMg)}${v.lowMg!==v.highMg?'–'+Math.round(v.highMg):''} mg</strong><details class="review-detail"><summary>${v.method==='reference-range'?'估计依据':'标签记录'}</summary><p>${v.method==='reference-range'?`本次 ${v.volumeUsedMl} ml；参照 ${v.sourceServingMl} ml 含 ${v.sourceMinMg}–${v.sourceMaxMg} mg（${e(ref?.source??'')}）。按体积粗略换算，实际产品可能不同。`:'保留标签数值、计量依据与出处。'}</p></details>`:d.mode==='legacy'?'早期自行估计 · 来源未注明':'咖啡因未知';form.querySelector('.caffeine-label-fields').classList.toggle('hidden',!['label','legacy'].includes(d.mode));}catch(err){preview.textContent=err.message;}}

function summary(r){
 const ratings=[Number.isFinite(r.anxiety)?`风 ${r.anxiety}/10`:'',Number.isFinite(r.lowMood)?`云 ${r.lowMood}/10`:''].filter(Boolean).join(' · ');
 if(r.type==='narrative')return r.originalText;
 if(r.type==='moment')return [ratings,r.event||r.worry||'只记下了当时的感受'].filter(Boolean).join(' · ');
 if(r.type==='daily')return [ratings,r.note,(r.diet||r.relationshipNote||r.socialNote||r.exerciseMinutes!==null||r.sleepHours!==null)?'含早期未分类信息':''].filter(Boolean).join(' · ')||'记录了当天的整体感受';
 if(r.type==='medication')return `${r.name} · ${r.dose} ${r.unit} · ${r.use==='regular'?'常规':'按需'}${r.reason?' · '+r.reason:''}`;
 if(r.type==='caffeine')return caffeineText(r);
 if(r.type==='activity')return [classificationLabel(r),r.name,r.durationMinutes===null?'时长未知':r.durationMinutes+' 分钟（一次事件）',r.intensity&&r.intensity!=='unknown'?'强度 '+({light:'较轻',moderate:'中等',vigorous:'较强'}[r.intensity]??r.intensity):''].filter(Boolean).join(' · ');
 if(r.type==='sleep')return '醒来日 '+r.localDate+' · 夜间睡眠 '+(r.sleepHours===null?'未记录':r.sleepHours+' 小时');
 if(r.type==='checkin')return ({caffeine:'咖啡因摄入',medication:'用药',activity:'活动'}[r.domain])+' · '+(r.status==='none'?'明确没有':'明确有过')+' · '+(r.scope==='so-far'?'截至记录时':'对当天的回顾');
 if(r.type==='diet')return [classificationLabel(r),r.name,r.quantity!==null&&r.quantity!==undefined?quantityText(r):r.amount!==null?r.amount+' '+r.unit:'份量未知'].filter(Boolean).join(' · ');
 if(r.type==='symptom')return `${r.name}${r.site?' · '+r.site:''}${r.intensity===null?'':` · 不适 ${r.intensity}/10`}`;
 if(r.type==='occurrence')return `${r.anxietyOccurrence==='no'?(r.occurrenceScope==='so-far'?'截至记录时没有焦虑感':'当天没有焦虑感'):r.anxietyOccurrence==='yes'?'当天有过焦虑感':'焦虑情况未记录'} · 低落感${r.lowMoodOccurrence==='unknown'?'另未填写':r.lowMoodOccurrence==='yes'?'有过':'没有'}`;
 if(r.type==='screening')return `${SCREENERS.find(s=>s.id===r.scaleId)?.label} · ${r.total===null?'未完成，无总分':r.total+' / '+r.answers.length*3} · ${r.windowStart}–${r.windowEnd}`;
 return `${r.category} · ${r.name}${r.amount===null?'':` · ${r.amount} ${r.unit}`}${r.note?' · '+r.note:''}`;
}
function recordRow(r){return `<button class="record-row" data-record="${e(r.id)}" aria-label="查看${e(titles[r.type])}，${e(timeLabel(r))}"><span class="record-dot ${r.type}">${['moment','narrative'].includes(r.type)&&Number.isFinite(r.anxiety)?r.anxiety:icon(typeIcon[r.type])}</span><span class="record-main"><span class="record-head"><b>${titles[r.type]}${r.entryProvenance?.mode==='retrospective'?' · 补记':''}</b><time datetime="${r.occurredAt}">${timeLabel(r)}</time></span><span class="record-preview">${e(summary(r))}</span>${r.context?`<span class="record-label">${e(r.context)}</span>`:''}${['anxiety','lowMood'].some(k=>['estimated-language','relative-baseline','edited-suggestion'].includes(ratingSource(r,k).origin))?'<span class="record-label">已审阅的近似自评</span>':''}</span><span class="record-end" aria-hidden="true">›</span></button>`;}
function home(){
 const today=localDay(),recent=sortRecords(records).slice(0,2),daily=records.find(r=>r.type==='daily'&&r.localDate===today);
 const tile=(type,title,sub,ic,action='')=>`<button class="quick-action" ${action?`data-action="${action}"`:`data-add="${type}"`}><span class="quick-icon">${icon(ic)}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
 return `<section class="home-layout"><div class="home-hero"><div class="eyebrow">${shortDate(today)}</div><h1>此刻，轻轻记下。</h1><p class="intro">给感受与生活，留一点位置。</p><div class="landscape" aria-hidden="true"><i class="paint-hills"></i><i class="paint-water"></i><i class="paint-flower"></i></div>${weather.statusButtonHtml()}<div class="hero-bottom"><button class="primary" data-add="moment">${icon('sun')}记录此刻</button><button class="small-ai" data-action="ai-entry">${icon('edit')}AI 说说此刻</button></div></div><div class="home-side"><section class="daily-section" aria-labelledby="daily-heading"><div class="section-title"><h2 id="daily-heading">生活的细小切片</h2><span>想记的时候，再记</span></div><div class="quick-grid">${tile('daily','每日小记',daily?'今天已记，可以补充':'整体感受与随笔','moon')}${tile('diet','饮食','食物、咖啡与茶等饮品','bowl','diet-section')}${tile('activity','活动','运动、室外、社交与关系','leaf')}${tile('sleep','睡眠','夜间、午睡与设备记录','moon')}${tile('medication','用药记录','实际名称、剂量与时间','pill')}${tile('symptom','身体感受','原词、部位与强度','wave')}</div><div class="home-links"><button class="text-button" data-action="no-anxiety">今天无焦虑</button><button class="text-button" data-action="backfill">补记某一天</button><button class="text-button" data-action="screeners">快速筛查</button></div></section><section class="recent" aria-labelledby="recent-heading"><div class="section-title"><h2 id="recent-heading">最近留下的</h2><button class="text-button" data-go="history">翻一翻 →</button></div>${recent.length?recent.map(recordRow).join(''):'<p class="empty-inline">这一页还是空白。<br>你的第一笔，会从此刻开始。</p>'}</section></div></section>`;
}
function history(){
 const list=sortRecords(records.filter(r=>(filter==='all'||filter==='diet-all'&&['diet','caffeine'].includes(r.type)||r.type===filter)&&(!search||`${summary(r)} ${r.worry||''} ${r.context||''} ${r.relationshipNote||''} ${r.socialNote||''} ${r.diet||''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
 let lastDay='';const rows=list.map(r=>{const label=r.localDate!==lastDay?`<h2 class="history-day">${shortDate(r.localDate)} <span class="small">${r.localDate.slice(0,4)}</span></h2>`:'';lastDay=r.localDate;return label+recordRow(r);}).join('');
 return `<section class="content-narrow">${heading('Little traces','拾记','把零散的片刻，轻轻收在这里。',`<button class="round-button" data-action="choose" aria-label="新增记录">${icon('plus')}</button>`)}<div class="filter-row" role="group" aria-label="记录类型">${[['all','全部'],['diet-all','饮食'],...TYPES.filter(t=>!['diet','caffeine','checkin'].includes(t)).map(t=>[t,titles[t]])].map(([v,l])=>`<button class="filter" data-filter="${v}" aria-pressed="${filter===v}">${l}</button>`).join('')}</div><input class="search" id="history-search" type="search" placeholder="找一段文字…" aria-label="搜索本机记录" value="${e(search)}"><div id="history-results">${rows||empty(records.length?'还没有找到这段片刻':'每一笔，都有自己的位置',records.length?'试试其他文字或记录类型。':'以后回头看时，你写下的感受与生活<br>会安静地留在这里。',!records.length)}</div>${list.length?`<p class="count-note">${list.length} 条记录 · 点开可查看与修改</p>`:''}</section>`;
}
function chart(summary){
 const {rows}=summary, width=540, height=210, left=26, right=18, top=20, bottom=35;
 const x=i=>left+i*(width-left-right)/(rows.length-1), y=n=>top+(10-n)*(height-top-bottom)/10;
 let lines='';for(let i=1;i<rows.length;i++)if(rows[i-1].anxiety!==null&&rows[i].anxiety!==null)lines+=`<path class="data-line" d="M${x(i-1)},${y(rows[i-1].anxiety)} L${x(i)},${y(rows[i].anxiety)}"/>`;
 return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="近 ${period} 天${summary.metric==='lowMood'?'低落感':'焦虑感'}每日均值，缺失日期留空，下方提供数据表。">${[0,5,10].map(n=>`<line class="grid" x1="${left}" x2="${width-right}" y1="${y(n)}" y2="${y(n)}"/><text x="0" y="${y(n)+4}">${n}</text>`).join('')}${lines}${rows.map((r,i)=>r.anxiety===null?'':`<circle class="data-dot" cx="${x(i)}" cy="${y(r.anxiety)}" r="4.5"><title>${r.day}：${r.anxiety.toFixed(1)}，${r.count} 次记录</title></circle>`).join('')}${[0,Math.floor(rows.length/2),rows.length-1].map(i=>`<text text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}" x="${x(i)}" y="203">${rows[i].day.slice(5).replace('-','/')}</text>`).join('')}</svg>`;
}
function review(){
 const s=summarize(records,period,new Date(),reviewMetric),low=reviewMetric==='lowMood',label=low?'低落感':'焦虑感',assessments=sortRecords(records.filter(r=>r.type==='screening')).slice(0,4);
 return `<section class="content-narrow">${heading('A gentle perspective','回望','看见变化，不急着下结论。')}<div class="filter-row" role="group" aria-label="选择心绪指标">${[['anxiety','心里的风 · 焦虑感'],['lowMood','心上的云 · 低落感']].map(([v,l])=>`<button class="filter" data-review-metric="${v}" aria-pressed="${reviewMetric===v}">${l}</button>`).join('')}</div><div class="filter-row" role="group" aria-label="回顾时间范围">${[7,14,30].map(n=>`<button class="filter" data-period="${n}" aria-pressed="${period===n}">近 ${n} 天</button>`).join('')}</div><div class="occurrence-panel"><h2>${label}出现的日子</h2><p><strong>${s.occurrenceDays}</strong> 天 / 有明确记录的 <strong>${s.validOccurrenceDays}</strong> 天</p><p class="field-help">生活记录覆盖 ${s.recordedDays} / ${period} 天；本项有明确自述 ${s.validOccurrenceDays} / ${period} 天，其余日期未知。同一天多笔也只计一天。“没有”可能仅截至记录时，不是全天监测或临床发作频率。</p></div><div class="chart-panel"><div class="chart-top"><div><h2>${low?'云的浓淡':'风的起伏'}</h2><p class="chart-caption">${label} 0–10 · 日常自评，非量表</p></div><div class="chart-mean">${s.mean===null?'—':s.mean.toFixed(1)}<small> / 10</small></div></div>${chart(s)}<p class="review-message">${s.count?`${s.count} 次强度记录，覆盖 ${s.observedDays} 天；其中 ${s.estimatedCount} 次来自经你确认的近似或比较草稿。右上是这些记录的均值，图中是当日均值。`:'还没有这一项的强度记录。缺失不代表没有这种感受。'}</p></div>${s.observedDays<3?'<div class="note-panel"><h3>先留下一些片刻就好</h3><p>目前数据很少，只展示已经记下的内容。缺失日期留空，不补成 0，也不判断变好或变差。</p></div>':''}<details class="review-detail"><summary>查看每天的数据</summary><div class="table-wrap"><table><caption>— 表示未记录。量表总分不拆成每日数据。</caption><thead><tr><th scope="col">日期</th><th scope="col">${label} / 次数</th><th scope="col">当天出现</th><th scope="col">夜间睡眠 h</th><th scope="col">旧式运动 min</th><th scope="col">用药次数</th><th scope="col">饮品次数</th></tr></thead><tbody>${s.rows.map(r=>`<tr><td>${r.day.slice(5)}</td><td>${r.anxiety===null?'—':r.anxiety.toFixed(1)+' / '+r.count}</td><td>${r.occurrence.value===null?'—':r.occurrence.value?'有过':'没有'+(r.occurrence.provisional?'（截至当时）':'')}${r.occurrence.resolvedConflict?' · 后续有记录':''}</td><td>${r.sleepHours===null?'—':r.sleepHours}</td><td>${r.exerciseMinutes===null?'—':r.exerciseMinutes}</td><td>${r.medicationCount===null?'—':r.medicationCount}</td><td>${r.caffeineCount===null?'—':r.caffeineCount}</td></tr>`).join('')}</tbody></table></div></details><div class="section-title"><h2>独立的两周评估</h2><button class="text-button" data-action="screeners">选择量表 →</button></div>${assessments.length?assessments.map(recordRow).join(''):'<p class="empty-inline">还没有评估记录。日常滑块和两周量表各自保留。</p>'}<div class="note-panel"><h3>生活的线索</h3><p>按真实日历看看记录之间的关系。明确自评与近似草稿分开；数据不足时只看原始点，不补造范围。</p><button class="secondary" data-go="analysis">看看记录间的关联 →</button><details class="review-detail"><summary>查看方法与局限</summary><p>记录频率、漏记、回忆偏差与近似评分都会影响结果。用药与感受还可能有适应证混杂、反向因果，时间序列涉及趋势、自相关与多重比较。即使发现关联，也不能据此推断因果或调整药物。</p></details></div></section>`;
}
function settings(){return `<section class="content-narrow">${heading('Your quiet space','我的','这片留白，属于你。')}<div class="privacy-box"><h3>${icon('lock')} 记录留在当前设备</h3><p>记录保存在当前设备，未加密、无应用锁。清除网站数据或更换入口前，请先备份。</p></div><div class="settings-group"><h2>记录与副本</h2><button class="setting-row" data-action="export">${icon('download')}<span><b>导出完整备份</b><small>未加密 JSON · ${records.length} 条记录</small></span><span>›</span></button><button class="setting-row" data-action="import">${icon('upload')}<span><b>从备份导入</b><small>先核对数量，重复记录保留本机版本</small></span><span>›</span></button><input id="import-file" class="hidden" type="file" accept=".json,application/json" aria-label="选择浮光 JSON 备份"><p class="field-help">备份含私人文字与用药资料，请保存在可信位置，不要上传到公开仓库。</p><button class="setting-row" data-action="clear-shortcuts">${icon('book')}<span><b>清理快捷草稿历史</b><small>原记录保留；之后的新输入仍可形成草稿</small></span><span>›</span></button><button class="text-button" data-action="restore-shortcuts">重新从现有记录生成快捷草稿</button></div><div class="settings-group"><h2>整理与回看</h2><button class="setting-row" data-action="screeners">${icon('book')}<span><b>快速筛查</b><small>PHQ-9 / GAD-7 · 回顾过去两周，筛查不是诊断</small></span><span>›</span></button><button class="setting-row" data-action="ai-config">${icon('edit')}<span><b>我的 AI 接口 · ${aiStatus().enabled?'本次会话已开启':'默认关闭'}</b><small>自选服务与模型；每次发送前审核正文和去向</small></span><span>›</span></button><button class="setting-row" data-go="analysis">${icon('wave')}<span><b>记录之间的线索</b><small>每日片刻和量表窗口分别探索，不判断因果</small></span><span>›</span></button></div><div class="settings-group"><h2>按照你的习惯</h2><button class="setting-row" data-weather-action="open">${icon('sun')}<span><b>天气氛围 · 可选</b><small>默认关闭，选择城市或定位前先查看提供方</small></span><span>›</span></button><label class="setting-row">${icon('leaf')}<span><b>减少动态效果</b><small>同时遵循设备的减少动态设置</small></span><input type="checkbox" id="reduce-motion" ${document.body.classList.contains('reduce-motion')?'checked':''}></label><label class="setting-row">${icon('sun')}<span><b>使用实色界面</b><small>让边界更清楚</small></span><input type="checkbox" id="solid-material" ${document.body.classList.contains('solid-material')?'checked':''}></label><button class="setting-row" data-action="install">${icon('phone')}<span><b>添加到 iPhone 主屏幕</b><small>Safari 打开固定的 HTTPS 入口</small></span><span>›</span></button></div><div class="settings-group"><button class="setting-row" data-action="help">${icon('leaf')}<span><b>需要支持时</b><small>与评分无关，随时可查看</small></span><span>›</span></button><button class="setting-row" data-action="delete-all">${icon('close')}<span><b>删除当前入口的全部资料</b><small>需要再次确认；已导出的备份不会随之删除</small></span><span>›</span></button></div><div class="note-panel"><h3>关于浮光</h3><p>记录片刻，也回望生活。日常感受、两周筛查与生活线索，各有自己的位置。</p><p class="about-mark">浮光</p></div></section>`;}
function render({focus=false}={}){
 if(!ready)return;
 associationView.sync(records);
 if(tab!=='analysis')associationView.deactivate();
 main.innerHTML=({now:home,history,review,settings,analysis:()=>associationView.html(records)}[tab])();
 document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===(tab==='analysis'?'review':tab))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 weather.apply();
 if(focus){main.focus({preventScroll:true});pageScroll.scrollTo({top:0,behavior:'instant'});}
}
function go(next){tab=next;render({focus:true});}
function showEditor(content){recordControls.clear();dirty=false;modal.show(content);recordControls.refresh();}
function sheetTop(title){return `<header class="sheet-top"><h2 id="editor-title">${title}</h2><button class="close" data-action="close-editor" aria-label="关闭">${icon('close')}</button></header>`;}
function closeEditor(){recordControls.clear();editing=null;dirty=false;draftLink=null;modal.close();}
async function requestClose(){if(aiRunning){cancelAI();aiRunning=false;}if(busy)return;if(!dirty||await ask('暂时离开？','还没有保存的内容会被丢弃。你也可以继续写。','丢弃内容','继续写'))closeEditor();}
function ask(title,message,yes='确认',no='取消'){
 return new Promise(resolve=>{
  const previous=document.activeElement;
  confirmDialog.innerHTML=`<h2 id="confirm-title">${e(title)}</h2><p>${e(message)}</p><div class="confirm-actions"><button class="secondary" data-confirm="no" autofocus>${e(no)}</button><button class="primary" data-confirm="yes">${e(yes)}</button></div>`;
  const done=value=>{confirmDialog.close();confirmDialog.removeEventListener('click',click);confirmDialog.removeEventListener('cancel',cancel);previous?.focus?.({preventScroll:true});resolve(value);};
  const click=ev=>{const b=ev.target.closest('[data-confirm]');if(b)done(b.dataset.confirm==='yes');};const cancel=ev=>{ev.preventDefault();done(false);};
  confirmDialog.addEventListener('click',click);confirmDialog.addEventListener('cancel',cancel);confirmDialog.showModal();
 });
}
function formFor(type,previous=null,day=localDay(),draft=null){
 draftLink=draft?.sourceNarrativeId?{sourceNarrativeId:draft.sourceNarrativeId,sourceFragmentKey:draft.sourceFragmentKey,quote:draft.note??''}:null;
 if(type==='narrative'){if(previous){narrativeDraft={...previous};reviewNarrative(previous);}else captureNarrative(false,false,day);return;}
 if(type==='screening'){if(previous)screeningForm(previous.scaleId,previous);else screenerPicker();return;}
 if(type==='occurrence'&&!previous){noAnxiety(day);return;}
 editing=previous;selectedMood=previous?.mood??null;ratingState={};
 const r=previous??draft??{},past=day!==localDay(),time=previous?localInput(new Date(previous.occurredAt)):draft?.time??(past?'':localInput());
 let fields='';
 if(type==='moment')fields=`<p class="sheet-intro">这个片刻，心里是什么天气？</p>${ratingControl('anxiety',r.anxiety??null,r.ratingProvenance?.anxiety,true)}${ratingControl('lowMood',r.lowMood??null,r.ratingProvenance?.lowMood)}${textField('event','刚刚发生了什么',r.event,'一个瞬间，或一句话。')}${textField('worry','脑海里有什么担心',r.worry,'可以先把它放在这里。')}${optional('补充情境与时间',inputField('context','当时的情境 <small>选填，可自定义</small>',r.context??'','text','maxlength="120" list="contexts" placeholder="例如：工作、相处、社交、独处"')+'<datalist id="contexts"><option value="工作"><option value="情感与关系"><option value="社交"><option value="独处"><option value="家庭"><option value="健康"></datalist>'+inputField('time','发生时间',time,'datetime-local','required',past?'正在补记 '+day+'，请明确填写发生时间；创建时间仍记录为现在。':''),!!r.context||past)}`;
 if(type==='daily')fields=dailyFields(r,day,entryHelpers());
 if(type==='sleep')fields=sleepFieldsHTML(r,day,entryHelpers())+(records.some(v=>v.type==='daily'&&v.localDate===day&&v.sleepHours!==null)?'<p class="field-help">已有早期睡眠记录；新记录将用于回望，原文保留。</p>':'');
 if(type==='medication')fields=`<p class="sheet-intro">记下这一次实际使用的药物。</p>${inputField('name','药物名称',r.name,'text','required maxlength="120" placeholder="按药盒或处方填写"')}<div class="two-fields">${inputField('dose','实际剂量',r.dose,'number','required min="0.000001" max="1000000" step="any" inputmode="decimal"')}${inputField('unit','单位',r.unit,'text','required maxlength="30" list="dose-units" placeholder="例如 mg、片"')}</div><datalist id="dose-units"><option value="mg"><option value="μg"><option value="g"><option value="ml"><option value="片"><option value="粒"><option value="滴"></datalist>${inputField('route','使用途径 <small>选填，按实际记录</small>',r.route??'','text','maxlength="120" placeholder="例如口服；不知道可留空"')}${inputField('time','用药时间',time,'datetime-local','required')}${selectField('use','用药方式',[['regular','常规用药'],['as-needed','按需用药']],r.use??'regular')}${optional('补充类别与原因',selectField('category','药物类别（可选）',[['unspecified','未分类'],['sleep','睡眠相关药物'],['anxiety','焦虑相关药物'],['other','其他药物']],r.category??'unspecified')+textField('reason','这次用药的原因',r.reason,'按实际情况记下。',1000),!!r.reason)}`;
 if(type==='caffeine')fields=beverageFields(r,time);
 if(type==='diet')fields=foodFields(r,time,records,entryHelpers());
 if(type==='activity')fields=activityFields(r,time,day,records,entryHelpers());
 if(type==='occurrence')fields=`${inputField('time','记录时间',time,'datetime-local','required')}${selectField('anxietyOccurrence','焦虑出现情况',[['unknown','未记录'],['yes','有过'],['no','没有']],r.anxietyOccurrence??'unknown')}${selectField('lowMoodOccurrence','低落出现情况',[['unknown','未记录'],['yes','有过'],['no','没有']],r.lowMoodOccurrence??'unknown')}${selectField('occurrenceScope','这次记录的范围',[['so-far','仅截至记录时'],['whole-day','对当天的回顾']],r.occurrenceScope??'so-far')}${textField('note','备注',r.note)}`;
 if(type==='checkin')fields=inputField('time','记录时间',time,'datetime-local','required')+selectField('domain','确认哪一项',[['caffeine','咖啡因摄入'],['medication','用药'],['activity','活动']],r.domain)+selectField('status','明确记录',[['none','没有'],['some','有过']],r.status)+selectField('scope','记录范围',[['so-far','截至记录时'],['whole-day','对当天的回顾']],r.scope)+textField('note','备注',r.note??'');
 if(type==='symptom')fields=`<p class="sheet-intro">身体有什么想告诉你？</p>${inputField('name','身体有什么感受',r.name,'text','required maxlength="120" list="symptoms" placeholder="选择常见感受，或按自己的话写"')}<datalist id="symptoms"><option value="头痛"><option value="胃部不适"><option value="心悸"><option value="胸部不适"><option value="疲乏"><option value="头晕"><option value="其他"></datalist>${inputField('site','部位 <small>选填</small>',r.site,'text','maxlength="120"')}${inputField('intensity','不适强度 <small>0–10，选填</small>',r.intensity,'number','min="0" max="10" step="1" placeholder="未知留空"')}${inputField('time','这条感受的记录时间',time,'datetime-local','required')}${optional('补充开始、结束与原话',inputField('startAt','感受开始 <small>选填</small>',r.startAt?localInput(new Date(r.startAt)):'','datetime-local')+inputField('endAt','感受结束 <small>选填</small>',r.endAt?localInput(new Date(r.endAt)):'','datetime-local')+textField('note','你的原话',r.note,'位置、变化或其他描述。'),!!r.note)}`;
 const prior=previous;showEditor(`${sheetTop(`${previous?'编辑':'记录'}${titles[type]}`)}<form id="record-form" class="sheet-body" data-type="${type}" data-target-day="${day}">${past&&!previous?`<p class="backfill-note">补记 · ${day}</p>`:''}${draftLink?'<p class="backfill-note">来自刚才的叙述，核对后保存。</p>':''}${recentPresetHtml(type)}${fields}${['activity','medication'].includes(type)&&!previous?`<button type="button" class="text-button" data-no-exposure="${type==='activity'?'activity':'medication'}" data-entry-day="${day}">${day===localDay()?'今天截至此刻':'当天'}没有${type==='activity'?'活动':'用药'}</button>`:''}<p class="form-error" id="form-error" role="alert"></p><div class="sheet-footer"><button class="secondary" type="button" data-action="close-editor">取消</button><button class="primary" type="submit">${icon('check')}${previous?'保存修改':'轻轻记下'}</button></div><p class="count-note">${icon('lock')}保存在当前设备</p></form>`);editing=prior;if(type==='caffeine')updateBeveragePreview();syncCategoryUI();
}
function moodIcon(i){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01" stroke-width="2"/>${i<2?'<path d="M8 16q4-4 8 0"/>':i===2?'<path d="M8 15h8"/>':'<path d="M8 14q4 5 8 0"/>'}</svg>`;}
async function add(type,day=localDay()){
 if(!ready){toast('本机存储还未准备好');return;}
 records=await allRecords();if(type==='daily'||type==='sleep'){const existing=records.find(r=>r.type===type&&r.localDate===day);formFor(type,existing??null,day);}else formFor(type,null,day);
}
function choose(){showEditor(`${sheetTop('留下一个片刻')}<div class="sheet-body"><p class="sheet-intro">从想记录的那一项开始。</p>${[['daily','每日小记','moon'],['activity','活动','leaf'],['sleep','睡眠','moon'],['medication','用药记录','pill'],['symptom','身体感受','wave'],['moment','此刻','sun'],['narrative','随手说一句','book']].map(([type,label,ic])=>`<button class="setting-row" data-add="${type}">${icon(ic)}<span><b>${label}</b></span><span>›</span></button>`).join('')}<button class="setting-row" data-action="diet-section">${icon('bowl')}<span><b>饮食 · 食物与饮品</b></span><span>›</span></button><button class="setting-row" data-action="screeners">${icon('book')}<span><b>快速筛查</b></span><span>›</span></button></div>`);}
function detail(id){
 const r=records.find(r=>r.id===id);if(!r)return;
 const part=(label,value)=>value!==null&&value!==undefined&&value!==''?`<div class="detail-section"><h3>${label}</h3><p class="detail-value">${e(value)}</p></div>`:'';
 let body='';
 if(['moment','narrative','daily'].includes(r.type))for(const [kind,label]of [['anxiety','心里的风 · 焦虑感'],['lowMood','心上的云 · 低落感']])if(Number.isFinite(r[kind]))body+=part(label,`${r[kind]} / 10 · ${ratingDescription(kind,r[kind]).text}`)+part('评分来源',provenanceText(ratingSource(r,kind),r[kind]));
 if(r.type==='narrative')body+=part('整理前原文',r.sourceText)+part('审阅后的叙述',r.originalText)+part('你确认的话题',r.topics.join('、'))+part('原话里的时间线索',r.timeNote)+r.fragments.map(f=>part(f.topic+' · 原话片段',f.quote)).join('')+part('整理方式',{local:'早期本地整理 · 已审阅',ai:'AI 片段整理 · 已审阅',manual:'手动整理'}[r.method]);
 if(r.type==='moment')body+=part('发生的事',r.event)+part('脑海里的担心',r.worry)+part('当时的情境',r.context);
 if(r.type==='daily'){
  body+=part('整体心情（旧式）',r.mood===null?'未记录':MOODS[r.mood])+part('夜间睡眠（不含午睡）',r.sleepHours===null?'未记录':r.sleepHours+' 小时')+part('当天运动（旧式合计）',r.exerciseMinutes===null?'未记录':r.exerciseMinutes+' 分钟')+part('今日随笔',r.note)+part('情感与关系',r.relationshipNote)+part('社交与独处',r.socialNote)+part('饮食随记',r.diet);
  for(const [key,label]of [['anxietyOccurrence','焦虑出现情况'],['lowMoodOccurrence','低落出现情况']])body+=part(label,{unknown:'未记录 / 不确定',yes:'有过',no:r.occurrenceScope==='so-far'?'截至记录时没有':'当天没有'}[r[key]??'unknown']);
  const d=r.sleepDetails;if(d){const report={unknown:'未注明',self:'自己感受 / 推测',other:'他人告诉我',device:'设备提示'};for(const [key,label]of [['nightmares','噩梦'],['grinding','磨牙'],['snoring','打鼾']])body+=part(label,`${{unknown:'未记录 / 不清楚',yes:'有',no:'明确没有'}[d[key]]} · ${report[d[key+'Source']]}`);body+=part('主观睡眠感受',{unknown:'未记录',restful:'感觉休息得不错',poor:'感觉睡得不好',shallow:'自己感觉睡得浅','poor-and-shallow':'睡得不好，也感觉浅'}[d.subjective])+part('设备来源（手动记录）',d.deviceSource)+part('设备估计深睡',d.deepMinutes===null?'未记录':d.deepMinutes+' 分钟')+part('设备估计其余睡眠阶段',d.otherStageMinutes===null?'未记录':d.otherStageMinutes+' 分钟')+(d.naps??[]).map(n=>part(n.kind==='nap'?'午睡 / 小憩':'补觉',`${new Date(n.startAt).toLocaleString('zh-CN')} · ${n.durationMinutes} 分钟（不加进夜间睡眠）`)).join('');}
 }
 if(r.type==='medication')body=part('药物名称',r.name)+part('实际剂量',`${r.dose} ${r.unit}`)+part('用药方式',r.use==='regular'?'常规用药':'按需用药')+part('类别',{unspecified:'未分类',sleep:'睡眠相关药物',anxiety:'焦虑相关药物',other:'其他药物'}[r.category])+part('这次用药的原因',r.reason);
 if(r.type==='caffeine')body=part('饮品原始记录',caffeineText(r))+part('品牌',r.brand)+part('冲泡方式',r.brew)+part('你记录的浓淡',{unknown:'未记录',light:'偏淡',regular:'一般',strong:'偏浓'}[r.strength])+part('咖啡因来源',r.caffeineEstimate?r.caffeineEstimate.method==='reference-range'?`${CAFFEINE_REFERENCES.find(x=>x.id===r.caffeineEstimate.sourceId)?.source}：每 ${r.caffeineEstimate.sourceServingMl} ml 含 ${r.caffeineEstimate.sourceMinMg}–${r.caffeineEstimate.sourceMaxMg} mg；本次 ${r.caffeineEstimate.volumeUsedMl} ml 线性换算。实际含量可能不同。`:`产品标签：${r.caffeineEstimate.labelMg} mg，${{total:'本次总量','per-cup':'每杯',per100ml:'每100ml'}[r.caffeineEstimate.labelBasis]}。${r.caffeineEstimate.labelNote}`:r.estimatedCaffeineMg!==null?'早期自行估计，未注明来源':'未知，不按 0 计算')+part('备注',r.note);
 if(r.type==='diet')body=part('分类',classificationLabel(r))+part('食物或饮品',r.name)+part('结构化数量',quantityText(r))+part('保留的原分类文字',r.category)+part('保留的原份量',r.amount===null?'未记录':r.amount+' '+r.unit)+part('备注',r.note);
 if(r.type==='activity')body=part('活动',summary(r))+part('分类',classificationLabel(r))+part('强度（与类型分开）',{unknown:'未记录',light:'较轻',moderate:'中等',vigorous:'较强'}[r.intensity??'unknown'])+part('标签（同一事件时长不重复加总）',r.tags.map(t=>({exercise:'运动',walk:'散步',outdoor:'外出',sunlight:'在阳光下',social:'社交',relationship:'情感与关系',game:'游戏',other:'其他'}[t])).join('、'))+part('活动开始时刻',r.startAt?new Date(r.startAt).toLocaleString('zh-CN'):'未单独填写；列表保留记录时刻或日期锚点')+part('随记',r.note);
 if(r.type==='sleep')body=sleepDetailHTML(r,part);
 if(r.type==='checkin')body=part('当天确认',summary(r))+part('备注',r.note);
 if(r.type==='symptom')body=part('身体感受原词',r.name)+part('部位',r.site)+part('不适强度',r.intensity===null?'未记录':r.intensity+' /10')+part('开始',r.startAt?new Date(r.startAt).toLocaleString('zh-CN'):'未记录')+part('结束',r.endAt?new Date(r.endAt).toLocaleString('zh-CN'):'未记录')+part('原话',r.note)+part('说明','这里只记录感受，没有自动判断病因或归因于焦虑。');
 if(r.type==='occurrence')body=part('当天情况',summary(r))+part('范围',r.occurrenceScope==='so-far'?'仅截至记录时，后来仍可另记':'用户回顾的当天')+part('备注',r.note);
 if(r.type==='screening'){
  const spec=SCREENERS.find(s=>s.id===r.scaleId),result=scoreScreener(r.scaleId,r.answers);
  body=part('独立评估',spec.label+' · 过去 '+(spec.recallDays??14)+' 天')+part('回顾日期',`${r.windowStart}–${r.windowEnd}`)+part('总分',r.total===null?'未完成，不计算总分':`${r.total} / ${spec.items.length*3}`)+spec.items.map((q,i)=>part(`${i+1}. ${q}`,r.answers[i]===null?'未填写':`${r.answers[i]} · ${SCALE_OPTIONS[r.answers[i]]}`)).join('')+part('功能影响（不计入总分）',r.functionalImpairment===null?'未填写':FUNCTIONAL_OPTIONS[r.functionalImpairment])+screeningInterpretation(spec,result)+`<button class="text-button" data-action="help">需要支持时</button>`;
 }
 if(r.sourceNarrativeId){const parent=records.find(p=>p.id===r.sourceNarrativeId);body+=part('来源','由叙述片段进入，分类、数量与时间经你确认；父叙述的话题不再额外计作事件。')+(parent?`<button class="text-button" data-record="${parent.id}">查看来源叙述</button>`:part('来源叙述','原叙述已不在当前入口，结构化记录仍保留。'));}
 showEditor(`${sheetTop(titles[r.type])}<div class="sheet-body"><p class="eyebrow">${shortDate(r.localDate)}${r.type==='daily'?'':` · ${timeLabel(r)}`}${r.entryProvenance?.mode==='retrospective'?' · 补记':''}</p>${body}<p class="detail-meta">发生 / 日期锚点：${e(r.occurredAt)}<br>实际创建：${e(new Date(r.createdAt).toLocaleString('zh-CN'))}<br>上次修改：${e(new Date(r.updatedAt).toLocaleString('zh-CN'))}</p><div class="sheet-footer"><button class="primary" data-edit="${r.id}">${icon('edit')}编辑这条记录</button></div><button class="delete-button" data-delete="${r.id}">删除这条记录</button><p id="detail-error" class="form-error" role="alert"></p></div>`);editing=r;
}
function formData(form){
 const data=Object.fromEntries(new FormData(form)),type=form.dataset.type;
 if(['moment','daily','narrative'].includes(type)){
  data.ratingProvenance={};for(const kind of ['anxiety','lowMood'])if(ratingState[kind]){data[kind]=ratingState[kind].value;data.ratingProvenance[kind]={...ratingState[kind].provenance,confirmed:true};}
 }
 if(type==='daily'||type==='sleep'){
  const date=data.day===localDay()?new Date():new Date(`${data.day}T12:00`);data.time=localInput(date);data.occurrenceScope=data.day===localDay()?'so-far':'whole-day';
  if(type==='daily')Object.assign(data,structuredData(type,form,editing,records,numberValue));
  else {data.wakeDate=data.day;data.sleepHours=numberValue(form,'sleepHours');data.sleepDetails=readSleepData(form);}
 }
 if(type==='narrative'){
  data.topics=[...form.querySelectorAll('[name=topics]:checked')].map(x=>x.value);data.fragments=(narrativeDraft?.fragments??[]).filter(f=>data.originalText.includes(f.quote)&&data.topics.includes(f.topic));data.method=narrativeDraft?.method??'manual';data.sourceText=narrativeDraft?.sourceText??narrativeDraft?.originalText??data.originalText;
 }
 if(type==='caffeine'){
  const d=beverageData(form);data.cupCount=d.cupCount;data.volumePerCupMl=d.volumePerCupMl;data.originalDrinkType=data.name;data.estimatedCaffeineMg=d.mode==='legacy'?numberValue(form,'labelMg'):null;
  if(d.mode!=='legacy')data.caffeineEstimate=d.estimate;
  data.caffeineLabel=d.mode==='label'&&d.labelMg!==null?{valueMg:d.labelMg,basis:d.labelBasis,note:d.labelNote}:null;
 }
 if(type==='activity'){Object.assign(data,structuredData(type,form,editing,records,numberValue));const actual=form.elements.activityStartAt.value;data.startAt=actual?new Date(actual).toISOString():null;if(actual)data.time=actual;const eventDay=localDay(new Date(data.time));data.entryProvenance={mode:eventDay<localDay()?'retrospective':'contemporaneous',timeMeaning:actual?'event':eventDay===localDay()?'log-time':'day-anchor',source:'manual'};}
 if(type==='diet')Object.assign(data,structuredData(type,form,editing,records,numberValue));
 if(['activity','diet'].includes(type)&&!data.categoryId){delete data.categoryId;delete data.categoryLabel;delete data.groupId;}
 if(draftLink||editing?.sourceNarrativeId){const link=draftLink??editing;data.sourceNarrativeId=link.sourceNarrativeId;data.sourceFragmentKey=link.sourceFragmentKey;const day=localDay(new Date(data.time));data.entryProvenance={...(data.entryProvenance??{}),mode:day<localDay()?'retrospective':'contemporaneous',timeMeaning:data.entryProvenance?.timeMeaning??'event',source:'narrative-structured-confirmed'};}
 if(type==='symptom')data.intensity=numberValue(form,'intensity');
 if(type==='screening'){
  const spec=SCREENERS.find(s=>s.id===data.scaleId);data.scaleVersion=spec.version;data.answers=spec.items.map((_,i)=>{const v=form.querySelector(`[name=answer-${i}]:checked`);return v?Number(v.value):null;});data.functionalImpairment=form.querySelector('[name=functionalImpairment]:checked')?Number(form.querySelector('[name=functionalImpairment]:checked').value):null;
  data.windowEnd=data.assessmentDay;data.windowStart=shiftDay(data.assessmentDay,-((spec.recallDays??14)-1));data.time=data.assessmentDay===localDay()?localInput():data.assessmentDay+'T12:00';
 }
 for(const key of ['dose','amount','estimatedCaffeineMg'])if(form.elements[key])data[key]=numberValue(form,key);
 return makeRecord(type,data,editing);
}
async function submit(form){
 if(busy||form.dataset.submitting)return;busy=true;form.dataset.submitting='true';const error=$('#form-error'),button=form.querySelector('[type=submit]'),label=button.innerHTML;error.textContent='';button.disabled=true;button.setAttribute('aria-busy','true');
 try{
  const record=formData(form);
  if(record.type==='screening'&&record.total===null&&!await ask('保留未完成的评估？','还有题目未回答。先保存，之后可以继续填写。','保留未完成','继续填写'))return;
  if(['daily','sleep'].includes(record.type)&&records.some(r=>r.type===record.type&&r.localDate===record.localDate&&r.id!==record.id)){error.textContent='这一天已有同类记录，请从拾记打开修改。';return;}
  button.textContent='正在保存…';await saveRecord(record,editing?.updatedAt??null);records=await allRecords();closeEditor();render();toast('已轻轻记下');if(record.type==='narrative')showNarrativeRoutes(record);else if(record.sourceNarrativeId){const parent=records.find(r=>r.id===record.sourceNarrativeId);if(parent)showNarrativeRoutes(parent);}
 }catch(err){error.textContent=err.message;error.scrollIntoView({block:'nearest'});}
 finally{busy=false;delete form.dataset.submitting;button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=label;}
}
async function remove(id){const r=records.find(r=>r.id===id);if(!r)return;if(!await ask('删除这个片刻？','删除后无法在应用里撤销。已经导出的备份不会随之删除。','确认删除','保留记录'))return;
 try{await deleteRecord(r);records=await allRecords();closeEditor();render();toast('这条记录已删除');}catch(err){$('#detail-error').textContent=err.message;}}
async function exportBackup(){
 records=await allRecords();
 if(!await ask('保存一份私人备份','将导出未加密的 JSON 文件，包含全部记录。请保存到你信任的位置；选择云盘会由该服务保存副本。','导出文件','取消'))return;
 const blob=new Blob([JSON.stringify(backupEnvelope(records))],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=`浮光备份-${localDay()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 toast('已生成备份文件，请确认下载已保存');
}
async function importBackup(file){
 if(!file)return;
 try {
  if(file.size>MAX_FILE)throw new Error('文件过大，请选择 12 MB 以内的浮光备份。');
  const incoming=parseBackup(await file.text());records=await allRecords();const preview=mergeRecords(records,incoming);
  if(!incoming.length){toast('这份备份里没有记录');return;}
  if(!await ask('导入这份备份？',`文件含 ${incoming.length} 条记录。\n将补充 ${preview.added} 条，跳过 ${preview.skipped} 条重复记录。\n相同标识或同日每日小记保留本机版本；全部通过校验后才写入。`,'确认导入','取消'))return;
  const result=await importRecords(incoming);records=await allRecords();render();toast(`已导入 ${result.added} 条，跳过 ${result.skipped} 条`);
 }catch(err){await ask('没有导入',err.message,'知道了','关闭');}
}
function privacy(){if(editor.open)return;go('settings');}
function install(){showEditor(`${sheetTop('添加到 iPhone 主屏幕')}<div class="sheet-body"><p class="sheet-intro">用 Safari 打开浮光的固定 HTTPS 地址，分享 → 添加到主屏幕。之后从这个入口使用。</p><ol class="install-steps"><li>先从旧入口导出备份；新地址不会自动继承旧记录。</li><li>从主屏幕打开浮光，需要时在“我的”本地导入备份。</li><li>首次使用时，可试试保存与离线重开。</li></ol><p class="field-help">记录属于当前设备和浏览器入口，添加主屏幕不是云同步。更换地址或入口前先备份；备份文件未加密。</p></div>`);}
function preference(key,value){document.body.classList.toggle(key,value);if(key==='reduce-motion')modal.cancelMotion();try{localStorage.setItem(`fuguang-${key}`,String(value));}catch{toast('显示设置仅在本次打开时有效');}}

function captureNarrative(focus=false,retain=false,day=localDay()){
 if(!retain){narrativeRaw='';narrativeDay=day;}
 narrativeDraft=null;editing=null;
 showEditor(`${sheetTop('今天只想随手说一句')}<div class="sheet-body"><p class="sheet-intro">像对自己说话那样，写下来。也可以点 iPhone 键盘上的麦克风听写。</p>${narrativeDay!==localDay()?`<p class="backfill-note">补记 ${narrativeDay} · 草稿中请确认发生时间</p>`:''}<label class="field"><span class="field-label">此刻，想说些什么？<small>最多 6000 字</small></span><textarea class="narrative-input" id="narrative-text" maxlength="6000" rows="7" placeholder="例如：今天有点焦虑，也有些低落。比昨天焦虑少了一些。想把这个片刻记下来。">${e(narrativeRaw)}</textarea></label><p class="field-help">使用系统键盘听写，转写由系统处理。</p><div class="organize-options ai-only"><button class="primary" data-action="ai-organize">${icon('edit')}AI 整理</button>${!aiStatus().enabled?'<button class="secondary" data-action="configure-from-narrative">设置 AI 接口</button>':''}</div><p class="field-help">整理成草稿后，由你看一眼再保存。</p><p class="form-error" id="narrative-error" role="alert"></p><button class="text-button hidden" id="cancel-ai" data-action="cancel-ai">取消本次请求</button></div>`);if(focus)$('#narrative-text').focus();
}

function reviewNarrative(previous=null){
 const d=narrativeDraft;if(!d)return;ratingState={};
 const time=previous?localInput(new Date(previous.occurredAt)):narrativeDay===localDay()?localInput():'';
 const anchor=time?new Date(time):new Date(`${narrativeDay}T23:59`);
 showEditor(`${sheetTop('先看一眼，再留下')}<form id="record-form" class="sheet-body" data-type="narrative"><p class="sheet-intro">核对文字、感受与话题，调整到贴近你的意思。</p><label class="field"><span class="field-label">你的叙述 <small>可以修改</small></span><textarea name="originalText" rows="4" required maxlength="6000">${e(d.originalText)}</textarea></label><div id="comparison-panels">${comparisonPanel(d,anchor)}</div>${ratingControl('anxiety',d.anxiety??null,d.ratingProvenance?.anxiety)}${ratingControl('lowMood',d.lowMood??null,d.ratingProvenance?.lowMood)}<fieldset class="rating-fieldset"><legend class="field-label">想保留的话题 <small>可取消或补充</small></legend><div class="topic-choices">${TOPICS.map(t=>`<label><input type="checkbox" name="topics" value="${t}" ${d.topics.includes(t)?'checked':''}><span>${t}</span></label>`).join('')}</div></fieldset>${inputField('time','这条叙述的发生 / 记录时间',time,'datetime-local','required','默认此刻；补记时可修改。')}${inputField('timeNote','原话里的时间线索 <small>可修改</small>',d.timeNote,'text','maxlength="500"')}${d.fragments.length?`<details class="optional-fields"><summary><span>整理出的原话片段<small>${d.fragments.length} 段</small></span></summary>${d.fragments.map(f=>`<div class="detail-section"><h3>${e(f.topic)}</h3><p class="detail-value">${e(f.quote)}</p></div>`).join('')}<p class="field-help">保存后，可将生活片段补充为饮食或活动记录。</p></details>`:''}<p class="form-error" id="form-error" role="alert"></p><div class="sheet-footer">${previous?'<button type="button" class="secondary" data-action="close-editor">取消</button>':'<button type="button" class="secondary" data-action="back-narrative">返回修改</button>'}<button class="primary" type="submit">${icon('check')}${previous?'保存修改':'确认保存'}</button></div></form>`);editing=previous;dirty=true;
}
async function organizeAI(){
 narrativeRaw=$('#narrative-text').value;
 const error=$('#narrative-error');error.textContent='';
 if(!narrativeRaw.trim()){error.textContent='先说一点，或写下一句话。';return;}if(narrativeRaw.length>6000){error.textContent='这段叙述最多 6000 字。';return;}if(aiRunning||aiApprovalPending)return;
 const status=aiStatus();
 if(!status.enabled){error.textContent='AI 还未配置，请先设置接口。原文仍保留。';return;}
 aiApprovalPending=true;let accepted;try{accepted=await ask('将这段文字发送给 AI？',`目标：${status.endpoint}\n模型：${status.model}\n只发送下列文本，不附带任何历史。服务商可能按自己的政策保留内容；跨域支持取决于该服务。\n\n${narrativeRaw}`,'同意发送这段文字','不发送');}finally{aiApprovalPending=false;}if(!accepted)return;
 const approval={...status,text:narrativeRaw};aiRunning=true;
 $('#cancel-ai').classList.remove('hidden');
 editor.querySelectorAll('.organize-options button').forEach(b=>b.disabled=true);
 error.textContent='正在等待你选择的服务…原文仍在这里。';
 try{const draft=await structureWithAI(narrativeRaw,approval);if(!editor.open||!aiRunning)return;records=await allRecords();narrativeDraft=draft;reviewNarrative();}
 catch(err){if($('#narrative-error'))$('#narrative-error').textContent=err.message;}
 finally{aiRunning=false;if($('#cancel-ai'))$('#cancel-ai').classList.add('hidden');editor.querySelectorAll('.organize-options button').forEach(b=>b.disabled=false);}
}
function showAIConfig(){
 const status=aiStatus();
 showEditor(`${sheetTop('我的 AI 接口')}<div class="sheet-body"><p class="sheet-intro">选择自己的服务与模型，开启后每次发送前都可审核。</p><div class="privacy-box"><h3>${status.enabled?'本次会话已开启':'尚未连接任何服务'}</h3><p>密钥仅用于本次页面，刷新或关闭后清除，不进入备份。请使用你信任的服务。</p></div>${inputField('endpoint','完整接口地址',status.endpoint,'url','id="ai-endpoint" autocomplete="off" spellcheck="false" placeholder="https://your-provider.example/v1/chat/completions"')}${inputField('model','模型名称',status.model,'text','id="ai-model" maxlength="160" autocomplete="off" placeholder="填写该服务支持的模型 ID"')}${inputField('key','本次会话密钥','','password','id="ai-key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="启用或修改时重新填写"')}<p class="field-help">配置本身不发送内容。每次整理前，会显示服务地址、模型与待发送全文。</p><details class="review-detail"><summary>接口兼容说明</summary><p>使用可从浏览器访问的 Chat Completions 兼容接口；服务需允许 CORS。连接失败时可以重试，或使用手动记录。</p></details><p class="form-error" id="ai-config-error" role="alert"></p><div class="sheet-footer"><button class="secondary" data-action="disable-ai">关闭并清除</button><button class="primary" data-action="save-ai">仅本次会话启用</button></div></div>`);
}
function saveAIConfig(){try{configureAI({enabled:true,endpoint:$('#ai-endpoint').value,model:$('#ai-model').value,key:$('#ai-key').value});dirty=false;closeEditor();render();if(aiReturnToCapture){aiReturnToCapture=false;captureNarrative(true,true,narrativeDay);}toast('本次会话已开启 · 尚未发送');}catch(err){$('#ai-config-error').textContent=err.message;}}

function screeningInterpretation(spec,result){
 const ranges=spec.items.length===2?['0–2','3–6']:spec.id==='phq9'?['0–4','5–9','10–14','15–19','20–27']:['0–4','5–9','10–14','15–21'];
 return `<div class="screening-summary"><h3>${result.total===null?'尚未完成，没有总分':`${spec.label}：${result.total} / ${spec.items.length*3}`}</h3><p class="field-help">${result.total===null?'未填写不是 0；可以保存题目级答案后继续。':`按手册分段，当前分数在 ${ranges[result.band]} 区间。${result.needsFurtherAssessment?'已达到短筛查进一步评估的界值（3 分）；可考虑完整量表与专业评估。':'筛查分数不能诊断，也不能单凭较低分数排除问题。'}`}</p>${result.item9Help?`<p class="support-note">${supportMessage()}</p>`:''}</div>`;
}
function supportMessage(){return '这一项值得认真照顾。请尽快与专业人员或可信任的人讨论你现在的感受。如果此刻有立即伤害自己的危险，请联系当地急救或紧急服务，或请可信任的人陪伴。此页不会自动联系他人。';}
async function showHelp(){await ask('需要支持时','无论记录或量表分数是多少，当情绪困扰持续、影响生活，或你希望有人一起理解时，都可以联系专业人员或可信任的人。\n\n如果此刻有立即伤害自己的危险，请联系当地急救或紧急服务，并请可信任的人陪伴。浮光不提供诊断，不会自动联系任何人。','知道了','返回');}
function screenerPicker(){
 const row=spec=>`<button class="setting-row" data-scale="${spec.id}">${icon('book')}<span><b>${spec.label} · ${['phq9','gad7'].includes(spec.id)?'快速筛查':'较短工具'}</b><small>${spec.items.length} 题 · 回顾过去 ${spec.recallDays??14} 天 · 可退出或保留未完成</small></span><span>›</span></button>`;
 showEditor(`${sheetTop('快速筛查')}<div class="sheet-body"><p class="sheet-intro">分别看看过去两周的抑郁和焦虑症状。</p>${['phq9','gad7'].map(id=>row(SCREENERS.find(s=>s.id===id))).join('')}<details class="review-detail"><summary>较短工具与已有记录</summary><p class="field-help">PHQ-2 / GAD-2 与已有记录</p>${SCREENERS.filter(s=>['phq2','gad2'].includes(s.id)).map(row).join('')}</details><details class="review-detail"><summary>中文版本与来源</summary><p class="field-help">采用 INfORM 收录的简体中文版本。${e(SCALE_SOURCE.credit)} ${e(SCALE_SOURCE.permission)}</p><p class="field-help"><a href="${SCALE_SOURCE.url}" target="_blank" rel="noopener noreferrer">中文原始文档</a> · <a href="${SCALE_SOURCE.manualUrl}" target="_blank" rel="noopener noreferrer">开发者计分手册</a></p></details><p class="field-help">筛查不是诊断；分数较低也不能排除困扰。</p><button class="text-button" data-action="help">需要支持时</button></div>`);
}
function screeningForm(id,previous=null){
 const spec=SCREENERS.find(s=>s.id===id);if(!spec)return;
 const day=previous?.localDate??localDay();
 showEditor(`${sheetTop(spec.label+' · '+(['phq9','gad7'].includes(spec.id)?'快速筛查':'较短工具'))}<form id="record-form" class="sheet-body" data-type="screening"><input type="hidden" name="scaleId" value="${id}"><p class="eyebrow">${spec.id.startsWith('phq')?'抑郁症状':'焦虑症状'} · ${spec.items.length} 题 · 过去两周</p><p class="sheet-intro">${SCALE_INSTRUCTION}</p>${inputField('assessmentDay','评估日期',day,'date',`required max="${localDay()}"`,'改变日期会清空本页选项。')}<p class="assessment-window" id="assessment-window">回顾日期：${shiftDay(day,-13)}–${day}（14 天）</p>${spec.items.map((question,i)=>`<fieldset class="scale-question"><legend>${i+1}. ${question}</legend><div class="scale-options">${SCALE_OPTIONS.map((option,j)=>`<label><input type="radio" name="answer-${i}" value="${j}" ${previous?.answers[i]===j?'checked':''}><span><b>${j}</b>${option}</span></label>`).join('')}</div></fieldset>`).join('')}<fieldset class="scale-question"><legend>${FUNCTIONAL_QUESTION}</legend><p class="field-help">选填，不计入总分。</p><div class="scale-options">${FUNCTIONAL_OPTIONS.map((option,j)=>`<label><input type="radio" name="functionalImpairment" value="${j}" ${previous?.functionalImpairment===j?'checked':''}><span>${option}</span></label>`).join('')}</div></fieldset><div id="screening-result" role="status"></div><p class="field-help">筛查结果用于了解近期症状，不作诊断。</p><button type="button" class="text-button" data-action="help">需要支持时</button><p class="form-error" id="form-error" role="alert"></p><div class="sheet-footer"><button class="secondary" type="button" data-action="close-editor">退出</button><button class="primary" type="submit">保存这次评估</button></div></form>`);editing=previous;updateScreeningResult();
}
function updateScreeningResult(){const form=$('#record-form');if(form?.dataset.type!=='screening')return;const spec=SCREENERS.find(s=>s.id===form.elements.scaleId.value);const answers=spec.items.map((_,i)=>{const el=form.querySelector(`[name=answer-${i}]:checked`);return el?Number(el.value):null;});$('#screening-result').innerHTML=screeningInterpretation(spec,scoreScreener(spec.id,answers));const day=form.elements.assessmentDay.value;if(day)$('#assessment-window').textContent=`回顾日期：${shiftDay(day,-13)}–${day}（14 天）`;}
function backfillPicker(){showEditor(`${sheetTop('补记某一天')}<div class="sheet-body"><p class="sheet-intro">选一天，把想留下的片刻补上。</p>${inputField('backfillDay','选择日期',shiftDay(localDay(),-1),'date',`id="backfill-day" required max="${localDay()}"`)}${[['daily','每日小记','这一天的整体感受与随笔'],['moment','一个片刻','明确填写实际发生时间'],['narrative','补说一句话','先整理草稿，再审核'],['sleep','睡眠','按醒来日期记录'],['activity','活动','类别、类型与实际时长'],['medication','用药','实际药名、剂量与时间'],['symptom','身体感受','原话、部位与时间']].map(([type,label,help])=>`<button class="setting-row" data-backfill-type="${type}"><span><b>${label}</b><small>${help}</small></span><span>›</span></button>`).join('')}<button class="setting-row" data-backfill-diet><span><b>饮食</b><small>食物、咖啡与茶在同一分区</small></span><span>›</span></button><button class="setting-row" data-backfill-no><span><b>当天无焦虑</b><small>只描述焦虑情况，不推断低落感</small></span><span>›</span></button></div>`);}
async function noAnxiety(day=localDay()){
 const today=day===localDay();if(day>localDay()){toast('不能记录未来日期');return;}
 if(!await ask(today?'截至现在，没有焦虑感？':`${day} 当天无焦虑？`,today?'这只表示截至记录时的自述，不预测今天剩余时间。之后有感受可以另记，汇总会更新。低落感仍是未记录。':'这是对那一天的回顾，会标为补记，保留实际创建时间。低落感不会自动记为没有。','确认记下','取消'))return;
 const date=today?new Date():new Date(day+'T12:00');
 const r=makeRecord('occurrence',{time:localInput(date),anxietyOccurrence:'no',lowMoodOccurrence:'unknown',occurrenceScope:today?'so-far':'whole-day',note:'',entryProvenance:{mode:today?'contemporaneous':'retrospective',timeMeaning:today?'event':'day-anchor',source:'quick-checkin'}});
 await saveRecord(r);records=await allRecords();if(editor.open)closeEditor();render();toast(today?'已记下截至现在的情况':'已保留这一天的回顾');
}
function useBaseline(metric){
 const select=editor.querySelector(`[data-baseline-select="${metric}"]`),record=records.find(r=>r.id===select?.value),request=narrativeDraft?.comparisonRequests?.find(r=>r.metric===metric);
 if(!record||!request){toast('请先选择并核对一条参照记录');return;}
 const suggestion=comparedSuggestion(request,record);ratingState[metric].provenance=suggestion.provenance;updateRating(metric,suggestion.value,true);
 editor.querySelector(`[data-baseline-detail="${metric}"]`).textContent=`已采用：${record.localDate} ${timeLabel(record)} · ${record[metric]}/10；原话：${(record.originalText||record.event||record.note||'只有数字').slice(0,160)}。建议 ${suggestion.value}/10，仍需你确认保存。`;
}

function sleepDetailHTML(r,part){let body=part('醒来日期',r.wakeDate??r.localDate)+part('夜间睡眠（不含午睡）',r.sleepHours===null?'未知':r.sleepHours+' 小时');const d=r.sleepDetails??{},sources={unknown:'未注明',self:'自己感受 / 推测',other:'他人告诉我',device:'设备提示'};for(const [key,label]of [['nightmares','噩梦'],['grinding','磨牙'],['snoring','打鼾']])body+=part(label,({unknown:'未记录',yes:'有',no:'明确没有'}[d[key]??'unknown'])+' · '+(sources[d[key+'Source']??'unknown']));body+=part('主观睡眠感受',{unknown:'未记录',restful:'休息不错',poor:'睡得不好',shallow:'自己感觉浅','poor-and-shallow':'不好且浅'}[d.subjective??'unknown'])+part('设备来源（手动抄录）',d.deviceSource)+part('设备估计深睡',d.deepMinutes===null||d.deepMinutes===undefined?'未知':d.deepMinutes+' 分钟')+part('设备估计其他阶段',d.otherStageMinutes===null||d.otherStageMinutes===undefined?'未知':d.otherStageMinutes+' 分钟');for(const nap of d.naps??[])body+=part(nap.kind==='catch-up'?'补觉':'午睡',new Date(nap.startAt).toLocaleString('zh-CN')+' · '+nap.durationMinutes+' 分钟');return body+part('睡眠随记',r.note)+part('说明','主观浅睡与设备分期各自保留，不相互换算，也没有自动连接 Apple 健康。');}
function entryHelpers(){return {inputField,textField,optional,selectField,ratingControl,sleepFields,hasSleepDetails};}
function readSleepData(form){const d={};for(const k of ['subjective','nightmares','nightmaresSource','grinding','grindingSource','snoring','snoringSource','deviceSource'])d[k]=form.elements['sleep-'+k]?.value??(k==='deviceSource'?'':'unknown');d.deepMinutes=numberValue(form,'sleep-deepMinutes');d.otherStageMinutes=numberValue(form,'sleep-otherStageMinutes');d.naps=[...form.querySelectorAll('[data-nap]')].map(row=>{const start=row.querySelector('[name=napStart]').value,minutes=row.querySelector('[name=napMinutes]').value;if(!start&&!minutes)return null;if(!start||!minutes)throw new Error('请补齐午睡/补觉的开始时刻和时长，或移除这一段。');return {startAt:new Date(start).toISOString(),durationMinutes:Number(minutes),kind:row.querySelector('[name=napKind]').value};}).filter(Boolean);return d;}
function syncCategoryUI(){const requireChoice=(select,value)=>{select.dataset.choiceRequired=String(value);select.required=value&&!select.dataset.entryChoice;select.closest('.choice-field')?.setAttribute('aria-required',String(value));};const form=$('#record-form');if(!form)return;const custom=form.elements.customCategoryLabel;if(custom){custom.closest('.field').classList.toggle('hidden',form.elements.categoryId?.value!=='__new__');requireChoice(form.elements.categoryId,!(editing?.id&&!editing.categoryId&&!form.elements.groupId?.value));}if(form.elements.groupId)requireChoice(form.elements.groupId,!(editing?.id&&!editing.categoryId&&!form.elements.groupId.value));const unit=form.elements.quantityUnitLabel;if(unit)unit.closest('.field').classList.toggle('hidden',form.elements.quantityUnit?.value!=='other');}
function recentPresetHtml(type){if(!['diet','caffeine','activity','medication'].includes(type))return '';const list=shortcutGroups(records,type,shortcutPrefs,{limit:presetExpanded?12:4});if(!list.items.length)return `<div id="preset-suggestions" data-preset-kind="${type}"></div>`;return `<section class="preset-section" id="preset-suggestions" data-preset-kind="${type}" aria-label="以前填过的组合"><div class="section-title"><h3>以前填过</h3>${list.total>4?`<button type="button" class="text-button" data-more-presets="${type}">${presetExpanded?'收起':'更多'}</button>`:''}</div><div class="preset-chips">${list.items.map(item=>`<span class="preset-chip"><button type="button" data-preset="${e(item.key)}" data-preset-type="${type}">${e(item.label)}${item.count>1?`<small>记录过 ${item.count} 次</small>`:''}</button><button type="button" class="preset-hide" data-hide-preset="${e(item.key)}" data-preset-type="${type}" aria-label="隐藏 ${e(item.label)} 的快捷草稿">×</button></span>`).join('')}</div><p class="field-help">点一下填入草稿，核对后再保存。</p></section>`;}
function refreshPresets(type){const old=$('#preset-suggestions');if(old)old.outerHTML=recentPresetHtml(type);}
async function applyRecentPreset(key,type){const item=shortcutGroups(records,type,shortcutPrefs,{limit:12}).items.find(x=>x.key===key);if(!item){toast('这项草稿已变化，请重新打开表单');return;}if(dirty&&!await ask('填入以前的组合？','当前未保存的表单内容会被替换。历史记录不会改变，本次仍需确认保存。','填入草稿','保留当前内容'))return;const link=draftLink?{...draftLink}:null;const draft=draftFromShortcut(item,new Date());if(link){draft.sourceNarrativeId=link.sourceNarrativeId;draft.sourceFragmentKey=link.sourceFragmentKey;draft.note=link.quote;}closeEditor();formFor(type,null,localDay(),draft);dirty=true;toast('已填入可编辑草稿 · 时间属于这一次');}
async function clearPresetHistory(){if(!await ask('清理快捷草稿历史？','这只隐藏之前填过的组合，不删除原记录。以后新填写的组合仍可出现，也可重新从现有记录生成。','清理快捷历史','取消'))return;shortcutPrefs=clearShortcutHistory(shortcutPrefs,new Date());saveShortcutPrefs(shortcutPrefs);render();toast('快捷历史已清理，原记录保留');}
function dietSection(day=localDay()){showEditor(`${sheetTop('饮食')}<div class="sheet-body"><p class="sheet-intro">这一笔，想记下什么？</p><button class="setting-row" data-add="diet" data-entry-day="${day}">${icon('bowl')}<span><b>食物与其他饮品</b><small>固定分类、自定义分类与实际份量</small></span><span>›</span></button><button class="setting-row" data-add="caffeine" data-entry-day="${day}">${icon('cup')}<span><b>咖啡、茶与含咖啡因饮品</b><small>品类、杯数、体积与有出处的咖啡因记录</small></span><span>›</span></button><button class="text-button" data-no-exposure="caffeine" data-entry-day="${day}">${day===localDay()?'今天截至此刻':'当天'}没有摄入咖啡因</button><p class="field-help">杯数、品类与时间都可以留在这里。</p></div>`);}
async function noExposure(domain,day=localDay()){if(!['caffeine','medication','activity'].includes(domain)||day>localDay())return;records=await allRecords();const name={caffeine:'咖啡因摄入',medication:'用药',activity:'活动'}[domain],eventType={caffeine:'caffeine',medication:'medication',activity:'activity'}[domain];if(records.some(r=>r.localDate===day&&r.type===eventType)){await ask('这一天已有相关记录',`已有${name}事件。请先到拾记核对；这里不会把已有事件改成“没有”。`,'知道了','返回');return;}const today=day===localDay();if(!await ask(`确认${today?'截至此刻':'当天'}没有${name}？`,'只记录你明确确认的情况；未知不按没有，之后出现事件仍可另外记录。','确认记下','取消'))return;const record=makeRecord('checkin',{time:today?localInput():day+'T12:00',domain,status:'none',scope:today?'so-far':'whole-day',note:''});await saveRecord(record);records=await allRecords();closeEditor();render();toast('已保留这次明确确认');}
function deleteAllPanel(){showEditor(`${sheetTop('删除当前入口的全部资料')}<div class="sheet-body"><p class="sheet-intro">会删除此入口在当前浏览器里的全部记录，清除快捷历史、天气位置/缓存和本次 AI 密钥。不会删除已导出的备份文件，也不会影响另一个网址的记录。</p><p class="field-help">删除后无法在应用中撤销。请先导出并确认备份已保存。</p>${inputField('deletePhrase','输入“清空”确认','','text','id="delete-phrase" autocomplete="off"')}<p class="form-error" id="delete-all-error" role="alert"></p><button class="delete-button" data-action="confirm-delete-all">删除本机全部资料</button></div>`);}
async function deleteAllData(){if($('#delete-phrase')?.value!=='清空'){$('#delete-all-error').textContent='请输入“清空”后再继续。';return;}if(!await ask('最后确认删除？',`将删除当前入口的 ${records.length} 条记录及快捷历史、天气设置。备份文件保留。`,'确认删除全部','保留资料'))return;await clearRecords();configureAI({enabled:false});weather.clear();forgetShortcutPrefs();for(const k of ['fuguang-reduce-motion','fuguang-solid-material'])try{localStorage.removeItem(k);}catch{}shortcutPrefs=loadShortcutPrefs();routeParent=null;presetExpanded=false;records=[];closeEditor();tab='now';render();toast('当前入口的资料已删除');}
function routeCandidates(record){const map=new Map();for(const f of record.fragments??[]){const domain=['饮食','咖啡与茶'].includes(f.topic)?'diet':['运动','情感与关系','社交与独处'].includes(f.topic)?'activity':null;if(!domain)continue;const key=domain+'|'+f.quote;if(!map.has(key))map.set(key,{domain,key,quote:f.quote,topics:[]});map.get(key).topics.push(f.topic);}return [...map.values()];}
function showNarrativeRoutes(record){const plans=routeCandidates(record);if(!plans.length)return;routeParent=record;showEditor(`${sheetTop('把生活片段放回合适的位置')}<div class="sheet-body"><p class="sheet-intro">叙述已保存。想多留一点细节，可以接着记录。</p>${plans.map((plan,i)=>{const existing=records.find(r=>r.sourceNarrativeId===record.id&&r.sourceFragmentKey===plan.key);return `<div class="narrative-route"><p class="detail-value">${e(plan.quote)}</p>${existing?`<button class="text-button" data-record="${existing.id}">已另记为${plan.domain==='diet'?'饮食':'活动'} · 查看已有记录</button>`:`<button class="secondary" data-narrative-route="${i}">作为${plan.domain==='diet'?'饮食':'活动'}草稿核对 →</button>`}</div>`;}).join('')}<p class="field-help">也可以稍后从饮食或活动入口补充。</p><button class="primary" data-action="close-editor">这次先这样</button></div>`);}
async function routeNarrativeFragment(index){const parent=routeParent,plan=routeCandidates(parent??{})[index];if(!parent||!plan)return;records=await allRecords();const existing=records.find(r=>r.sourceNarrativeId===parent.id&&r.sourceFragmentKey===plan.key);if(existing){detail(existing.id);return;}const type=plan.domain==='activity'?'activity':/咖啡|茶|可乐|能量饮料/.test(plan.quote)?'caffeine':'diet';const draft={time:localInput(new Date(parent.occurredAt)),day:parent.localDate,note:plan.quote.slice(0,type==='activity'?3000:1000),sourceNarrativeId:parent.id,sourceFragmentKey:plan.key};if(type==='activity'){if(/散步/.test(plan.quote))Object.assign(draft,{groupId:'outdoor',categoryId:'outdoor.walk'});else if(/跑步|骑行|游泳|有氧/.test(plan.quote))Object.assign(draft,{groupId:'exercise',categoryId:'exercise.aerobic'});else if(/力量|举重|抗阻/.test(plan.quote))Object.assign(draft,{groupId:'exercise',categoryId:'exercise.strength'});else if(/游戏/.test(plan.quote))Object.assign(draft,{groupId:'game',categoryId:'game.other'});else if(plan.topics.includes('情感与关系'))draft.groupId='relationship';else if(plan.topics.includes('社交与独处'))draft.groupId='social';}if(type==='caffeine'){draft.drink=/茶/.test(plan.quote)?'tea':'coffee';draft.name='';}closeEditor();formFor(type,null,parent.localDate,draft);dirty=true;}

document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
document.addEventListener('click',async ev=>{
 const b=ev.target.closest('button');if(!b)return;
 try {
 if(b.dataset.clearRating){updateRating(b.dataset.clearRating,null);return;}
 if(b.dataset.useBaseline){useBaseline(b.dataset.useBaseline);return;}
 if(b.dataset.scale){screeningForm(b.dataset.scale);return;}
 if(b.dataset.reviewMetric){reviewMetric=b.dataset.reviewMetric;render();return;}
 if(b.dataset.removeNap!==undefined){b.closest('[data-nap]').remove();dirty=true;return;}
 if(b.dataset.backfillType){const day=$('#backfill-day').value;if(!day||day>localDay()){toast('请选择今天或以前的日期');return;}closeEditor();await add(b.dataset.backfillType,day);return;}
 if(b.dataset.backfillDiet!==undefined){const day=$('#backfill-day').value;if(!day||day>localDay()){toast('请选择今天或以前的日期');return;}closeEditor();dietSection(day);return;}
 if(b.dataset.backfillNo!==undefined){await noAnxiety($('#backfill-day').value);return;}
 if(b.dataset.preset){await applyRecentPreset(b.dataset.preset,b.dataset.presetType);return;}
 if(b.dataset.hidePreset){shortcutPrefs=hideShortcut(shortcutPrefs,b.dataset.hidePreset);saveShortcutPrefs(shortcutPrefs);refreshPresets(b.dataset.presetType);toast('已隐藏这个快捷草稿，原记录保留');return;}
 if(b.dataset.morePresets){presetExpanded=!presetExpanded;refreshPresets(b.dataset.morePresets);return;}
 if(b.dataset.narrativeRoute){await routeNarrativeFragment(Number(b.dataset.narrativeRoute));return;}
 if(b.dataset.noExposure){await noExposure(b.dataset.noExposure,b.dataset.entryDay??localDay());return;}
 if(b.dataset.tab){go(b.dataset.tab);return;}
 if(b.dataset.go){go(b.dataset.go);return;}
 if(b.dataset.add){if(editor.open)closeEditor();await add(b.dataset.add,b.dataset.entryDay??localDay());return;}
 if(b.dataset.record){records=await allRecords();detail(b.dataset.record);return;}
 if(b.dataset.edit){const r=records.find(r=>r.id===b.dataset.edit);formFor(r.type,r);return;}
 if(b.dataset.delete){await remove(b.dataset.delete);return;}
 if(b.dataset.filter){filter=b.dataset.filter;render();return;}
 if(b.dataset.period){period=Number(b.dataset.period);render();return;}
 if(b.dataset.rating!==undefined){selectedAnxiety=Number(b.dataset.rating);dirty=true;$('#anxiety-value').textContent=selectedAnxiety;editor.querySelectorAll('[data-rating]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.rating)===selectedAnxiety)));return;}
 if(b.dataset.mood!==undefined){const v=Number(b.dataset.mood);selectedMood=selectedMood===v?null:v;dirty=true;editor.querySelectorAll('[data-mood]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.mood)===selectedMood)));return;}
 switch(b.dataset.action){case'diet-section':dietSection(b.dataset.entryDay??localDay());break;case'clear-shortcuts':await clearPresetHistory();break;case'restore-shortcuts':shortcutPrefs=restoreShortcutPrefs();saveShortcutPrefs(shortcutPrefs);render();toast('已从现有记录重新生成草稿');break;case'delete-all':deleteAllPanel();break;case'confirm-delete-all':await deleteAllData();break;case'screeners':screenerPicker();break;case'help':await showHelp();break;case'no-anxiety':await noAnxiety();break;case'backfill':backfillPicker();break;case'add-nap':if(editor.querySelectorAll('[data-nap]').length<10){$('#nap-rows').insertAdjacentHTML('beforeend',napRow());recordControls.refresh();dirty=true;}break;case'close-editor':await requestClose();break;case'ai-entry':narrativeRaw='';narrativeDay=localDay();aiReturnToCapture=!aiStatus().enabled;if(aiReturnToCapture)showAIConfig();else captureNarrative(true);break;case'configure-from-narrative':narrativeRaw=$('#narrative-text').value;aiReturnToCapture=true;showAIConfig();break;case'ai-organize':await organizeAI();break;case'cancel-ai':cancelAI();break;case'back-narrative':captureNarrative(false,true);break;case'ai-config':aiReturnToCapture=false;showAIConfig();break;case'save-ai':saveAIConfig();break;case'disable-ai':configureAI({enabled:false});showAIConfig();toast('AI 已关闭，密钥已从本次会话清除');break;case'choose':choose();break;case'privacy':privacy();break;case'export':await exportBackup();break;case'import':$('#import-file').click();break;case'install':install();break;}
 }catch(err){toast(err.message||'操作没有完成，请重试');}
});
document.addEventListener('submit',ev=>{if(ev.target.id==='record-form'){ev.preventDefault();submit(ev.target);}});
editor.addEventListener('click',event=>{if(event.target===editor){const r=editor.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)requestClose();}});
editor.addEventListener('cancel',ev=>{ev.preventDefault();requestClose();});
editor.addEventListener('input',()=>dirty=true);editor.addEventListener('change',()=>dirty=true);
document.addEventListener('input',ev=>{if(ev.target.id==='history-search'){const pos=ev.target.selectionStart;search=ev.target.value;render();$('#history-search').focus();try{$('#history-search').setSelectionRange(pos,pos);}catch{}}});
document.addEventListener('change',ev=>{if(ev.target.id==='import-file'){const f=ev.target.files[0];ev.target.value='';importBackup(f);}if(['reduce-motion','solid-material'].includes(ev.target.id))preference(ev.target.id,ev.target.checked);});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&ready&&!editor.open){try{records=await allRecords();render();}catch(err){toast(err.message);}}});
document.querySelector('.brand').addEventListener('click',ev=>{ev.preventDefault();go('now');});
for(const key of ['reduce-motion','solid-material'])try{document.body.classList.toggle(key,localStorage.getItem(`fuguang-${key}`)==='true');}catch{}
try{await openStorage();records=await allRecords();ready=true;render();weather.init();}catch(err){main.innerHTML=`<section class="content-narrow">${heading('Storage unavailable','暂时无法保存','')}${empty('先保留这片空白',e(err.message),false)}<p class="field-help">请在普通浏览模式重新打开。现在不会接收新的记录，避免让内容看起来已保存。</p></section>`;document.querySelectorAll('.tabbar button').forEach(b=>b.disabled=true);}
if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(()=>{});}

document.addEventListener('input',ev=>{if(ev.target.dataset.emotionSlider)updateRating(ev.target.dataset.emotionSlider,Number(ev.target.value));if(ev.target.closest('#record-form')?.dataset.type==='caffeine')updateBeveragePreview();});
document.addEventListener('pointerup',ev=>{if(ev.target.dataset.emotionSlider)updateRating(ev.target.dataset.emotionSlider,Number(ev.target.value));});
document.addEventListener('keydown',ev=>{const kind=ev.target.dataset.emotionSlider;if(!kind)return;if(['Enter',' ','Home','End'].includes(ev.key)){ev.preventDefault();updateRating(kind,ev.key==='Home'?0:ev.key==='End'?10:Number(ev.target.value));}});
document.addEventListener('change',ev=>{
 const form=ev.target.closest('#record-form');
 if(form?.dataset.type==='caffeine')updateBeveragePreview();
 if(form?.dataset.type==='activity'&&ev.target.name==='groupId'){const select=form.elements.categoryId;select.innerHTML=activityCategoryOptions(ev.target.value,records).map(([v,l])=>`<option value="${e(v)}">${e(l)}</option>`).join('');}
 if(['activity','diet'].includes(form?.dataset.type))syncCategoryUI();
 if(form?.dataset.type==='screening'){if(ev.target.name==='assessmentDay')form.querySelectorAll('input[type=radio]').forEach(r=>r.checked=false);updateScreeningResult();}
 if(ev.target.dataset.baselineSelect){const record=records.find(r=>r.id===ev.target.value),metric=ev.target.dataset.baselineSelect;editor.querySelector(`[data-baseline-detail="${metric}"]`).textContent=record?`${record.localDate} ${timeLabel(record)} · ${record[metric]}/10；${(record.originalText||record.event||record.note||'只有数字').slice(0,160)}`:'';}
 if(form?.dataset.type==='narrative'&&ev.target.name==='time'&&narrativeDraft?.comparisonRequests?.length){const date=new Date(ev.target.value);if(!Number.isFinite(date.getTime()))return;$('#comparison-panels').innerHTML=comparisonPanel(narrativeDraft,date);for(const req of narrativeDraft.comparisonRequests){const st=ratingState[req.metric];if(st.provenance.baseline){st.provenance={origin:'unset',sourcePhrase:req.sourcePhrase,suggestedValue:null,confirmed:false,relativeChange:req.direction,baseline:null,delta:null};updateRating(req.metric,null,true);}}}
});

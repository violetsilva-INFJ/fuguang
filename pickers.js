import {escapeHTML as e,localDay} from './core.js';
import {createViewMotion} from './modal-controller.js';

// Calendar arithmetic uses civil date strings and UTC noon, never UTC parsing of
// a date-only input followed by local getters. Stored record dates stay intact.
export function validDay(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<'0001-01-01')return false;
 const d=new Date(day+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===day;
}
export function shiftCalendarDay(day,delta){if(!validDay(day))return null;const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);const out=d.toISOString().slice(0,10);return validDay(out)?out:null;}
export function shiftCalendarMonth(day,delta){
 if(!validDay(day))return null;const [year,month,date]=day.split('-').map(Number),index=year*12+month-1+delta,y=Math.floor(index/12),m=index%12+1;
 if(y<1||y>9999)return null;const prefix=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0');
 let n=date;while(n>0&&!validDay(prefix+'-'+String(n).padStart(2,'0')))n--;return prefix+'-'+String(n).padStart(2,'0');
}
export function calendarDays(month){
 const first=month.slice(0,7)+'-01';if(!validDay(first))return [];
 const weekday=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7,start=shiftCalendarDay(first,-weekday);
 return Array.from({length:42},(_,i)=>shiftCalendarDay(start,i));
}
export function recordedDates(records,scope){
 const days=new Set();if(!scope?.type)return days;
 for(const r of records){
  if(r.type!==scope.type)continue;
  if(scope.scaleId&&r.scaleId!==scope.scaleId)continue;
  if(scope.groupId&&r.groupId!==scope.groupId)continue;
  if(scope.categoryId&&r.categoryId!==scope.categoryId)continue;
  if(scope.category&&r.category!==scope.category)continue;
  if(scope.drink&&r.drink!==scope.drink)continue;
  if(scope.domain&&r.domain!==scope.domain)continue;
  // All calendars in a category mark its saved record days. Do not reconstruct
  // civil dates of old secondary timestamps: their timezone was not stored.
  const values=[r.type==='sleep'?(r.wakeDate??r.localDate):r.localDate];
  values.filter(validDay).forEach(day=>days.add(day));
 }
 return days;
}
export function scopeForDate(input){
 const form=input.closest('#record-form');if(!form)return null;
 const type=form.dataset.type,field=input.name,value=name=>form.elements[name]?.value??'',label={moment:'此刻',daily:'每日小记',sleep:'睡眠 · 醒来日期',medication:'用药',caffeine:'饮品',diet:'饮食',activity:'活动',symptom:'身体感受',narrative:'随手说一句',screening:'筛查',occurrence:'当天情况',checkin:'当天确认'}[type]??'本类';
 const scope={type,field,label};
 if(type==='screening'){scope.scaleId=value('scaleId');scope.label=scope.scaleId.toUpperCase().replace(/^(PHQ|GAD)(\d+)$/,'$1-$2');}
 const option=name=>form.elements[name]?.selectedOptions?.[0]?.textContent??'';
 if(type==='activity'){scope.groupId=value('groupId')||null;scope.categoryId=value('categoryId')||null;scope.label=label+(scope.categoryId?' · '+option('categoryId'):scope.groupId?' · '+option('groupId'):'');}
 if(type==='diet'){scope.categoryId=value('categoryId')&&!['__new__',''].includes(value('categoryId'))?value('categoryId'):null;if(scope.categoryId)scope.label=label+' · '+option('categoryId');}
 if(type==='medication'&&value('category')&&value('category')!=='unspecified'){scope.category=value('category');scope.label=label+' · '+option('category');}
 if(type==='caffeine'){scope.drink=value('drink')||null;scope.label='饮品 · '+({coffee:'咖啡',tea:'茶',energy:'能量饮料',other:'其他饮品'}[scope.drink]??'全部');}
 if(type==='checkin')scope.domain=value('domain')||null;
 if(field==='napStart')scope.label='睡眠记录 · 醒来日';
 if(['startAt','endAt','activityStartAt'].includes(field))scope.label+=' · 记录所属日';
 return scope;
}

export function createPickers({doc=document,readRecords=async()=>[]}={}){
 const dialog=doc.createElement('dialog');dialog.id='app-picker';dialog.className='picker-dialog';dialog.setAttribute('aria-labelledby','picker-title');doc.body.append(dialog);
 const dates=new WeakMap(),choices=new WeakMap();let serial=0,active=null,scheduled=false,disposed=false;
 const pointerMode=()=>dialog.classList.remove('keyboard-focus'),keyboardMode=()=>dialog.classList.add('keyboard-focus');
 doc.addEventListener('pointerdown',pointerMode,true);doc.addEventListener('keydown',keyboardMode,true);
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const emit=input=>{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
 const label=input=>input.closest('.field')?.querySelector('.field-label')?.textContent.trim()||input.getAttribute('aria-label')||'选择日期';
 function wrap(input){const holder=input.closest('label.field');if(!holder)return input.parentElement;const field=make('div',holder.className);holder.replaceWith(field);field.append(...holder.childNodes);return field;}
 function orderDates(){
  const form=doc.querySelector('#record-form');if(!form)return;
  let group=form.querySelector(':scope>.record-dates');
  const primary=['day','assessmentDay','time'].map(n=>form.elements[n]).find(n=>n&&n.tagName==='INPUT');
  const eventValue=form.dataset.type==='activity'&&form.elements.activityStartAt?.value?form.elements.activityStartAt.value:primary?.value,day=eventValue?.slice(0,10);
  if(validDay(day)){form.dataset.targetDay=day;form.querySelectorAll('[data-no-exposure]').forEach(b=>{b.dataset.entryDay=day;const text=(day===localDay()?'今天截至此刻':'当天')+'没有'+(b.dataset.noExposure==='activity'?'活动':'用药');if(b.textContent!==text)b.textContent=text;});}
  if(primary&&!group){group=make('div','record-dates');group.setAttribute('aria-label','记录日期与时间');form.prepend(group);group.append(primary.closest('.field'));}
  if(group){
   const extra=['activityStartAt','startAt','endAt'].map(n=>form.elements[n]).filter(n=>n&&n.tagName==='INPUT'&&!group.contains(n));
   if(extra.length){const details=make('details','optional-fields extra-dates'),summary=make('summary'),span=make('span','','更多时间'),small=make('small','','选填'),fields=make('div','two-fields');span.append(small);summary.append(span);details.append(summary,fields);extra.forEach(n=>fields.append(n.closest('.field')));group.append(details);}
  }
  form.querySelectorAll('[data-nap]').forEach(row=>{const input=row.querySelector('[name=napStart]');if(input&&!row.querySelector(':scope>.date-first')){const f=input.closest('.field');f.classList.add('date-first');row.prepend(f);}});
 }
 function dateField(input){
  if(dates.has(input))return;
  const mode=input.type;if(!['date','datetime-local','time'].includes(mode))return;
  const field=wrap(input),title=label(input),button=make('button','date-trigger'),value=make('span','date-trigger-value'),symbol=make('span','date-trigger-symbol','◌');
  button.type='button';button.dataset.dateFor=input.name||input.id;button.setAttribute('role','combobox');button.setAttribute('aria-readonly','true');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',dialog.id);symbol.setAttribute('aria-hidden','true');button.append(value,symbol);input.after(button);
  const original={required:input.required,min:input.min,max:input.max};input.dataset.pickerMode=mode;input.dataset.dateRequired=String(original.required);input.type='hidden';input.required=false;input.hidden=true;
  const item={input,button,value,mode,title,...original};dates.set(input,item);input.addEventListener('change',()=>syncDate(item));button.addEventListener('click',()=>openDate(item));syncDate(item);
 }
 function syncDate(item){const {input,button,value,mode,title}=item,raw=input.value;const text=!raw?'选择日期'+(mode==='datetime-local'?'与时间':''):mode==='time'?raw:raw.slice(0,10).replace(/-/g,' / ')+(mode==='datetime-local'?'  ·  '+raw.slice(11,16):'');if(value.textContent!==text)value.textContent=text;button.classList.toggle('is-empty',!raw);button.disabled=input.disabled;button.setAttribute('aria-label',title+'，'+(raw?text:'尚未填写'));button.setAttribute('aria-required',String(item.required));}
 function selectField(select){
  if(choices.has(select)||select.dataset.entryChoice||select.hidden)return;
  const field=wrap(select),title=label(select),button=make('button','select-trigger');button.type='button';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',dialog.id);button.dataset.selectFor=select.name||select.id;select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);
  const required=select.required;select.required=false;const sync=()=>{const text=select.selectedOptions[0]?.textContent??'请选择';if(button.textContent!==text)button.textContent=text;button.disabled=select.disabled;button.setAttribute('aria-label',title+'，'+text);button.setAttribute('aria-required',String(required));};choices.set(select,{button,sync});button.addEventListener('click',()=>openSelect(select,button,title));button.addEventListener('keydown',ev=>{if(['ArrowDown','ArrowUp'].includes(ev.key)){ev.preventDefault();openSelect(select,button,title);}});select.addEventListener('change',sync);sync();
 }
 function suggestions(input){
  const id=input.getAttribute('list'),list=id&&doc.getElementById(id);if(!list)return;
  const title=label(input);wrap(input);if(!input.hasAttribute('aria-label'))input.setAttribute('aria-label',title);input.removeAttribute('list');input.dataset.appSuggestions=id;const box=make('div','inline-suggestions');box.setAttribute('role','group');box.setAttribute('aria-label',title+'常用选项');
  for(const option of list.querySelectorAll('option')){const b=make('button','suggestion-tag',option.value);b.type='button';b.addEventListener('click',()=>{input.value=option.value;emit(input);input.focus({preventScroll:true});});box.append(b);}input.after(box);
 }
 function refresh(){
  scheduled=false;if(disposed)return;if(active&&(!active.source.isConnected||active.source.disabled))close();orderDates();
  doc.querySelectorAll('input[type=date],input[type=datetime-local],input[type=time]').forEach(dateField);
  doc.querySelectorAll('select').forEach(selectField);doc.querySelectorAll('input[list]').forEach(suggestions);
  doc.querySelectorAll('input[data-picker-mode]').forEach(input=>{const item=dates.get(input);if(item)syncDate(item);});
  doc.querySelectorAll('select[hidden]').forEach(select=>choices.get(select)?.sync());
 }
 const pickerMotion=createViewMotion(dialog);
 function show(state){
  if(active)close();active=state;state.host=state.source.closest('dialog')??doc.querySelector('#page-scroll');state.scroll=state.host?.scrollTop??0;state.button.setAttribute('aria-expanded','true');dialog.showModal();pickerMotion.play(dialog,{offset:6,duration:120});
 }
 function close(){
  if(!active)return;const s=active;active=null;pickerMotion.cancel();dialog.close();dialog.replaceChildren();s.button.setAttribute('aria-expanded','false');if(s.button.isConnected)s.button.focus({preventScroll:true});if(s.host?.isConnected)s.host.scrollTop=s.scroll;
 }
 function heading(title){return `<header class="picker-header"><h2 id="picker-title">${e(title)}</h2><button type="button" class="picker-close" data-picker="cancel" aria-label="关闭选择">×</button></header>`;}
 function bounds(state,day){return validDay(day)&&(!state.minDay||day>=state.minDay)&&(!state.maxDay||day<=state.maxDay);}
 function clamp(state,day){return state.minDay&&day<state.minDay?state.minDay:state.maxDay&&day>state.maxDay?state.maxDay:day;}
 async function openDate(item){
  if(dialog.open&&active?.source===item.input)return;
  const raw=item.input.value,defaultDay=item.input.closest('form')?.dataset.targetDay||localDay(),minDay=item.min?.slice(0,10),maxDay=item.max?.slice(0,10)||(item.input.closest('#record-form')&&['time','day','assessmentDay'].includes(item.input.name)?localDay():'');
  const state={kind:'date',...item,source:item.input,selected:validDay(raw.slice(0,10))?raw.slice(0,10):'',focusDate:validDay(raw.slice(0,10))?raw.slice(0,10):defaultDay,hour:raw.slice(11,13),minute:raw.slice(14,16),minDay:validDay(minDay)?minDay:'',maxDay:validDay(maxDay)?maxDay:'',marks:new Set(),scope:scopeForDate(item.input),panel:'days'};
  state.focusDate=clamp(state,state.focusDate);state.view=state.focusDate.slice(0,7);show(state);dialog.dataset.markerState='loading';drawCalendar(true);
  try{const records=state.scope?await readRecords():[];if(active===state&&state.source.isConnected){state.marks=recordedDates(records,state.scope);state.loaded=true;dialog.dataset.markerState='loaded';drawCalendar(false);}}catch{if(active===state){state.markerError=true;dialog.dataset.markerState='error';drawCalendar(false);}}
 }
 function gridFocus(state){dialog.querySelector(`[data-day="${state.focusDate}"]`)?.focus({preventScroll:true});}
 function drawCalendar(focus=false){
  const s=active;if(s?.kind!=='date')return;
  const old=doc.activeElement,oldDay=old?.dataset?.day,oldAction=old?.dataset?.picker,oldClock=old?.dataset?.clock,oldValue=old?.value;
  const days=calendarDays(s.view),today=localDay(),previous=shiftCalendarMonth(s.view+'-01',-1),next=shiftCalendarMonth(s.view+'-01',1);
  const cell=day=>{if(!day)return '<span role="gridcell" aria-disabled="true"></span>';const recorded=s.marks.has(day),selected=day===s.selected,now=day===today,disabled=!bounds(s,day),text=day.slice(0,4)+'年'+Number(day.slice(5,7))+'月'+Number(day.slice(8))+'日'+(now?'，今天':'')+(recorded?'，已有'+s.scope.label+'记录':'');return `<button type="button" role="gridcell" class="calendar-day ${day.slice(0,7)!==s.view?'other-month ':''}${recorded?'has-entry ':''}${now?'is-today ':''}${selected?'is-selected':''}" data-day="${day}" tabindex="${day===s.focusDate&&!disabled?'0':'-1'}" aria-label="${e(text)}" aria-selected="${selected}" ${now?'aria-current="date"':''} ${disabled?'disabled':''}><span>${Number(day.slice(8))}</span></button>`;};
  const year=Number(s.view.slice(0,4)),month=Number(s.view.slice(5));
  const body=s.panel==='months'?`<div class="calendar-year"><button type="button" data-picker="year-prev" aria-label="上一年">−</button><label>年份<input type="number" data-picker-year min="1" max="9999" value="${year}" inputmode="numeric"></label><button type="button" data-picker="year-next" aria-label="下一年">＋</button></div><div class="calendar-months">${Array.from({length:12},(_,i)=>{const m=String(i+1).padStart(2,'0'),key=String(year).padStart(4,'0')+'-'+m,disabled=s.minDay&&key<s.minDay.slice(0,7)||s.maxDay&&key>s.maxDay.slice(0,7);return `<button type="button" data-month="${key}" ${disabled?'disabled':''} aria-pressed="${month===i+1}">${i+1} 月</button>`;}).join('')}</div><button type="button" class="text-button" data-picker="back-days">返回日历</button>`:
   `<div class="calendar-weekdays" aria-hidden="true">${['一','二','三','四','五','六','日'].map(x=>`<span>${x}</span>`).join('')}</div><div class="calendar-grid" role="grid" aria-label="${year}年${month}月">${Array.from({length:6},(_,i)=>`<div role="row">${days.slice(i*7,i*7+7).map(cell).join('')}</div>`).join('')}</div>`;
  dialog.innerHTML=heading(s.title)+`<div class="picker-body"><div class="calendar-toolbar"><button type="button" data-picker="prev" aria-label="上个月" ${!previous||s.minDay&&previous.slice(0,7)<s.minDay.slice(0,7)?'disabled':''}>‹</button><button type="button" class="calendar-month-title" data-picker="months" aria-expanded="${s.panel==='months'}"><span aria-live="polite">${year} 年 ${month} 月</span><small>选择年月</small></button><button type="button" data-picker="next" aria-label="下个月" ${!next||s.maxDay&&next.slice(0,7)>s.maxDay.slice(0,7)?'disabled':''}>›</button></div>${body}${s.scope?`<p class="calendar-key"><i aria-hidden="true"></i>${e(s.scope.label)}${s.scope.groupId||s.scope.categoryId?' · 当前分类':''}记过的日期${s.markerError?' · 暂时未能读取标记':''}</p>`:''}${s.mode==='datetime-local'?`<div class="calendar-clock"><span>时间</span><label>小时<input type="text" data-clock="hour" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" value="${e(s.hour)}" placeholder="时" aria-label="小时，0到23"></label><b>:</b><label>分钟<input type="text" data-clock="minute" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" value="${e(s.minute)}" placeholder="分" aria-label="分钟，0到59"></label></div>`:''}<p class="picker-error" role="alert" id="picker-error"></p><div class="calendar-shortcuts"><button type="button" class="text-button" data-picker="today" ${!bounds(s,today)?'disabled':''}>${s.mode==='datetime-local'?'此刻':'今天'}</button>${!s.required?'<button type="button" class="text-button" data-picker="clear">留空</button>':''}</div><div class="picker-footer"><button type="button" class="secondary" data-picker="cancel">取消</button><button type="button" class="primary" data-picker="apply">确认选择</button></div></div>`;
  if(focus){gridFocus(s);return;}
  if(oldClock){const input=dialog.querySelector(`[data-clock=${oldClock}]`);if(input){input.value=oldValue;input.focus({preventScroll:true});}}
  else if(oldDay)gridFocus(s);else if(oldAction)dialog.querySelector(`[data-picker="${oldAction}"]`)?.focus({preventScroll:true});
 }
 function chooseDay(day){const s=active;if(!bounds(s,day))return;s.selected=day;s.focusDate=day;s.view=day.slice(0,7);drawCalendar(true);}
 function commitDate(clear=false){
  const s=active;if(clear){const source=s.source,old=source.value;close();source.value='';syncDate(s);if(old!=='')emit(source);return;}
  let raw=s.selected;
  if(!bounds(s,raw)){dialog.querySelector('#picker-error').textContent='请先选择有效的日期。';return;}
  if(s.mode==='datetime-local'){
   const hour=s.hour.trim(),minute=s.minute.trim();if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){dialog.querySelector('#picker-error').textContent='请填写0–23时、0–59分，或点“此刻”。';return;}
   raw+='T'+hour.padStart(2,'0')+':'+minute.padStart(2,'0');
   if(s.min&&raw<s.min||s.max&&raw>s.max){dialog.querySelector('#picker-error').textContent='这个时刻不在可选范围内。';return;}
  }
  const source=s.source,old=source.value;close();source.value=raw;syncDate(s);if(old!==raw)emit(source);
 }
 function optionTabs(){const options=[...dialog.querySelectorAll('[data-option]')],available=options.filter(b=>!b.disabled&&!b.hidden),chosen=available.find(b=>b.getAttribute('aria-selected')==='true')??available[0];options.forEach(b=>b.tabIndex=b===chosen?0:-1);return chosen;}
 function openSelect(select,button,title){if(dialog.open&&active?.source===select)return;show({kind:'select',source:select,button,title});drawOptions();optionTabs()?.focus({preventScroll:true});}
 function drawOptions(query=''){
  const s=active;if(s?.kind!=='select')return;const options=[...s.source.options];dialog.innerHTML=heading(s.title)+`<div class="picker-body">${options.length>8?'<label class="picker-search"><span>查找选项</span><input type="search" data-option-search autocomplete="off" placeholder="输入关键词"></label>':''}<div class="picker-options" role="listbox" aria-label="${e(s.title)}">${options.filter(o=>!query||o.textContent.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(o=>`<button type="button" role="option" data-option="${e(o.value)}" aria-selected="${o.value===s.source.value}" ${o.disabled?'disabled':''}>${e(o.textContent)}</button>`).join('')}</div><button type="button" class="secondary picker-dismiss" data-picker="cancel">取消</button></div>`;
  optionTabs();const input=dialog.querySelector('[data-option-search]');if(input){input.value=query;if(query)input.focus({preventScroll:true});}
 }
 dialog.addEventListener('click',event=>{
  if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();return;}
  event.stopPropagation();const b=event.target.closest('button');if(!b||b.disabled||!active)return;
  if(b.dataset.day){chooseDay(b.dataset.day);return;}
  if(b.dataset.month){active.view=b.dataset.month;active.panel='days';active.focusDate=clamp(active,b.dataset.month+'-01');drawCalendar(true);return;}
  if(b.dataset.option!==undefined){const source=active.source,value=b.dataset.option,old=source.value;close();source.value=value;choices.get(source)?.sync();if(old!==value)emit(source);return;}
  const action=b.dataset.picker;if(action==='cancel'){close();return;}if(active.kind!=='date')return;const s=active;
  if(action==='apply'){commitDate();return;}if(action==='clear'){commitDate(true);return;}
  if(action==='today'){s.selected=localDay();s.focusDate=s.selected;s.view=s.selected.slice(0,7);if(s.mode==='datetime-local'){const now=new Date();s.hour=String(now.getHours()).padStart(2,'0');s.minute=String(now.getMinutes()).padStart(2,'0');}s.panel='days';drawCalendar(true);return;}
  if(action==='months'||action==='back-days'){s.panel=action==='months'?'months':'days';drawCalendar();if(s.panel==='months')dialog.querySelector('[data-picker-year]')?.focus();return;}
  const delta={prev:-1,next:1,'year-prev':-12,'year-next':12}[action];if(delta){const next=shiftCalendarMonth(s.view+'-01',delta);if(next){s.view=next.slice(0,7);s.focusDate=clamp(s,next);drawCalendar();}}
 });
 dialog.addEventListener('input',event=>{if(event.target.dataset.clock){active[event.target.dataset.clock]=event.target.value;const error=dialog.querySelector('#picker-error');if(error)error.textContent='';}if(event.target.hasAttribute('data-option-search')){const query=event.target.value.toLocaleLowerCase();dialog.querySelectorAll('[data-option]').forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase().includes(query));optionTabs();}});
 dialog.addEventListener('change',event=>{if(event.target.hasAttribute('data-picker-year')){const year=Number(event.target.value);if(Number.isInteger(year)&&year>=1&&year<=9999){active.view=String(year).padStart(4,'0')+active.view.slice(4);drawCalendar();dialog.querySelector('[data-picker-year]')?.focus();}else{event.target.value=active.view.slice(0,4);dialog.querySelector('#picker-error').textContent='年份请填写1–9999。';}}});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if(active?.kind==='date'&&event.target.dataset.day){
   const s=active,day=event.target.dataset.day,weekday=(new Date(day+'T12:00:00Z').getUTCDay()+6)%7,delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekday,End:6-weekday}[event.key];let next;
   if(delta!==undefined)next=shiftCalendarDay(day,delta);if(['PageUp','PageDown'].includes(event.key))next=shiftCalendarMonth(day,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
   if(next){event.preventDefault();next=clamp(s,next);s.focusDate=next;s.view=next.slice(0,7);drawCalendar(true);}
  }
  if(active?.kind==='select'&&event.target.getAttribute('role')==='option'&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const options=[...dialog.querySelectorAll('[role=option]:not(:disabled):not([hidden])')],index=options.indexOf(event.target),next=options[event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length];if(next){options.forEach(b=>b.tabIndex=b===next?0:-1);next.focus();}}
  if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(n=>n.tabIndex!==-1&&n.getClientRects().length),first=items[0],last=items.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
 });
 doc.addEventListener('input',event=>{if(dates.has(event.target))syncDate(dates.get(event.target));});
 doc.addEventListener('change',event=>{if(dates.has(event.target)){syncDate(dates.get(event.target));orderDates();}});
 const observer=new MutationObserver(()=>{if(!scheduled&&!disposed){scheduled=true;queueMicrotask(refresh);}});observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','list']});refresh();
 return {refresh,close,dispose(){pickerMotion.dispose();disposed=true;observer.disconnect();doc.removeEventListener('pointerdown',pointerMode,true);doc.removeEventListener('keydown',keyboardMode,true);close();dialog.remove();}};
}

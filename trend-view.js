import {escapeHTML as e} from './core.js';
import {validDay} from './pickers.js';

const W=540,H=210,L=26,R=18,T=20,B=35;
const x=(i,n)=>L+i*(W-L-R)/Math.max(1,n-1),y=value=>T+(10-value)*(H-T-B)/10;
export function selectedIndex(rows,day){
 if(!rows.length)return -1;
 const exact=rows.findIndex(r=>r.day===day);
 return exact>=0?exact:day&&day<rows[0].day?0:rows.length-1;
}
export function indexAt(clientX,bounds,count){
 if(!count||!bounds.width)return -1;
 const position=(clientX-bounds.left)/bounds.width*W;
 return Math.max(0,Math.min(count-1,Math.round((position-L)/(W-L-R)*(count-1))));
}
// Membership follows the saved civil day, not when a backfill was created or
// the timezone in which it is later read. Sleep belongs to its wake date.
export function recordsForDay(records,day){
 if(!validDay(day))return [];
 return records.filter(r=>(r.type==='sleep'?(r.wakeDate??r.localDate):r.localDate)===day)
  .sort((a,b)=>(Date.parse(a.occurredAt)-Date.parse(b.occurredAt))||String(a.id).localeCompare(String(b.id)));
}
export function wholeDayRecord(r){
 return ['daily','sleep','screening'].includes(r.type)||['day-anchor','assessment'].includes(r.entryProvenance?.timeMeaning)||
  r.type==='checkin'&&r.scope==='whole-day'||r.type==='occurrence'&&r.occurrenceScope==='whole-day';
}
export function trendReading(row,metric){
 const label=metric==='lowMood'?'低落感':'焦虑感';
 return {label,value:row.anxiety===null?'—':row.anxiety.toFixed(1),
  description:row.anxiety===null?'这一天未记录'+label+'分值':`当日记录均值 · ${row.count} 次自评`,
  spoken:row.day+'，'+(row.anxiety===null?label+'未记录':`${label} ${row.anxiety.toFixed(1)} 分，${row.count} 次自评`)};
}

export function createFrameQueue(deliver,{request=requestAnimationFrame,cancel=cancelAnimationFrame}={}){
 let frame=null,pending;
 return {push(value){pending=value;if(frame===null)frame=request(()=>{frame=null;const value=pending;pending=undefined;deliver(value);});},flush(){if(frame!==null){cancel(frame);frame=null;const value=pending;pending=undefined;deliver(value);}},clear(){if(frame!==null)cancel(frame);frame=null;pending=undefined;}};
}
export function createTrendExplorer({root,onOpenDay}){
 let rows=[],metric='anxiety',day=null,gesture=null,opening=false,parts=null,counts=new Map(),activeIndex=-1,settle=null,cursorX=0;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),reduced=()=>motion.matches||document.body.classList.contains('reduce-motion');
 function bind(){
  if(parts?.host.isConnected&&root.contains(parts.host))return parts;
  const host=root.querySelector('[data-trend-explorer]');if(!host)return null;
  const q=selector=>host.querySelector(selector);
  return parts={host,plot:q('[data-trend-plot]'),cursor:q('[data-trend-cursor]'),dot:q('[data-trend-selected]'),range:q('[data-trend-range]'),date:q('[data-trend-date]'),value:q('[data-trend-value]'),description:q('[data-trend-description]'),unit:q('[data-trend-unit]'),previous:q('[data-trend-step="-1"]'),next:q('[data-trend-step="1"]'),count:q('[data-trend-count]')};
 }
 function paintCursor(position){const p=bind();if(!p)return;cursorX=x(position,rows.length);p.cursor.setAttribute('transform',`translate(${cursorX} 0)`);}
 function select(index){
  if(!rows.length||index<0||index===activeIndex)return;
  index=Math.max(0,Math.min(rows.length-1,index));const p=bind();if(!p)return;
  activeIndex=index;day=rows[index].day;const row=rows[index],reading=trendReading(row,metric);
  p.dot.style.display=row.anxiety===null?'none':'';p.dot.setAttribute('cx',x(index,rows.length));p.dot.setAttribute('cy',row.anxiety===null?T:y(row.anxiety));
  p.range.value=index;p.range.setAttribute('aria-valuetext',reading.spoken);p.date.textContent=day;p.date.setAttribute('datetime',day);p.value.textContent=reading.value;p.description.textContent=reading.description;p.unit.hidden=row.anxiety===null;p.previous.disabled=index===0;p.next.disabled=index===rows.length-1;p.host.dataset.selectedDay=day;
  const count=counts.get(day)||0;p.count.textContent=count?count+' 条':'还未留下记录';
 }
 const queue=createFrameQueue(value=>{if(!value||!bind())return;select(value.index);paintCursor(value.position);});
 function stopSettle(){if(settle!==null)cancelAnimationFrame(settle);settle=null;}
 function snap(index){
  stopSettle();const target=x(index,rows.length),from=cursorX;if(reduced()||Math.abs(target-from)<.1){paintCursor(index);return;}
  let start;const tick=t=>{if(!bind()){settle=null;return;}start??=t;const progress=Math.min(1,(t-start)/80),position=from+(target-from)*(1-(1-progress)**3);parts.cursor.setAttribute('transform',`translate(${position} 0)`);cursorX=position;if(progress<1)settle=requestAnimationFrame(tick);else settle=null;};settle=requestAnimationFrame(tick);
 }
 function cancel(){queue.clear();stopSettle();const g=gesture;gesture=null;if(g?.plot.hasPointerCapture?.(g.id))g.plot.releasePointerCapture(g.id);}
 function choose(index){if(!Number.isFinite(index)||!rows.length)return;cancel();index=Math.max(0,Math.min(rows.length-1,index));select(index);paintCursor(index);}
 function html(summary,records){
  cancel();parts=null;rows=summary.rows;metric=summary.metric;counts=new Map();for(const r of records){const d=r.type==='sleep'?(r.wakeDate??r.localDate):r.localDate;counts.set(d,(counts.get(d)||0)+1);}
  const index=selectedIndex(rows,day);if(index<0)return '';
  activeIndex=index;day=rows[index].day;cursorX=x(index,rows.length);const reading=trendReading(rows[index],metric);
  let lines='';for(let i=1;i<rows.length;i++)if(rows[i-1].anxiety!==null&&rows[i].anxiety!==null)lines+=`<path class="data-line" d="M${x(i-1,rows.length)},${y(rows[i-1].anxiety)} L${x(i,rows.length)},${y(rows[i].anxiety)}"/>`;
  const count=counts.get(day)||0;
  return `<div class="trend-explorer" data-trend-explorer data-selected-day="${day}"><svg class="trend-chart" data-trend-plot viewBox="0 0 ${W} ${H}" role="img" aria-label="${reading.label}每日记录均值。可左右轻滑选日期，也可用下方日期滑块。缺失日期留空。">${[0,5,10].map(n=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(n)}" y2="${y(n)}"/><text x="0" y="${y(n)+4}">${n}</text>`).join('')}${lines}${rows.map((r,i)=>r.anxiety===null?'':`<circle class="data-dot" cx="${x(i,rows.length)}" cy="${y(r.anxiety)}" r="4.5"><title>${r.day}：${r.anxiety.toFixed(1)}，${r.count} 次记录</title></circle>`).join('')}<g data-trend-cursor transform="translate(${x(index,rows.length)} 0)"><line class="trend-cursor" x1="0" x2="0" y1="${T-5}" y2="${H-B+5}"/></g><circle class="trend-selected" data-trend-selected cx="${x(index,rows.length)}" cy="${rows[index].anxiety===null?T:y(rows[index].anxiety)}" r="7" style="${rows[index].anxiety===null?'display:none':''}"/>${[0,Math.floor(rows.length/2),rows.length-1].map(i=>`<text text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}" x="${x(i,rows.length)}" y="203">${rows[i].day.slice(5).replace('-','/')}</text>`).join('')}</svg><div class="trend-selection"><button type="button" class="trend-step" data-trend-step="-1" aria-label="前一天" ${index===0?'disabled':''}>‹</button><div class="trend-reading" role="status" aria-live="polite" aria-atomic="true"><time data-trend-date datetime="${day}">${day}</time><p><strong data-trend-value>${reading.value}</strong><span data-trend-unit ${rows[index].anxiety===null?'hidden':''}> / 10</span></p><small data-trend-description>${reading.description}</small></div><button type="button" class="trend-step" data-trend-step="1" aria-label="后一天" ${index===rows.length-1?'disabled':''}>›</button></div><label class="visually-hidden" for="trend-day">选择要回看的日期，${rows[0].day} 至 ${rows.at(-1).day}</label><input id="trend-day" class="trend-range" data-trend-range type="range" min="0" max="${rows.length-1}" step="1" value="${index}" aria-valuetext="${e(reading.spoken)}"><p class="trend-hint">左右轻滑看日期 · 上下滑动翻阅页面</p><button type="button" class="secondary trend-day-open" data-trend-open aria-haspopup="dialog">查看这一天的全部记录<span data-trend-count>${count?count+' 条':'还未留下记录'}</span><span aria-hidden="true">↗</span></button></div>`;
 }
 const input=event=>{if(event.target.hasAttribute('data-trend-range'))choose(Number(event.target.value));};
 const click=async event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.hasAttribute('data-trend-step'))choose(activeIndex+Number(button.dataset.trendStep));if(button.hasAttribute('data-trend-open')&&!opening){queue.flush();opening=true;button.setAttribute('aria-busy','true');try{await onOpenDay(day);}finally{opening=false;if(button.isConnected)button.removeAttribute('aria-busy');}}};
 const position=(clientX,bounds)=>Math.max(0,Math.min(rows.length-1,((clientX-bounds.left)/bounds.width*W-L)/(W-L-R)*(rows.length-1)));
 const down=event=>{const plot=event.target.closest('[data-trend-plot]');if(!plot||!event.isPrimary||event.button!==0)return;cancel();bind();gesture={id:event.pointerId,x:event.clientX,y:event.clientY,plot,bounds:plot.getBoundingClientRect(),mode:null};};
 const move=event=>{const g=gesture;if(!g||g.id!==event.pointerId)return;const dx=Math.abs(event.clientX-g.x),dy=Math.abs(event.clientY-g.y);if(!g.mode&&Math.max(dx,dy)>8){g.mode=dx>dy*1.15?'horizontal':'vertical';if(g.mode==='horizontal')g.plot.setPointerCapture?.(g.id);}if(g.mode==='horizontal'){if(event.cancelable)event.preventDefault();const sample=event.getCoalescedEvents?.().at(-1)??event,p=position(sample.clientX,g.bounds);queue.push({index:Math.round(p),position:p});}};
 const up=event=>{const g=gesture;if(!g||g.id!==event.pointerId)return;gesture=null;if(g.mode!=='vertical'&&(g.mode==='horizontal'||Math.hypot(event.clientX-g.x,event.clientY-g.y)<=8)){const p=position(event.clientX,g.bounds);queue.push({index:Math.round(p),position:p});queue.flush();snap(Math.round(p));}else queue.clear();if(g.plot.hasPointerCapture?.(g.id))g.plot.releasePointerCapture(g.id);};
 const lost=()=>{gesture=null;},hidden=()=>{if(document.hidden)cancel();},motionChanged=()=>{if(reduced()){stopSettle();if(!gesture&&bind())paintCursor(activeIndex);}};
 const observer=new MutationObserver(motionChanged);observer.observe(document.body,{attributes:true,attributeFilter:['class']});motion.addEventListener('change',motionChanged);document.addEventListener('visibilitychange',hidden);window.addEventListener('resize',cancel);
 root.addEventListener('input',input);root.addEventListener('click',click);root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move,{passive:false});root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);root.addEventListener('lostpointercapture',lost);
 return {html,mount:bind,deactivate(){cancel();parts=null;},selectedDay:()=>day,dispose(){cancel();observer.disconnect();motion.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',cancel);for(const [name,fn]of [['input',input],['click',click],['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',lost]])root.removeEventListener(name,fn);}};
}

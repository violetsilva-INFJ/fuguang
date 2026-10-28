import {VARIABLES,ENGINE_VERSION} from './analysis.js';
import {AnalysisClient,analysisSnapshot} from './analysis-client.js';
import {escapeHTML as e,localDay,shiftDay} from './core.js';

const stateText={insufficient_pairs:'可配对的日期还少',time_span:'记录跨度还短',sparse_group:'某一组的记录天数不足',constant:'一项记录暂时没有变化',coverage:'缺失日期较多',phase_or_trend_confounding:'时间趋势或阶段变化让方向难以分辨',bootstrap_unstable:'重采样结果不够稳定',outside_tested_support:'超出本版已测试的条件'};
const methodText={kendall:'Kendall τ-b（含并列值修正）',kendall_tau_b:'Kendall τ-b（含并列值修正）',tau_b:'Kendall τ-b（含并列值修正）',cliff:'Cliff δ（有记录组减去明确无记录组）',cliffs_delta:'Cliff δ（有记录组减去明确无记录组）',rank_eta_squared:'秩 η²（组间平方和 / 总平方和）',rank_eta:'秩 η²（组间平方和 / 总平方和）',proportion_difference:'比例差（暴露组减去参照组）',cramers_v:'Cramér V',cramer_v:'Cramér V'};
const variables=Array.isArray(VARIABLES)?VARIABLES:Object.values(VARIABLES);
const getVar=id=>variables.find(v=>v.id===id)||{id,label:id,kind:'continuous'};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const number=v=>finite(v)?v.toFixed(3):'—';
const kind=v=>v.kind||v.type;
const nominal=v=>kind(v)==='nominal';
const axisValue=(v,descriptor)=>kind(descriptor)==='binary'?(descriptor.levelLabels?.[Number(v)]??(Number(v)===1?'明确有':'明确无')):String(v);

function rangePlot(result){
 const method=typeof result.method==='string'?result.method:result.method?.id;
 const nonnegative=/eta|cramer/i.test(method||'');
 const min=nonnegative?0:-1,max=1,px=v=>40+(v-min)/(max-min)*320;
 const ci=result.interval,lo=ci?.low??ci?.lower,hi=ci?.high??ci?.upper,p=result.point;
 return `<svg class="association-range" viewBox="0 0 400 92" role="img" aria-label="${ci?'探索性范围与当前点估计':'当前只有点估计，没有可靠范围'}"><line x1="40" y1="35" x2="360" y2="35" class="axis"/>${!nonnegative?'<line x1="200" y1="24" x2="200" y2="48" class="zero"/>':''}${finite(lo)&&finite(hi)?`<line x1="${px(lo)}" y1="35" x2="${px(hi)}" y2="35" class="interval"/><line x1="${px(lo)}" y1="27" x2="${px(lo)}" y2="43" class="cap"/><line x1="${px(hi)}" y1="27" x2="${px(hi)}" y2="43" class="cap"/>`:''}${finite(p)?`<circle cx="${px(p)}" cy="35" r="6" class="estimate"/>`:''}<text x="40" y="74" text-anchor="start">${nonnegative?'差异较小':'往往较低'}</text><text x="360" y="74" text-anchor="end">${nonnegative?'差异较大':'往往较高'}</text></svg>`;
}
function rawPlot(result,x,y){
 const points=result.validPairs??[],W=400,H=265,left=40,right=375,top=24,bottom=205;
 if(!points.length)return '<p class="empty-inline">还没有可配对的记录。未知日期保持空白。</p>';
 const xCat=nominal(x)||kind(x)==='binary',yCat=nominal(y)||kind(y)==='binary';
 const xs=xCat?[...new Set(points.map(p=>p.x))].sort((a,b)=>String(a).localeCompare(String(b))):null;
 const ys=yCat?[...new Set(points.map(p=>p.y))].sort((a,b)=>String(a).localeCompare(String(b))):null;
 const extent=arr=>{let a=Math.min(...arr),b=Math.max(...arr);if(a===b){a-=.5;b+=.5;}return [a,b];};
 const [xmin,xmax]=xCat?[0,Math.max(1,xs.length-1)]:extent(points.map(p=>p.x));
 const [ymin,ymax]=yCat?[0,Math.max(1,ys.length-1)]:extent(points.map(p=>p.y));
 const X=v=>left+(xCat?xs.indexOf(v):v-xmin)/(xCat?Math.max(1,xs.length-1):xmax-xmin)*(right-left);
 const Y=v=>bottom-(yCat?ys.indexOf(v):v-ymin)/(yCat?Math.max(1,ys.length-1):ymax-ymin)*(bottom-top);
 // Deterministic visual jitter separates tied observations; source values remain unchanged.
 const dots=points.map((p,i)=>`<circle cx="${(X(p.x)+(xCat?Math.sin(i*17)*6:0)).toFixed(2)}" cy="${(Y(p.y)+(yCat?Math.cos(i*13)*4:0)).toFixed(2)}" r="3.8" class="raw-dot"><title>${e(p.date)}${p.targetDate!==p.date?' → '+e(p.targetDate):''}：${e(axisValue(p.x,x))} / ${e(axisValue(p.y,y))}</title></circle>`).join('');
 const xticks=xCat?xs.map(v=>`<text x="${X(v)}" y="226" text-anchor="middle">${e(axisValue(v,x).slice(0,9))}</text>`).join(''):`<text x="${left}" y="226">${xmin.toFixed(1)}</text><text x="${right}" y="226" text-anchor="end">${xmax.toFixed(1)}</text>`;
 const yticks=yCat?ys.map(v=>`<text x="33" y="${Y(v)+4}" text-anchor="end">${e(axisValue(v,y))}</text>`).join(''):`<text x="33" y="${bottom+4}" text-anchor="end">${ymin.toFixed(1)}</text><text x="33" y="${top+4}" text-anchor="end">${ymax.toFixed(1)}</text>`;
 return `<figure class="raw-figure"><figcaption>${e(y.label)}<small>每点为一个配对日；重叠点稍微错开显示</small></figcaption><svg class="association-scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="${points.length} 个配对日的原始数据点"><path d="M40 24V205H375" class="axis"/>${dots}${xticks}${yticks}<text x="208" y="255" text-anchor="middle">${e(x.label)}</text></svg></figure>`;
}
function interpretation(result){
 const method=typeof result.method==='string'?result.method:result.method?.id,ci=result.interval;
 if((result.intervalStates??result.states??[]).includes('phase_or_trend_confounding'))return '时间与阶段也在变化，暂不判断方向';
 if(!ci)return '方向还不稳定，先看看原始记录';
 if(/eta|cramer/i.test(method||''))return '看看不同类别的记录分布';
 const lo=ci.low??ci.lower,hi=ci.high??ci.upper;
 if(lo<=0&&hi>=0)return '方向还不稳定';
 return /cliff|proportion/.test(method||'')?(result.point>0?'有记录组往往较高':'有记录组往往较低'):(result.point>0?'记录中往往一起升高':'记录中往往较低');
}

export function createAssociationView({readRecords,onDataChanged=()=>{}}){
 const client=new AnalysisClient();let data=[],snapshot='',result=null,running=false,progress=0,notice='',generation=0;
 let config={x:'sleepHours',y:'anxiety',lag:0,scoreView:'primary',startDate:shiftDay(localDay(),-179),endDate:localDay(),segmentIndex:0,phaseBoundaries:[],blockLength:7,repetitions:2000,seed:1031};
 const pick=(id,fallback)=>variables.some(v=>v.id===id)?id:variables.find(fallback)?.id;
 config.x=pick(config.x,v=>v.role!=='y');config.y=pick(config.y,v=>v.role==='y');
 const area=()=>document.querySelector('#association-output');
 const update=()=>{const node=area();if(node)node.innerHTML=output();};
 function sync(records){const next=JSON.stringify([...records].sort((a,b)=>a.id.localeCompare(b.id)));data=records;if(next!==snapshot){snapshot=next;client.cancel();generation++;running=false;progress=0;result=null;notice='';}}
 function deactivate(){client.cancel();generation++;running=false;}
 function output(){
  if(running)return `<div class="analysis-status" role="status" aria-live="polite"><p>只在本机，整理日期与重采样…</p><progress max="2000" value="${Math.min(2000,progress)}" aria-label="本地重采样进度"></progress><p class="field-help">${Math.min(2000,progress)} / 2000 次 · 可以随时取消</p><button class="secondary" data-association="cancel">取消计算</button></div>`;
  if(!result)return `<div class="note-panel"><h3>${notice?e(notice):'让记录先说话'}</h3><p>选择两项记录和日期后，在本机计算。未记录的日期不会按“没有”补齐；日常评分、近似草稿与两周量表分别保留。</p></div>`;
  const x=getVar(config.x),y=getVar(config.y),rows=result.rows??[],pairs=result.validPairs??[],ci=result.interval,states=[...new Set([...(result.states??[]),...(result.intervalStates??[])])];
  const method=typeof result.method==='string'?result.method:result.method?.id;
  const groups=x.kind==='binary'?[[0,pairs.filter(p=>p.x===0)],[1,pairs.filter(p=>p.x===1)]]:[];
  const segment=result.selectedSegment,segmentIndex=typeof segment==='number'?segment:segment?.index??config.segmentIndex;
  return `${notice?`<p class="backfill-note" role="status">${e(notice)}</p>`:''}<section class="association-result" aria-labelledby="association-result-title"><p class="eyebrow">${config.scoreView==='estimated'?'单独查看 · 近似评分':'明确自评 · 按日配对'}${config.lag?' · 次日对照':' · 同日对照'}</p><h2 id="association-result-title">${interpretation(result)}</h2><p class="analysis-count"><strong>${pairs.length}</strong> 个配对日 <span> / 选中片段 ${rows.length} 个日历日</span></p><p class="field-help">${e(x.label)} 与 ${e(y.label)}${config.lag?'（第二天）':''}。心绪强度取当天明确记录片刻的中位数，不能代表整天。</p>${result.segments?.length>1?`<p class="field-help">共 ${result.segments.length} 段；已按阶段或连续 14 天缺失分开。只计算所选的一段，不跨段混合。</p><label class="field"><span class="field-label">选择要观察的片段</span><select id="association-segment">${result.segments.map((s,i)=>`<option value="${i}" ${Number(segmentIndex)===i?'selected':''}>第 ${i+1} 段 · ${e(s.startDate??s.start??s.rows?.[0]?.date??'')}–${e(s.endDate??s.end??s.rows?.at(-1)?.date??'')}</option>`).join('')}</select></label>`:''}${finite(result.point)?`<div class="range-panel"><h3>${ci?'探索性范围':'当前的点估计'}</h3>${rangePlot(result)}<p class="field-help">${ci?'线段为连续日期分块重采样得到的探索性范围；圆点是当前记录的估计。尚未验证为普遍适用的 95% 覆盖保证。':'暂时还不能可靠估计范围，不代表没有关联。这里只画已有数据的点估计，不补造范围。'}</p></div>`:'<p class="analysis-unavailable">暂时还不能可靠估计范围，不代表没有关联。</p>'}${states.length?`<ul class="analysis-states">${states.map(s=>`<li>${e(stateText[s]||s)}</li>`).join('')}</ul>`:''}${rawPlot(result,x,y)}${groups.length?`<p class="field-help">明确无记录组 ${groups[0][1].length} 天；有记录组 ${groups[1][1].length} 天。没有填写不进入“无”组。</p>`:''}<details class="review-detail"><summary>查看日期与原始配对值</summary><div class="table-wrap"><table><caption>仅展示完整配对；其余日期保留在缺失计数中。</caption><thead><tr><th>日期</th><th>${e(x.label)}</th><th>对照日期</th><th>${e(y.label)}</th></tr></thead><tbody>${pairs.map(p=>`<tr><td>${e(p.date)}</td><td>${e(axisValue(p.x,x))}</td><td>${e(p.targetDate)}</td><td>${e(axisValue(p.y,y))}</td></tr>`).join('')}</tbody></table></div></details><details class="review-detail analysis-method"><summary>方法、缺失与不确定性</summary><p>统计量：${e(methodText[method]||method||'当前组合暂不支持')}。点估计 ${number(result.point)}；${ci?`探索性范围 ${number(ci.low??ci.lower)} 至 ${number(ci.high??ci.upper)}`:'范围未生成'}。不同类型的统计量不能放在同一条轴上排名。</p><p>窗口 ${e(config.startDate)} 至 ${e(config.endDate)}；完整窗口 ${result.calendarRows?.length??rows.length} 个日历日；所选片段 ${rows.length} 天，${pairs.length} 个完整配对，${rows.length-pairs.length} 天至少缺一项（覆盖 ${rows.length?Math.round(pairs.length/rows.length*100):0}%）。${e(x.description||x.help||x.note||'')} ${e(y.description||y.help||y.note||'')}</p><p>保留完整日历与缺失位置，先按真实日期配对，再在同一片段抽取连续 ${config.blockLength} 天的区块，不循环、不跨缺口、不在新拼接处重新生成次日对照。2000 次，固定种子 ${config.seed}。只有至少 99% 重采样可计算才报告范围。</p><p>最低天数、覆盖率、阶段与趋势检查是保守工程门槛，不保证统计有效性。3 / 14 天分块只能在同样门槛足够时另行查看；不会自动挑选最有利的延迟或模型。</p><p>范围依赖片段内过程足够稳定等假设，不覆盖混杂、选择性记录、测量误差或多次探索。类别差异指标本就非负，范围大于 0 也不证明显著。多个结果不是同时成立的 95% 保证。</p><p>趋势诊断：<span class="analysis-diagnostics">${e(JSON.stringify(result.diagnostics??{}))}</span></p><p>计算版本 ${e(ENGINE_VERSION)}。${e(JSON.stringify(result.excluded??{}))}</p><p><a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html" target="_blank" rel="noopener noreferrer">Kendall 方法</a> · <a href="https://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm" target="_blank" rel="noopener noreferrer">时间自相关</a> · <a href="https://stat.ethz.ch/R-manual/R-devel/library/boot/html/tsboot.html" target="_blank" rel="noopener noreferrer">分块重采样</a></p></details></section>`;
 }
 function html(records){sync(records);return `<section class="content-narrow association-page"><button class="text-button analysis-back" data-go="review">← 回到回望</button><div class="page-heading"><div><div class="eyebrow">Patterns, held lightly</div><h1>生活的线索</h1><p>看看哪些记录常常一起变化。<br>只作探索，不替生活下结论。</p></div></div><form id="association-form"><div class="two-fields"><label class="field"><span class="field-label">生活记录 / 对照项</span><select name="x">${variables.filter(v=>v.role!=='y').map(v=>`<option value="${v.id}" ${config.x===v.id?'selected':''}>${e(v.label)}</option>`).join('')}</select></label><label class="field"><span class="field-label">想观察的记录</span><select name="y">${variables.filter(v=>v.role!=='x').map(v=>`<option value="${v.id}" ${config.y===v.id?'selected':''}>${e(v.label)}</option>`).join('')}</select></label></div><div class="two-fields"><label class="field"><span class="field-label">从哪一天</span><input type="date" name="startDate" max="${localDay()}" value="${config.startDate}" required></label><label class="field"><span class="field-label">到哪一天</span><input type="date" name="endDate" max="${localDay()}" value="${config.endDate}" required></label></div><div class="two-fields"><label class="field"><span class="field-label">时间配对</span><select name="lag"><option value="0" ${config.lag===0?'selected':''}>同一天</option><option value="1" ${config.lag===1?'selected':''}>生活记录 → 第二天</option></select></label><label class="field"><span class="field-label">心绪评分来源</span><select name="scoreView"><option value="primary" ${config.scoreView==='primary'?'selected':''}>明确说出 / 主动选择</option><option value="estimated" ${config.scoreView==='estimated'?'selected':''}>近似草稿 · 单独查看</option></select></label></div><p class="field-help">主分析不纳入叙述推算或比较生成的数字，也不把同一句话的标签当作生活事件。当天“没有”可能仅截至填写时，并非全天监测。来源不明的旧评分不自动归为明确自评。未知与 0 分开。</p><details class="optional-fields"><summary><span>日期分段与计算设置<small>选填</small></span></summary><label class="field"><span class="field-label">已知的测量 / 治疗阶段变化</span><textarea name="phases" rows="3" maxlength="1200" placeholder="每行：2026-08-01 更换设备或记录方式">${e(config.phaseBoundaries.map(p=>p.date+' '+p.label).join('\n'))}</textarea><span class="field-help">只填你确认发生的变化，不会从按需用药猜出治疗阶段。变化日期开始新的一段。</span></label><label class="field"><span class="field-label">连续区块长度</span><select name="blockLength">${[3,7,14].map(n=>`<option value="${n}" ${config.blockLength===n?'selected':''}>${n} 天${n===7?' · 默认':' · 敏感性查看'}</option>`).join('')}</select></label></details><p class="form-error" id="association-error" role="alert"></p><button class="primary analysis-run" type="submit">在本机看一看</button></form><div id="association-output" aria-live="polite">${output()}</div><div class="note-panel"><h3>留意记录背后的情境</h3><p>感受可能先于用药或生活变化；按需用药尤其容易受“因不舒服才使用”影响。结果不能判断药物利弊，也不能用来停药或调整剂量。</p><p>两周量表是独立的评估窗，不拆成 14 天，也不自动作为每日结果。本版保留量表历史，暂不对重叠两周窗口拟合关联。</p><p>无论方向如何，这里都不是因果、诊断或风险 / 缓解因素的筛选结论。</p></div></section>`;}
 function readConfig(form,segmentIndex=0){
  const f=new FormData(form),startDate=f.get('startDate'),endDate=f.get('endDate');
  if(!startDate||!endDate||startDate>endDate||endDate>localDay())throw new Error('请核对日期范围，结束日期不能晚于今天。');
  const phases=String(f.get('phases')||'').split('\n').filter(s=>s.trim()).map(line=>{const m=line.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);if(!m||Number.isNaN(Date.parse(m[1]+'T12:00:00Z'))||new Date(m[1]+'T12:00:00Z').toISOString().slice(0,10)!==m[1])throw new Error('阶段变化请按“2026-08-01 说明”每行填写。');return {date:m[1],label:m[2].slice(0,100)};});
  return {x:String(f.get('x')),y:String(f.get('y')),lag:Number(f.get('lag')),scoreView:String(f.get('scoreView')),startDate,endDate,phaseBoundaries:phases,segmentIndex,blockLength:Number(f.get('blockLength')),repetitions:2000,seed:1031};
 }
 async function run(form,segmentIndex=0){
  const err=document.querySelector('#association-error');if(err)err.textContent='';
  try{const next=readConfig(form,segmentIndex);config=next;client.cancel();const intent=++generation;const current=await readRecords();if(intent!==generation)return;sync(current);onDataChanged(current);const runId=++generation;running=true;progress=0;notice='';result=null;update();
   const out=await client.run(current,next,{onProgress:p=>{if(runId!==generation)return;progress=p.completed??p.done??p.progress??0;const bar=area()?.querySelector('progress');if(bar)bar.value=progress;const small=area()?.querySelector('.field-help');if(small)small.textContent=`${progress} / 2000 次 · 可以随时取消`;}});
   if(runId!==generation||out.cancelled)return;
   const latest=await readRecords();if(analysisSnapshot(latest,next)!==out.key){sync(latest);running=false;notice='记录已变化，旧计算已丢弃。请用最新记录重新查看。';update();return;}
   running=false;result=out.result;notice=out.cached?'本机记录与设置未变，复用同一版本的计算。':'';update();
  }catch(error){running=false;if(err)err.textContent=error.message;notice='这次计算没有完成，记录仍保留。';update();}
 }
 document.addEventListener('submit',event=>{if(event.target.id==='association-form'){event.preventDefault();run(event.target);}});
 document.addEventListener('click',event=>{if(event.target.closest('[data-association="cancel"]')){client.cancel();generation++;running=false;notice='已取消计算，没有更改记录。';update();}});
 document.addEventListener('change',event=>{if(event.target.id==='association-segment')run(document.querySelector('#association-form'),Number(event.target.value));else if(event.target.closest('#association-form')){client.cancel();generation++;running=false;result=null;notice='设置已变更，重新查看后显示结果。';update();}});
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('fuguang-record-changes'):null;
 channel?.addEventListener('message',()=>{client.cancel();generation++;running=false;result=null;notice='本机另一页的记录已变化，请重新查看。';update();});
 return {html,sync,deactivate,dispose(){channel?.close();client.dispose();}};
}

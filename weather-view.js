import {escapeHTML as e} from './core.js';
import {createWeatherService,coarseLocation,weatherAppearance,weatherCodeInfo,WEATHER_PROVIDER,WEATHER_REFRESH_MS,clearWeatherData} from './weather.js';

const clock=value=>Number.isFinite(value)?new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
const statusCopy=state=>{
 if(!state.enabled)return '天气氛围 · 未开启';
 if(state.status==='fresh')return `${state.location.name.split(' · ')[0]} · ${weatherCodeInfo(state.weather.weatherCode)?.label??'天气'} · ${clock(state.weather.observedAt)} 模型`;
 return {loading:'天气氛围 · 正在查询',offline:'天气氛围 · 离线，原背景',stale:'天气氛围 · 待更新，原背景',unknown:'天气氛围 · 暂无法识别',error:'天气氛围 · 暂不可用',cancelled:'天气氛围 · 已取消查询','rate-limited':'天气氛围 · 稍后再更新','needs-consent':'天气氛围 · 待确认'}[state.status]||'天气氛围 · 原背景';
};
const header=()=>'<header class="sheet-top"><h2 id="editor-title">天气氛围</h2><button type="button" class="close" data-action="close-editor" aria-label="关闭"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></header>';
const providerNote=()=>`<p class="field-help weather-provider-note">天气模型与城市搜索：<a href="${WEATHER_PROVIDER.docs}" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="${WEATHER_PROVIDER.licence}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；城市数据来自 <a href="${WEATHER_PROVIDER.geoSource}" target="_blank" rel="noopener noreferrer">GeoNames</a>。<a href="${WEATHER_PROVIDER.terms}" target="_blank" rel="noopener noreferrer">条款与隐私</a>。仅用于本应用的非商业天气装饰，未来商业使用需重新核对许可。服务不保证可用或准确。</p>`;

export function createWeatherController({openPanel=()=>{},closePanel=()=>{},ask=async()=>false,toast=()=>{},fetchImpl,storage,now=()=>Date.now(),navigatorImpl=globalThis.navigator,documentImpl=globalThis.document,windowImpl=globalThis.window}={}){
 let state,viewGeneration=0,panelBusy=false,candidates=[],expiryTimer=null,disposed=false;
 const doc=documentImpl,win=windowImpl,reduce=win?.matchMedia?.('(prefers-reduced-motion: reduce)'),dark=win?.matchMedia?.('(prefers-color-scheme: dark)');
 const service=createWeatherService({fetchImpl,storage,now,online:()=>navigatorImpl?.onLine!==false,hidden:()=>doc?.hidden===true,onChange:s=>{state=s;apply();}});
 state=service.snapshot();
 function apply(){
  if(disposed||!doc)return;state=service.snapshot();const hero=doc.querySelector('.home-hero');
  const appearance=weatherAppearance(state,{reducedMotion:Boolean(reduce?.matches||doc.body?.classList.contains('reduce-motion')),hidden:doc.hidden===true,dark:Boolean(dark?.matches)});
  if(hero){let scene=hero.querySelector('.weather-scene');if(appearance.scene==='original'){scene?.remove();hero.removeAttribute('data-weather-active');}else{
   if(!scene){scene=doc.createElement('div');scene.className='weather-scene';scene.setAttribute('aria-hidden','true');scene.innerHTML='<div class="weather-color-field"></div><div class="weather-particles">'+Array.from({length:8},()=>'<i></i>').join('')+'</div>';hero.appendChild(scene);}
   hero.dataset.weatherActive=appearance.scene;scene.dataset.weatherScene=appearance.scene;scene.dataset.weatherTone=appearance.night?'night':'day';scene.dataset.weatherMotion=appearance.animate?'moving':'static';scene.dataset.weatherPaused=appearance.paused?'true':'false';
  }}
  doc.querySelectorAll('[data-weather-status]').forEach(button=>{button.textContent=statusCopy(state);button.setAttribute('aria-label',statusCopy(state)+'。打开天气设置');});
  clearTimeout(expiryTimer);expiryTimer=null;
  if(state.status==='fresh'&&state.weather){const remaining=state.weather.fetchedAt+WEATHER_REFRESH_MS-now();if(remaining>0)expiryTimer=setTimeout(()=>apply(),remaining+10);}
  const status=doc.querySelector('#weather-current-status');if(status)status.textContent=panelStatus();
 }
 function statusButtonHtml(){state=service.snapshot();return `<button type="button" class="weather-status-button" data-weather-action="open" data-weather-status aria-label="${e(statusCopy(state))}。打开天气设置">${e(statusCopy(state))}</button>`;}
 function panelStatus(){
  const s=service.snapshot(),location=s.location?`已选 ${s.location.name}（粗略坐标 ${s.location.latitude.toFixed(1)}, ${s.location.longitude.toFixed(1)}）。`:'';
  const time=s.weather?`模型时间 ${clock(s.weather.observedAt)}；获取于 ${clock(s.weather.fetchedAt)}。`:'';
  return [statusCopy(s),location,time,s.message,s.enabled&&!s.persistent?'当前浏览器无法持久保存设置，仅本次页面有效。':''].filter(Boolean).join(' ');
 }
 function show(){
  viewGeneration++;panelBusy=false;candidates=[];state=service.snapshot();
  openPanel(`${header()}<div class="sheet-body"><p class="sheet-intro">给“说说此刻”背后添一点天气。选填，默认关闭；关闭时不查询天气或位置。</p><div class="privacy-box"><h3>开启前，先知道这些</h3><p>城市搜索会把你输入的城市名称发给 Open-Meteo；开启后只发送所选区域取整到 0.1° 的粗略坐标，不发送日记、用药、量表或 AI 密钥。</p><p>服务商会接触访问 IP，排障日志可能保存坐标，最长 90 天。天气是模型估计，只作装饰；雷雨没有闪光或声音。</p></div><p id="weather-current-status" class="field-help" role="status">${e(panelStatus())}</p><form id="weather-form"><label class="field"><span class="field-label">手动选一个城市</span><input type="text" id="weather-city" name="weatherCity" maxlength="80" autocomplete="off" placeholder="例如：城市名，可加省份或国家"></label><button type="submit" class="secondary" data-weather-action="search">确认后查找城市</button></form><div id="weather-city-results" class="weather-city-results"></div><div class="weather-actions"><button type="button" class="text-button" data-weather-action="locate">或仅获取一次粗略位置</button>${state.enabled?'<button type="button" class="text-button" data-weather-action="refresh">更新天气（最多每 30 分钟）</button><button type="button" class="text-button" data-weather-action="disable">关闭并清除天气设置</button>':''}</div><p class="form-error" id="weather-error" role="alert"></p><p class="field-help">无需连续定位，不在后台追踪。缓存超过 30 分钟、离线或出错时恢复原背景；减少动态时只保留静态色彩。</p>${providerNote()}<div class="sheet-footer"><button type="button" class="primary" data-action="close-editor">完成</button></div></div>`);
 }
 function message(text){const node=doc?.querySelector('#weather-error');if(node)node.textContent=text;}
 function busy(value){panelBusy=value;doc?.querySelectorAll('#weather-form button,[data-weather-action="locate"],[data-weather-action="refresh"]').forEach(b=>b.disabled=value);}
 async function search(){
  if(panelBusy)return;message('');const query=doc?.querySelector('#weather-city')?.value?.trim()??'';
  if([...query].length<2||[...query].length>80){message('请输入 2–80 字的城市名称。');return;}
  const token=viewGeneration;
  if(!await ask('查找这个城市？',`将城市名称“${query}”发送给 Open-Meteo 的城市搜索服务。服务会接触访问 IP；不附带你的记录。这里只查找候选城市，选择后还会确认是否开启天气。`,'同意并搜索','取消')||token!==viewGeneration)return;
  busy(true);try{const results=await service.searchCity(query,{consent:true});if(token!==viewGeneration)return;candidates=results;
   const node=doc?.querySelector('#weather-city-results');if(node)node.innerHTML=results.length?`<p class="field-help">请选择并核对区域，下一步会再次确认。</p>${results.map((c,i)=>`<button type="button" class="weather-city-option" data-weather-action="select" data-weather-city="${i}"><b>${e(c.name)}</b><small>粗略坐标 ${c.latitude.toFixed(1)}, ${c.longitude.toFixed(1)}</small></button>`).join('')}`:'<p class="field-help">没有匹配城市，试试更完整的名称或加上省份、国家。</p>';
  }catch(err){if(token===viewGeneration)message(err.message||'城市搜索暂时不可用。');}finally{if(token===viewGeneration)busy(false);}
 }
 async function select(location){
  if(panelBusy)return;message('');let selected;try{selected=coarseLocation(location);}catch(err){message(err.message);return;}
  const token=viewGeneration;
  const accepted=await ask('开启这个区域的天气氛围？',`选定区域：${selected.name}\n仅发送粗略坐标：${selected.latitude.toFixed(1)}, ${selected.longitude.toFixed(1)} → Open-Meteo。服务会接触 IP，排障日志可能含坐标并保存最长 90 天。不会发送日记、用药、量表或 AI 密钥。\n开启后在页面可见时按缓存需要查询，最多每 30 分钟一次；不连续获取位置。天气仅作装饰。`,'同意并开启','取消');
  if(!accepted||token!==viewGeneration)return;
  busy(true);try{service.enableLocation(selected,{consent:true});await service.refresh();if(token!==viewGeneration)return;state=service.snapshot();apply();show();toast(state.status==='fresh'?'天气氛围已开启':'设置已保存，天气暂时保留原背景');}catch(err){if(token===viewGeneration)message(err.message);}finally{if(token===viewGeneration)busy(false);}
 }
 async function locate(){
  if(panelBusy)return;message('');const token=viewGeneration;
  if(!navigatorImpl?.geolocation?.getCurrentPosition){message('当前浏览器未提供定位，请手动选择城市。');return;}
  const accepted=await ask('仅获取一次位置？','浏览器会询问位置权限。原始位置仅在本次回调中用于取整到 0.1°，不会保存或直接发出。下一步先显示粗略坐标，只有你再次确认才发送给 Open-Meteo。也可以取消并手动选城市。','继续一次定位','取消');
  if(!accepted||token!==viewGeneration)return;
  busy(true);try{
   const coarse=await new Promise((resolve,reject)=>navigatorImpl.geolocation.getCurrentPosition(position=>{try{resolve(coarseLocation({name:'一次定位的附近区域',latitude:position.coords.latitude,longitude:position.coords.longitude,kind:'coarse-device'}));}catch(err){reject(err);}},()=>reject(new Error('没有取得位置，未发送任何坐标。请手动选城市。')),{enableHighAccuracy:false,timeout:8000,maximumAge:0}));
   if(token!==viewGeneration)return;busy(false);await select(coarse);
  }catch(err){if(token===viewGeneration)message(err.message);}finally{if(token===viewGeneration)busy(false);}
 }
 async function click(event){const button=event.target?.closest?.('[data-weather-action]');if(!button)return;const action=button.dataset.weatherAction;
  if(action==='search')return; // Form submit owns search, avoiding a duplicate click request.
  if(action==='open'){show();return;}
  if(action==='select'){await select(candidates[Number(button.dataset.weatherCity)]);return;}
  if(action==='locate'){await locate();return;}
  if(action==='disable'){viewGeneration++;service.disable();show();toast('天气已关闭，设置与缓存已清除');return;}
  if(action==='refresh'){if(panelBusy)return;busy(true);try{await service.refresh();apply();}finally{busy(false);}return;}
 }
 const submit=event=>{if(event.target?.id==='weather-form'){event.preventDefault();return search();}};
 const visibility=()=>{if(doc?.hidden){service.cancel();apply();}else{apply();service.refresh();}};
 const connection=()=>{apply();if(navigatorImpl?.onLine!==false&&!doc?.hidden)service.refresh();};
 const panelClosed=()=>{viewGeneration++;panelBusy=false;service.cancel();};
 doc?.addEventListener('click',click);doc?.addEventListener('submit',submit);doc?.addEventListener('visibilitychange',visibility);win?.addEventListener('online',connection);win?.addEventListener('offline',connection);
 const editor=doc?.querySelector('#editor');editor?.addEventListener('close',panelClosed);reduce?.addEventListener?.('change',apply);dark?.addEventListener?.('change',apply);
 return {statusButtonHtml,apply,open:show,init(){apply();return service.init();},clear(){viewGeneration++;service.disable();clearWeatherData(storage);apply();},dispose(){disposed=true;viewGeneration++;clearTimeout(expiryTimer);service.dispose();doc?.removeEventListener('click',click);doc?.removeEventListener('submit',submit);doc?.removeEventListener('visibilitychange',visibility);win?.removeEventListener('online',connection);win?.removeEventListener('offline',connection);editor?.removeEventListener('close',panelClosed);reduce?.removeEventListener?.('change',apply);dark?.removeEventListener?.('change',apply);},getState:()=>service.snapshot()};
}

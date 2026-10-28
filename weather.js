// Optional decoration only. No journal, medication, AI, analytics or location-history imports.
export const WEATHER_STORAGE_KEY='fuguang-weather-v1';
export const WEATHER_CONSENT_VERSION='open-meteo-coarse-v1';
export const WEATHER_REFRESH_MS=30*60*1000;
export const WEATHER_PROVIDER={name:'Open-Meteo',forecast:'https://api.open-meteo.com/v1/forecast',geocoding:'https://geocoding-api.open-meteo.com/v1/search',docs:'https://open-meteo.com/en/docs',terms:'https://open-meteo.com/en/terms',licence:'https://creativecommons.org/licenses/by/4.0/',geoSource:'https://www.geonames.org/'};
const liveServices=new Set();
const isNumber=v=>typeof v==='number'&&Number.isFinite(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const storageOrNull=given=>{if(given!==undefined)return given;try{return globalThis.localStorage??null;}catch{return null;}};
const cleanText=(value,max=100)=>typeof value==='string'?value.trim().slice(0,max):'';
const emptyPreferences=()=>({schema:1,enabled:false,consentVersion:null,location:null,cache:null,lastAttemptAt:null,lastAttemptLocation:null});
const locationKey=location=>location?`${location.latitude.toFixed(1)},${location.longitude.toFixed(1)}`:null;

export function coarseLocation(input){
 if(!input||!isNumber(input.latitude)||!isNumber(input.longitude)||input.latitude< -90||input.latitude>90||input.longitude< -180||input.longitude>180)throw new Error('这份城市位置暂时无法使用，请重新选择。');
 return {name:cleanText(input.name)||'一次定位的附近区域',latitude:Number(input.latitude.toFixed(1)),longitude:Number(input.longitude.toFixed(1)),kind:input.kind==='coarse-device'?'coarse-device':'city'};
}
export function weatherCodeInfo(code){
 if(code===0||code===1)return {scene:'sun',label:code===0?'晴朗':'大部晴朗'};
 if(code===2||code===3)return {scene:'cloud',label:code===2?'局部多云':'多云'};
 if(code===45||code===48)return {scene:'cloud',label:'雾'};
 if([51,53,55,56,57].includes(code))return {scene:'rain',label:'细雨'};
 if([61,63,65,66,67,80,81,82].includes(code))return {scene:'rain',label:'雨'};
 if([71,73,75,77,85,86].includes(code))return {scene:'snow',label:'雪'};
 if([95,96,97,99].includes(code))return {scene:'storm',label:'雷雨（仅静态云色）'};
 return null;
}
function cacheFrom(input){
 if(!input||!Number.isInteger(input.weatherCode)||![0,1].includes(input.isDay)||!isNumber(input.observedAt)||!isNumber(input.fetchedAt)||typeof input.locationKey!=='string')return null;
 return {weatherCode:input.weatherCode,isDay:input.isDay,observedAt:input.observedAt,fetchedAt:input.fetchedAt,locationKey:input.locationKey};
}
function preferencesFrom(input){
 const empty=emptyPreferences();if(!input||input.schema!==1||input.enabled!==true||input.consentVersion!==WEATHER_CONSENT_VERSION)return empty;
 let location;try{location=coarseLocation(input.location);}catch{return empty;}
 return {...empty,enabled:true,consentVersion:WEATHER_CONSENT_VERSION,location,cache:cacheFrom(input.cache),lastAttemptAt:isNumber(input.lastAttemptAt)?input.lastAttemptAt:null,lastAttemptLocation:typeof input.lastAttemptLocation==='string'?input.lastAttemptLocation:null};
}
export function loadWeatherPreferences(storage){
 const target=storageOrNull(storage);try{return preferencesFrom(JSON.parse(target?.getItem(WEATHER_STORAGE_KEY)||'null'));}catch{return emptyPreferences();}
}
export function clearWeatherData(storage){
 const target=storageOrNull(storage);for(const instance of liveServices)if(instance.storage===target)instance.reset();
 try{target?.removeItem(WEATHER_STORAGE_KEY);}catch{}
}
export function buildGeocodingURL(city){
 const query=typeof city==='string'?city.trim():'';if([...query].length<2||[...query].length>80)throw new Error('请输入 2–80 字的城市名称。');
 const url=new URL(WEATHER_PROVIDER.geocoding);url.searchParams.set('name',query);url.searchParams.set('count','5');url.searchParams.set('language','zh');url.searchParams.set('format','json');return url;
}
export function buildWeatherURL(location){
 const coarse=coarseLocation(location),url=new URL(WEATHER_PROVIDER.forecast);url.searchParams.set('latitude',coarse.latitude.toFixed(1));url.searchParams.set('longitude',coarse.longitude.toFixed(1));url.searchParams.set('current','weather_code,is_day');url.searchParams.set('timezone','GMT');return url;
}
export function isAllowedWeatherURL(value){
 try{const u=new URL(value),base=u.origin+u.pathname;if(u.username||u.password||u.hash||u.protocol!=='https:')return false;
  const keys=[...u.searchParams.keys()];if(keys.length!==4||new Set(keys).size!==4)return false;
  if(base===WEATHER_PROVIDER.forecast){const latitude=Number(u.searchParams.get('latitude')),longitude=Number(u.searchParams.get('longitude'));return keys.every(k=>['latitude','longitude','current','timezone'].includes(k))&&isNumber(latitude)&&isNumber(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180&&u.searchParams.get('latitude')===latitude.toFixed(1)&&u.searchParams.get('longitude')===longitude.toFixed(1)&&u.searchParams.get('current')==='weather_code,is_day'&&u.searchParams.get('timezone')==='GMT';}
  if(base===WEATHER_PROVIDER.geocoding){const city=u.searchParams.get('name')??'';return keys.every(k=>['name','count','language','format'].includes(k))&&[...city].length>=2&&[...city].length<=80&&u.searchParams.get('count')==='5'&&u.searchParams.get('language')==='zh'&&u.searchParams.get('format')==='json';}
  return false;
 }catch{return false;}
}
function parseCurrent(data,at,key){
 const current=data?.current;if(data?.error||!current||!Number.isInteger(current.weather_code)||![0,1].includes(current.is_day))throw new Error('天气数据格式暂时无法识别，已保留原背景。');
 const time=current.time,observedAt=typeof time==='number'?time*1000:typeof time==='string'?Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(time)?time:time+'Z'):NaN;
 if(!isNumber(observedAt)||observedAt>at+5*60000||at-observedAt>60*60000)throw new Error('天气的模型时间过旧或异常，已保留原背景。');
 return {weatherCode:current.weather_code,isDay:current.is_day,observedAt,fetchedAt:at,locationKey:key};
}
export function weatherAppearance(state,{reducedMotion=false,hidden=false,dark=false}={}){
 const fresh=state?.status==='fresh'&&state.weather,info=fresh?weatherCodeInfo(state.weather.weatherCode):null;
 return {scene:info?.scene??'original',label:info?.label??null,night:Boolean(info&&(state.weather.isDay===0||dark)),animate:Boolean(info&&['rain','snow'].includes(info.scene)&&!reducedMotion&&!hidden),paused:Boolean(hidden),static:Boolean(reducedMotion)};
}

export function createWeatherService({fetchImpl=globalThis.fetch,storage,now=()=>Date.now(),online=()=>globalThis.navigator?.onLine!==false,hidden=()=>globalThis.document?.hidden===true,timeoutMs=8000,onChange=()=>{}}={}){
 const target=storageOrNull(storage);let prefs=loadWeatherPreferences(target),revision=0,error=null,loading=false,lastSearchAt=null,persistent=Boolean(target),destroyed=false;
 const controllers=new Set();
 function persist(){try{if(!target)throw new Error('session only');target.setItem(WEATHER_STORAGE_KEY,JSON.stringify(prefs));persistent=true;}catch{persistent=false;}}
 function snapshot(){
  const at=now(),cache=prefs.cache,key=locationKey(prefs.location),fresh=cache&&cache.locationKey===key&&at>=cache.fetchedAt&&at-cache.fetchedAt<WEATHER_REFRESH_MS&&at>=cache.observedAt-5*60000&&at-cache.observedAt<=60*60000;
  let status='off';if(prefs.enabled){if(!prefs.location||prefs.consentVersion!==WEATHER_CONSENT_VERSION)status='needs-consent';else if(!online())status='offline';else if(error)status=error.code??'error';else if(loading)status='loading';else if(fresh&&weatherCodeInfo(cache.weatherCode))status='fresh';else if(fresh)status='unknown';else status='stale';}
  return {enabled:prefs.enabled,status,location:clone(prefs.location),weather:cache?clone(cache):null,message:error?.message??null,persistent,revision,provider:WEATHER_PROVIDER.name};
 }
 function emit(){const s=snapshot();onChange(s);return s;}
 function abortPending(){for(const c of controllers)c.abort();controllers.clear();loading=false;}
 function reset(){revision++;abortPending();prefs=emptyPreferences();error=null;emit();}
 const registry={storage:target,reset};liveServices.add(registry);
 async function fetchJSON(url){
  if(!isAllowedWeatherURL(url))throw new Error('天气请求地址不在允许范围内。');
  const controller=new AbortController();controllers.add(controller);let timer;
  const abort=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>{const e=new Error('天气查询已取消或超时。');e.name='AbortError';reject(e);},{once:true});timer=setTimeout(()=>controller.abort(),timeoutMs);});
  try{
   const response=await Promise.race([fetchImpl(url.href,{method:'GET',mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:controller.signal}),abort]);
   if(!response?.ok||response.redirected||response.url&&(new URL(response.url).origin+new URL(response.url).pathname)!==(url.origin+url.pathname))throw new Error('天气服务暂时没有返回可用结果，已保留原背景。');
   if(Number(response.headers?.get?.('content-length')||0)>32768)throw new Error('天气结果超出读取范围，已保留原背景。');
   return await Promise.race([response.json(),abort]);
  }finally{clearTimeout(timer);controllers.delete(controller);}
 }
 async function searchCity(city,{consent=false}={}){
  if(!consent)throw new Error('请先确认将城市名称发送给 Open-Meteo。');
  if(!online())throw new Error('当前离线，请联网后再查找城市。');
  const at=now();if(lastSearchAt!==null&&at-lastSearchAt<1500)throw new Error('刚刚查找过城市，请稍候再试。');
  const url=buildGeocodingURL(city),token=revision;lastSearchAt=at;
  const data=await fetchJSON(url);if(destroyed||token!==revision)return [];
  if(data?.error||data?.results&&!Array.isArray(data.results))throw new Error('城市结果暂时无法读取，请稍后再试。');
  return (data?.results??[]).slice(0,5).flatMap(item=>{try{const name=[item.name,item.admin1,item.country].filter((v,i,a)=>typeof v==='string'&&v.trim()&&a.indexOf(v)===i).join(' · ');return [coarseLocation({name,latitude:item.latitude,longitude:item.longitude,kind:'city'})];}catch{return [];}});
 }
 function enableLocation(location,{consent=false}={}){
  if(!consent)throw new Error('尚未同意向 Open-Meteo 发送这个粗略位置。');
  const selected=coarseLocation(location);revision++;abortPending();const changed=locationKey(selected)!==locationKey(prefs.location);
  prefs={...prefs,enabled:true,consentVersion:WEATHER_CONSENT_VERSION,location:selected,cache:changed?null:prefs.cache};error=null;persist();return emit();
 }
 async function refresh(){
  if(destroyed||!prefs.enabled||!prefs.location||prefs.consentVersion!==WEATHER_CONSENT_VERSION||hidden())return snapshot();
  if(!online()){error=null;return emit();}
  const at=now(),key=locationKey(prefs.location),state=snapshot();
  if(loading)return state;
  if(state.status==='fresh')return state;
  // No retry storm on failures/reloads. Changing a city also keeps the existing 30-minute budget.
  if(prefs.lastAttemptAt!==null&&at-prefs.lastAttemptAt<WEATHER_REFRESH_MS){error={code:'rate-limited',message:'最近30分钟已查询过天气；暂时保留原背景，稍后再更新。'};return emit();}
  const token=revision;error=null;loading=true;prefs.lastAttemptAt=at;prefs.lastAttemptLocation=key;persist();emit();
  try{const data=await fetchJSON(buildWeatherURL(prefs.location));if(destroyed||token!==revision)return snapshot();prefs.cache=parseCurrent(data,now(),key);error=null;loading=false;persist();return emit();}
  catch(err){if(destroyed||token!==revision)return snapshot();loading=false;error={code:err.name==='AbortError'?'cancelled':'error',message:err.message||'天气暂时不可用，已保留原背景。'};return emit();}
 }
 function cancel(){const weatherLoading=loading;revision++;abortPending();if(weatherLoading&&prefs.enabled)error={code:'cancelled',message:'查询已取消，暂时保留原背景。'};return emit();}
 function disable(){reset();try{target?.removeItem(WEATHER_STORAGE_KEY);}catch{}return snapshot();}
 return {snapshot,searchCity,enableLocation,refresh,cancel,disable,clear:disable,init:refresh,dispose(){destroyed=true;revision++;abortPending();liveServices.delete(registry);}};
}

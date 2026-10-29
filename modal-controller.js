// Small local transition controller; opening a new form invalidates pending close work.
export function createModalController(dialog,{fallback=()=>document.querySelector('#main')}={}){
 let sequence=0,closing=false,timer=null,returnFocus=null,scrollY=0,scrollRoot=null;
 const reduced=()=>document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stop=()=>{clearTimeout(timer);timer=null;dialog.getAnimations().forEach(a=>a.cancel());};
 function show(content){const wasOpen=dialog.open;sequence++;stop();closing=false;dialog.inert=false;dialog.classList.remove('is-closing');if(!wasOpen){returnFocus=document.activeElement;scrollRoot=document.querySelector('#page-scroll')??document.scrollingElement;scrollY=scrollRoot.scrollTop;}dialog.innerHTML=content;document.body.classList.add('modal-open');if(!wasOpen)dialog.showModal();dialog.scrollTop=0;if(!reduced())dialog.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:150,easing:'cubic-bezier(.2,.7,.2,1)'});}
 function close({immediate=false}={}){if(closing&&!immediate)return;const token=++sequence;stop();closing=true;dialog.classList.add('is-closing');dialog.inert=true;const finish=()=>{if(token!==sequence)return;stop();dialog.close();dialog.innerHTML='';dialog.inert=false;dialog.classList.remove('is-closing');closing=false;document.body.classList.remove('modal-open');scrollRoot?.scrollTo({top:scrollY,behavior:'instant'});const target=returnFocus?.isConnected&&!dialog.contains(returnFocus)?returnFocus:fallback();target?.focus?.({preventScroll:true});};if(!dialog.open||immediate||reduced()){finish();return;}const animation=dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(7px)'}],{duration:120,easing:'ease-in',fill:'forwards'});animation.finished.then(finish).catch(()=>{});timer=setTimeout(finish,160);}
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),onMotion=()=>{if(reduced()){if(closing)close({immediate:true});else stop();}};motion.addEventListener?.('change',onMotion);
 return {show,close,cancelMotion:onMotion,dispose(){sequence++;stop();motion.removeEventListener?.('change',onMotion);if(dialog.open)dialog.close();dialog.inert=false;document.body.classList.remove('modal-open');}};
}

// Keep one non-scrolling frame. Only #page-scroll owns long-page scrolling.
// VisualViewport accounts for a keyboard/panning without reading any input.
export function installViewportLayout(win=window,doc=document){
 const viewport=win.visualViewport,style=doc.documentElement.style;
 let frame=null,last='',disposed=false;
 function update(){
  frame=null;if(disposed)return;
  const layout=Math.max(doc.documentElement.clientHeight,win.innerHeight||0);
  // Pinch zoom keeps the unzoomed layout; do not shrink/reflow the app under it.
  if(viewport&&Math.abs((viewport.scale||1)-1)>.01)return;
  const height=viewport?.height??layout;
  if(!Number.isFinite(height)||height<=0||!layout)return;
  const visible=Math.min(height,layout),top=Math.max(0,Math.min(viewport?.offsetTop||0,layout-visible));
  const bottom=Math.max(0,layout-visible-top),next=[visible,top,bottom].map(n=>Math.round(n*100)/100).join(':');
  if(next===last)return;last=next;
  style.setProperty('--app-viewport-height',visible+'px');
  style.setProperty('--app-viewport-top',top+'px');
  style.setProperty('--app-viewport-bottom',bottom+'px');
 }
 const schedule=()=>{if(!disposed&&frame===null)frame=win.requestAnimationFrame(update);};
 const targets=[[win,'resize'],[win,'orientationchange'],[win,'pageshow'],[viewport,'resize'],[viewport,'scroll']];
 targets.forEach(([target,event])=>target?.addEventListener(event,schedule,{passive:true}));update();
 return {dispose(){disposed=true;if(frame!==null)win.cancelAnimationFrame(frame);targets.forEach(([target,event])=>target?.removeEventListener(event,schedule));['height','top','bottom'].forEach(key=>style.removeProperty('--app-viewport-'+key));}};
}

// Feedback never gates actions. Repeated clicks replace their own short animation.
export function installButtonFeedback(doc=document){
 const active=new Set(),byButton=new WeakMap(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>motion.matches||doc.body.classList.contains('reduce-motion');
 function cancel(){for(const animation of active)animation.cancel();active.clear();}
 function click(event){const b=event.target.closest?.('button');if(!b||b.disabled||b.closest('.tabbar')||reduced())return;byButton.get(b)?.cancel();if(!b.animate)return;const animation=b.animate([{transform:'translateY(1px) scale(.98)'},{transform:'translateY(0) scale(1)'}],{duration:170,easing:'cubic-bezier(.2,.7,.2,1)'});byButton.set(b,animation);active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));}
 const observer=new MutationObserver(()=>{if(reduced())cancel();});observer.observe(doc.body,{attributes:true,attributeFilter:['class']});
 doc.addEventListener('click',click,true);motion.addEventListener('change',cancel);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancel();});
 return {cancel,dispose(){cancel();observer.disconnect();doc.removeEventListener('click',click,true);motion.removeEventListener('change',cancel);}};
}

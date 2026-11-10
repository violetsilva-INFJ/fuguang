// Small shared motion vocabulary. Data and hit testing never wait for a tween.
const ease='cubic-bezier(.22,.8,.24,1)';
const prefersStill=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('reduce-motion');
export function createViewMotion(root){
 let animation=null,target=null;const media=matchMedia('(prefers-reduced-motion: reduce)');
 const cancel=()=>{animation?.cancel();animation=null;target=null;},changed=()=>{if(prefersStill())cancel();};
 const observer=new MutationObserver(changed);observer.observe(document.body,{attributes:true,attributeFilter:['class']});media.addEventListener('change',changed);
 return {cancel,play(next=root,{offset=8,duration=180,direction=1,axis='y',startOpacity=.72}={}){const current=target===next&&animation?getComputedStyle(next):null,from=current?{opacity:current.opacity,transform:current.transform}:{opacity:startOpacity,transform:axis==='x'?`translate3d(${offset*direction}px,0,0)`:`translate3d(0,${offset}px,0)`};cancel();if(prefersStill()||!next?.isConnected||!next.animate)return;target=next;const a=next.animate([from,{opacity:1,transform:'translate3d(0,0,0)'}],{duration,easing:ease});animation=a;a.finished.catch(()=>{}).finally(()=>{if(animation===a){animation=null;target=null;}});},dispose(){cancel();observer.disconnect();media.removeEventListener('change',changed);}};
}

// The live DOM always receives input. An isolated, inert picture of a bounded
// outgoing tree can fade above it, but is discarded on the next interaction.
// Native View Transitions temporarily remove their source from hit testing,
// which loses a drag beginning while a chart snapshot is on screen.
export function createPageTransition({fallback}={}){
 let ghost=null,animation=null,sheet=null;const media=matchMedia('(prefers-reduced-motion: reduce)');
 function clear(){animation?.cancel();animation=null;ghost?.remove();ghost=null;}
 function stop(){clear();fallback?.cancel();}
 function picture(source){
  if(!source||!source.isConnected||source.querySelectorAll('*').length>1800||document.body.classList.contains('solid-material'))return null;
  const rect=source.getBoundingClientRect();if(!rect.width||!rect.height||rect.bottom<=0||rect.top>=innerHeight)return null;
  try{
   if(!sheet){const next=new CSSStyleSheet();next.replaceSync([...document.styleSheets].flatMap(s=>[...s.cssRules].map(r=>r.cssText)).join('\n'));sheet=next;}
   const host=document.createElement('div'),shadow=host.attachShadow({mode:'closed'}),copy=source.cloneNode(true),style=getComputedStyle(source);copy.querySelectorAll('text,title').forEach(node=>node.remove());
   host.className='motion-picture';host.inert=true;host.setAttribute('aria-hidden','true');Object.assign(host.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',font:style.font,color:style.color,letterSpacing:style.letterSpacing});
   shadow.adoptedStyleSheets=[sheet];Object.assign(copy.style,{position:'relative',inset:'auto',width:'100%',height:'100%',minHeight:'0',maxHeight:'none',maxWidth:'none',margin:'0',overflow:'hidden',transform:'none',opacity:'1'});shadow.append(copy);document.body.append(host);copy.scrollTop=source.scrollTop;
   return host;
  }catch{return null;}
 }
 const changed=()=>{if(prefersStill()||document.hidden)stop();};
 const observer=new MutationObserver(changed);observer.observe(document.body,{attributes:true,attributeFilter:['class']});media.addEventListener('change',changed);document.addEventListener('visibilitychange',changed);
 const interrupt=()=>stop();for(const event of ['pointerdown','keydown','wheel','touchmove'])document.addEventListener(event,interrupt,{capture:true,passive:true});window.addEventListener('resize',interrupt,{passive:true});window.visualViewport?.addEventListener('resize',interrupt,{passive:true});
 return {get pending(){return false;},flush:stop,cancel:stop,run(update,{scope='page',direction=1}={}){
  stop();const still=prefersStill()||document.hidden,source=scope==='chart'?document.querySelector('.trend-chart'):null,outgoing=still?null:picture(source);
  try{update();}catch(error){outgoing?.remove();return Promise.reject(error);}
  if(still)return Promise.resolve();ghost=outgoing;const target=document.querySelector(scope==='chart'?'.trend-chart':'#main');fallback?.play(target,{axis:scope==='chart'?'y':'x',direction,offset:scope==='chart'?3:8,duration:190,startOpacity:scope==='chart'?.72:.9});
  if(ghost){const node=ghost,a=node.animate([{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:`translate3d(${-4*direction}px,0,0)`}],{duration:160,easing:ease});animation=a;a.finished.catch(()=>{}).finally(()=>{if(animation===a){animation=null;ghost=null;node.remove();}});}
  return Promise.resolve();
 },dispose(){stop();observer.disconnect();media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',changed);for(const event of ['pointerdown','keydown','wheel','touchmove'])document.removeEventListener(event,interrupt,true);window.removeEventListener('resize',interrupt);window.visualViewport?.removeEventListener('resize',interrupt);}};
}

export function createModalController(dialog,{fallback=()=>document.querySelector('#main')}={}){
 let sequence=0,timer=null,returnFocus=null,scrollY=0,scrollRoot=null,stage=0,closing=false,contentAnimations=[];
 const stopContent=()=>{contentAnimations.forEach(a=>a.cancel());contentAnimations=[];};
 const stopCleanup=()=>{clearTimeout(timer);timer=null;};
 function show(content,{scrollTop=0,focus=null,direction='forward'}={}){
  const wasOpen=dialog.open,wasClosing=closing,before=wasOpen?dialog.getBoundingClientRect():null;sequence++;stopCleanup();stopContent();closing=false;dialog.inert=false;dialog.removeAttribute('aria-hidden');dialog.classList.remove('is-closing');
  if(!wasOpen){if(!wasClosing)stage=0;returnFocus=document.activeElement;scrollRoot=document.querySelector('#page-scroll')??document.scrollingElement;scrollY=scrollRoot.scrollTop;}
  if(typeof content==='string')dialog.innerHTML=content;else dialog.replaceChildren(...content);
  document.body.classList.add('modal-open');dialog.style.height='auto';if(!wasOpen)dialog.showModal();
  const natural=dialog.scrollHeight+2,minimum=420;
  stage=Math.max(stage,natural,minimum);dialog.style.height=stage+'px';
  // Layout happens once. The panel then moves as a rigid surface, without text scaling.
  if(wasOpen&&before&&!prefersStill()){const previous=dialog.style.transition,currentOpacity=getComputedStyle(dialog).opacity;dialog.style.opacity=currentOpacity;dialog.style.transition='none';dialog.style.transform='none';const after=dialog.getBoundingClientRect(),delta=before.top-after.top;dialog.style.transform=`translate3d(0,${delta}px,0)`;dialog.getBoundingClientRect();dialog.style.transition=previous;dialog.style.transform='';dialog.style.opacity='';}
  dialog.scrollTop=scrollTop;const target=focus?.isConnected&&dialog.contains(focus)?focus:dialog.querySelector('.sheet-top button');target?.focus?.({preventScroll:true});
  if(wasOpen&&!prefersStill()){const sign=direction==='back'?-1:1;for(const node of [dialog.querySelector('.sheet-top h2'),dialog.querySelector(':scope>.sheet-body')].filter(Boolean)){const a=node.animate([{opacity:.65,transform:`translate3d(${sign*(node.tagName==='H2'?8:16)}px,0,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:190,easing:ease});contentAnimations.push(a);a.finished.catch(()=>{});}}
 }
 function close({immediate=false}={}){
  const token=++sequence;stopCleanup();stopContent();closing=true;dialog.inert=true;dialog.setAttribute('aria-hidden','true');dialog.classList.add('is-closing');dialog.style.transform='';dialog.close();document.body.classList.remove('modal-open');
  scrollRoot?.scrollTo({top:scrollY,behavior:'instant'});const target=returnFocus?.isConnected&&!dialog.contains(returnFocus)?returnFocus:fallback();target?.focus?.({preventScroll:true});
  const finish=()=>{if(token!==sequence||dialog.open)return;dialog.replaceChildren();dialog.inert=false;dialog.classList.remove('is-closing');dialog.style.height='';stage=0;closing=false;timer=null;};
  if(immediate||prefersStill())finish();else timer=setTimeout(finish,260);
 }
 const media=matchMedia('(prefers-reduced-motion: reduce)'),still=()=>{if(prefersStill()){stopContent();if(closing)close({immediate:true});}};
 // A keyboard/orientation change invalidates the previous surface's FLIP offset.
 // Settle it immediately, before the new viewport frame is measured.
 const resized=()=>{if(!dialog.open)return;stopContent();const previous=dialog.style.transition;dialog.style.transition='none';dialog.style.transform='';dialog.getBoundingClientRect();dialog.style.transition=previous;};
 media.addEventListener('change',still);
 window.addEventListener('resize',resized,{passive:true});window.visualViewport?.addEventListener('resize',resized,{passive:true});
 return {show,close,cancelMotion:still,dispose(){sequence++;stopCleanup();stopContent();media.removeEventListener('change',still);window.removeEventListener('resize',resized);window.visualViewport?.removeEventListener('resize',resized);if(dialog.open)dialog.close();dialog.replaceChildren();dialog.style.height='';dialog.inert=false;document.body.classList.remove('modal-open');}};
}

// Minimum scroll needed to reveal a focused control, without moving already
// visible fields. Tall controls align their top; CSS bounds textareas so the
// browser can keep their caret visible by scrolling inside the textarea.
export function focusScrollDelta(rect,top,bottom){
 if(![rect.top,rect.bottom,top,bottom].every(Number.isFinite)||bottom<=top)return 0;
 if(rect.bottom-rect.top>bottom-top)return rect.top-top;
 return rect.top<top?rect.top-top:rect.bottom>bottom?rect.bottom-bottom:0;
}
export function revealFocusedControl(win,doc,top,height){
 const input=doc.activeElement;
 if(!input?.matches?.('textarea,input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),[contenteditable="true"]')||input.disabled||input.readOnly||!input.isConnected)return;
 // Never scroll an obscured parent editor while a child modal is active.
 const dialog=input.closest?.('dialog');
 if(dialog&&!dialog.matches(':modal'))return;
 let editHeight=Infinity;
 for(let host=input.parentElement;host&&host!==doc.body;host=host.parentElement){
  const css=win.getComputedStyle(host);
  if(!/(auto|scroll)/.test(css.overflowY))continue;
  const box=host.getBoundingClientRect(),header=host.querySelector(':scope > .sheet-top,:scope > .picker-header');
  const head=header?.getBoundingClientRect(),upper=Math.max(top,box.top,head?.bottom??box.top)+12,lower=Math.min(top+height,box.bottom)-16;
  if(input.tagName==='TEXTAREA'&&input.style&&lower>upper){
   const available=Math.min(editHeight,Math.max(1,Math.floor(lower-upper)));editHeight=available;
   input.dataset.focusHeight='true';input.style.setProperty('--focus-edit-height',available+'px');
  }
  const delta=focusScrollDelta(input.getBoundingClientRect(),upper,lower);
  if(Math.abs(delta)>1){
   const before=host.scrollTop;host.scrollTop+=delta;
   // At the end of a short form, scrollIntoView has no room to lift a low field.
   // Reserve only the measured missing space, never an assumed keyboard size.
   const remaining=delta-(host.scrollTop-before);
   if(remaining>1&&host.style&&host.dataset){host.dataset.focusSpace='true';const prior=parseFloat(host.style.getPropertyValue('--focus-scroll-space'))||0;host.style.setProperty('--focus-scroll-space',Math.min(height,prior+remaining+Math.max(0,box.bottom-input.getBoundingClientRect().bottom)+20)+'px');host.scrollTop+=remaining+20;}
  }
 }
}

// Keep one non-scrolling frame. Only #page-scroll owns long-page scrolling.
// VisualViewport accounts for a keyboard/panning without reading any input.
export function installViewportLayout(win=window,doc=document){
 const viewport=win.visualViewport,style=doc.documentElement.style;
 let frame=null,last='',disposed=false,settleTimers=[],focusTimer=null,focusGeometry='';
 const editing=()=>doc.activeElement?.matches?.('textarea,input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),[contenteditable=true]');
 const clearHeights=()=>doc.querySelectorAll?.('[data-focus-height]').forEach(input=>{if(input!==doc.activeElement||!editing()){delete input.dataset.focusHeight;input.style.removeProperty('--focus-edit-height');}});
 const clearSpace=()=>doc.querySelectorAll?.('[data-focus-space]').forEach(host=>{delete host.dataset.focusSpace;host.style.removeProperty('--focus-scroll-space');});
 function watchFocus(){if(disposed)return;clearHeights();win.clearTimeout(focusTimer);focusTimer=null;if(doc.hidden)return;if(editing()){const geometry=[viewport?.height,viewport?.offsetTop,viewport?.scale,win.innerHeight].join(':');if(geometry!==focusGeometry){focusGeometry=geometry;schedule();}focusTimer=win.setTimeout(watchFocus,120);}else{focusGeometry='';clearSpace();}}
 function update(){
  frame=null;if(disposed)return;
  const layout=Math.max(doc.documentElement.clientHeight,win.innerHeight||0);
  // Pinch zoom keeps the unzoomed layout; do not shrink/reflow the app under it.
  if(viewport&&Math.abs((viewport.scale||1)-1)>.01)return;
  const height=viewport?.height??layout;
  if(!Number.isFinite(height)||height<=0||!layout)return;
  const visible=Math.min(height,layout),top=Math.max(0,Math.min(viewport?.offsetTop||0,layout-visible));
  const bottom=Math.max(0,layout-visible-top),next=[visible,top,bottom].map(n=>Math.round(n*100)/100).join(':');
  if(next!==last){last=next;
  style.setProperty('--app-viewport-height',visible+'px');
  style.setProperty('--app-viewport-top',top+'px');
  style.setProperty('--app-viewport-bottom',bottom+'px');}
  revealFocusedControl(win,doc,top,visible);
 }
 const schedule=()=>{if(!disposed&&frame===null)frame=win.requestAnimationFrame(update);};
 // Safari can dispatch orientation/resize before VisualViewport has settled.
 // One RAF may still see the old height or keyboard offset, with no final event.
 // Re-read for a bounded period; never reload the page or recreate its forms.
 const clearSettling=()=>{settleTimers.forEach(id=>win.clearTimeout(id));settleTimers=[];};
 const settle=()=>{if(disposed)return;clearSettling();schedule();settleTimers=[60,180,360,720].map(delay=>win.setTimeout(schedule,delay));};
 const visible=()=>{if(doc.hidden){win.clearTimeout(focusTimer);focusTimer=null;clearSettling();if(frame!==null){win.cancelAnimationFrame(frame);frame=null;}}else{settle();watchFocus();}};
 const targets=[[win,'resize',settle],[win,'orientationchange',settle],[win.screen?.orientation,'change',settle],[win,'pageshow',settle],[viewport,'resize',settle],[viewport,'scroll',schedule],[doc,'visibilitychange',visible],[doc,'focusin',settle],[doc,'input',schedule],[doc,'compositionend',settle],[doc,'focusin',watchFocus],[doc,'focusout',()=>{win.setTimeout(watchFocus,0);}],[viewport,'scrollend',settle],[win,'scroll',settle]];
 targets.forEach(([target,event,handler])=>target?.addEventListener(event,handler,{passive:true}));update();
 return {dispose(){disposed=true;clearSettling();win.clearTimeout(focusTimer);clearSpace();doc.querySelectorAll?.('[data-focus-height]').forEach(input=>{delete input.dataset.focusHeight;input.style.removeProperty('--focus-edit-height');});if(frame!==null)win.cancelAnimationFrame(frame);targets.forEach(([target,event,handler])=>target?.removeEventListener(event,handler));['height','top','bottom'].forEach(key=>style.removeProperty('--app-viewport-'+key));}};
}

// Press follows the finger/key; release can reverse immediately from its current pose.
export function installButtonFeedback(doc=document){
 const media=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Map(),released=new WeakMap();let pressed=null;
 const reduced=()=>media.matches||doc.body.classList.contains('reduce-motion');
 function animate(button,down){if(!button?.isConnected||button.disabled||reduced())return;const from=getComputedStyle(button).transform;animations.get(button)?.cancel();const a=button.animate([{transform:from==='none'?'translate3d(0,0,0) scale(1)':from},{transform:down?'translate3d(0,.6px,0) scale(.985)':'translate3d(0,0,0) scale(1)'}],{duration:down?90:180,easing:ease,fill:down?'forwards':'none'});animations.set(button,a);a.finished.catch(()=>{}).finally(()=>{if(animations.get(button)===a&&!down)animations.delete(button);});}
 const eligible=target=>{const b=target.closest?.('button');return b&&!b.disabled&&!b.closest('.tabbar')?b:null;};
 function release(){if(!pressed)return;const b=pressed;pressed=null;const hadFeedback=animations.has(b);if(hadFeedback)released.set(b,performance.now());if(b.isConnected&&hadFeedback)animate(b,false);else{animations.get(b)?.cancel();animations.delete(b);}}
 const pointer=event=>{if(!event.isPrimary||event.button!==0)return;release();pressed=eligible(event.target);if(pressed)animate(pressed,true);};
 const key=event=>{if(!['Enter',' '].includes(event.key)||event.repeat)return;release();pressed=eligible(event.target);if(pressed)animate(pressed,true);};
 const keyup=event=>{if(['Enter',' '].includes(event.key))release();};
 const click=event=>{const b=eligible(event.target);if(!b||reduced()||performance.now()-(released.get(b)??-1000)<250)return;animate(b,true);queueMicrotask(()=>{released.set(b,performance.now());animate(b,false);});};
 const cancel=()=>{pressed=null;for(const a of animations.values())a.cancel();animations.clear();};
 const changed=()=>{if(reduced()||doc.hidden)cancel();};const observer=new MutationObserver(changed);observer.observe(doc.body,{attributes:true,attributeFilter:['class']});media.addEventListener('change',changed);doc.addEventListener('visibilitychange',changed);
 doc.addEventListener('pointerdown',pointer,true);doc.addEventListener('pointerup',release,true);doc.addEventListener('pointercancel',release,true);doc.addEventListener('keydown',key,true);doc.addEventListener('keyup',keyup,true);doc.addEventListener('click',click,true);
 return {cancel,dispose(){cancel();observer.disconnect();media.removeEventListener('change',changed);doc.removeEventListener('visibilitychange',changed);for(const[n,f]of[['pointerdown',pointer],['pointerup',release],['pointercancel',release],['keydown',key],['keyup',keyup],['click',click]])doc.removeEventListener(n,f,true);}};
}

// Small local transition controller; opening a new form invalidates pending close work.
export function createModalController(dialog,{fallback=()=>document.querySelector('#main')}={}){
 let sequence=0,closing=false,timer=null,returnFocus=null,scrollY=0;
 const reduced=()=>document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stop=()=>{clearTimeout(timer);timer=null;dialog.getAnimations().forEach(a=>a.cancel());};
 function show(content){const wasOpen=dialog.open;sequence++;stop();closing=false;dialog.inert=false;dialog.classList.remove('is-closing');if(!wasOpen){returnFocus=document.activeElement;scrollY=window.scrollY;}dialog.innerHTML=content;document.body.classList.add('modal-open');if(!wasOpen)dialog.showModal();dialog.scrollTop=0;if(!reduced())dialog.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:150,easing:'cubic-bezier(.2,.7,.2,1)'});}
 function close({immediate=false}={}){if(closing&&!immediate)return;const token=++sequence;stop();closing=true;dialog.classList.add('is-closing');dialog.inert=true;const finish=()=>{if(token!==sequence)return;stop();dialog.close();dialog.innerHTML='';dialog.inert=false;dialog.classList.remove('is-closing');closing=false;document.body.classList.remove('modal-open');window.scrollTo({top:scrollY,behavior:'instant'});const target=returnFocus?.isConnected&&!dialog.contains(returnFocus)?returnFocus:fallback();target?.focus?.({preventScroll:true});};if(!dialog.open||immediate||reduced()){finish();return;}const animation=dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(7px)'}],{duration:120,easing:'ease-in',fill:'forwards'});animation.finished.then(finish).catch(()=>{});timer=setTimeout(finish,160);}
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),onMotion=()=>{if(reduced()){if(closing)close({immediate:true});else stop();}};motion.addEventListener?.('change',onMotion);
 return {show,close,cancelMotion:onMotion,dispose(){sequence++;stop();motion.removeEventListener?.('change',onMotion);if(dialog.open)dialog.close();dialog.inert=false;document.body.classList.remove('modal-open');}};
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

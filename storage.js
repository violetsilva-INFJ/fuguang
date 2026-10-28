import {validateRecord, mergeRecords, MAX_RECORDS, assertBackupCapacity} from './core.js';
let db;
const changeChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('fuguang-record-changes'):null;
const notifyChange=()=>changeChannel?.postMessage({type:'records-changed'});
export function openStorage() {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open('fuguang-private-v1', 2);
    req.onupgradeneeded = () => {
      if(!req.result.objectStoreNames.contains('records')) {
        const store = req.result.createObjectStore('records', {keyPath:'id'});
        store.createIndex('dailyDate', 'dailyKey', {unique:true});
      }
    };
    req.onsuccess = () => { db = req.result; db.onversionchange = () => db.close(); resolve(); };
    req.onerror = () => reject(new Error('本机存储暂时不可用。请使用普通浏览模式，并允许网站保存数据。'));
    req.onblocked = () => reject(new Error('请先关闭其他浮光标签页，再重新打开。'));
  });
}
const persisted = r => r.type === 'daily' ? {...r,dailyKey:r.localDate} : r;
export function allRecords() {
  return new Promise((resolve,reject)=> {
    const tx=db.transaction('records','readonly'), req=tx.objectStore('records').getAll();
    req.onsuccess=()=> { try { resolve(req.result.map(validateRecord)); } catch { reject(new Error('本机记录格式异常，已停止写入。请保留此浏览器数据并联系开发者。')); } };
    req.onerror=()=>reject(new Error('读取本机记录失败'));
  });
}
export function saveRecord(record, previousUpdatedAt = null) {
  const r=validateRecord(record);
  return new Promise((resolve,reject)=> {
    const tx=db.transaction('records','readwrite'), store=tx.objectStore('records'); let failure;
    const req=store.getAll();
    req.onsuccess=()=> {
      try {
        const all=req.result.map(validateRecord), previous=all.find(x=>x.id===r.id);
        if (previousUpdatedAt && (!previous || previous.updatedAt !== previousUpdatedAt)) { failure='这条记录已在其他页面更新，请关闭编辑后重新打开。'; tx.abort(); return; }
        if (!previous && all.length >= MAX_RECORDS) { failure='本机记录已到上限，请先导出备份。'; tx.abort(); return; }
        const next=[...all.filter(x=>x.id!==r.id),r];assertBackupCapacity(next);
        if(r.type==='daily'&&((r.medicationStatus==='none'&&all.some(x=>x.type==='medication'&&x.localDate===r.localDate))||(r.caffeineStatus==='none'&&all.some(x=>x.type==='caffeine'&&x.localDate===r.localDate))))throw new Error('这一天已有用药或咖啡因记录，请核对“确认没有”的选择。');
        store.put(persisted(r));
      } catch(e) {failure=e.message||'保存未成功，当前内容仍保留。';tx.abort();}
    };
    tx.oncomplete=()=>{notifyChange();resolve();};
    tx.onabort=tx.onerror=()=>reject(new Error(failure || (tx.error?.name==='ConstraintError' ? '这一天已有每日记录，请从拾记中打开修改。' : '保存未成功。请检查设备空间，并保留当前填写内容。')));
  });
}
export function deleteRecord(record) {
  return new Promise((resolve,reject)=> {
    const tx=db.transaction('records','readwrite'), store=tx.objectStore('records'); let stale=false;
    const req=store.get(record.id); req.onsuccess=()=> {
      if (!req.result || req.result.updatedAt !== record.updatedAt) { stale=true; tx.abort(); } else store.delete(record.id);
    };
    tx.oncomplete=()=>{notifyChange();resolve();}; tx.onabort=tx.onerror=()=>reject(new Error(stale?'记录已变化，请重新打开后再删除。':'删除失败，原记录仍被保留。'));
  });
}
export function importRecords(incoming) {
  return new Promise((resolve,reject)=> {
    const tx=db.transaction('records','readwrite'), store=tx.objectStore('records'); let result, failure;
    const req=store.getAll(); req.onsuccess=()=> {
      try {
        const existing=req.result.map(validateRecord); result=mergeRecords(existing,incoming);
        const ids=new Set(existing.map(r=>r.id));
        for (const r of result.records) if (!ids.has(r.id)) store.add(persisted(r));
      } catch(e) { failure=e.message; tx.abort(); }
    };
    tx.oncomplete=()=>{notifyChange();resolve(result);}; tx.onabort=tx.onerror=()=>reject(new Error(failure || '导入未成功，本机记录没有改变。'));
  });
}

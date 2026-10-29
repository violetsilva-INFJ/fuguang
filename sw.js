const PREFIX='fuguang-shell-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'b720ce4f5ac5';
const ASSETS=['./','./index.html','./styles.css','./app.js','./core.js','./storage.js','./narrative.js','./ai.js','./analysis.js','./analysis-worker.js','./analysis-client.js','./analysis-view.js','./scale-analysis.js','./scale-view.js','./structured-entry.js','./recent-drafts.js','./modal-controller.js','./weather.js','./weather-view.js','./weather.css','./grain.svg','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate', event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX) && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || event.request.method!=='GET') return;
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached || fetch(event.request)));
});

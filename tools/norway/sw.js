/* Norway, by the numbers — offline cache.
   Precaches the page shell; caches Wikipedia photographs and
   summaries at runtime so the page reads with no signal. */
const SHELL='norway-shell-v1';
const RUNTIME='norway-runtime';
const CORE=['./','./index.html'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(
    ks.filter(k=>k!==SHELL&&k!==RUNTIME).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET') return;
  const u=new URL(r.url);
  const sameOrigin=u.origin===location.origin;

  if(sameOrigin && r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{
      const copy=res.clone();
      caches.open(SHELL).then(c=>c.put('./index.html',copy));
      return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  if(sameOrigin){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
      const copy=res.clone(); caches.open(SHELL).then(c=>c.put(r,copy)); return res;
    })));
    return;
  }
  // Wikipedia summaries, Commons images, Google Fonts — cache first, then network.
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    const copy=res.clone();
    caches.open(RUNTIME).then(c=>c.put(r,copy));
    return res;
  }).catch(()=>hit)));
});

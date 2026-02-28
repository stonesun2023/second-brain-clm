const CACHE = 'clm-v1';
const ASSETS = ['/'];
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS))
));
self.addEventListener('fetch', e => {
  // 跳过非 GET 请求和 chrome-extension 请求
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;
  
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

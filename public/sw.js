const CACHE_NAME = 'kj-cache-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/list.html',
  '/add-event.html',
  '/event-detail.html',
  '/event-detail-standalone.html',
  '/members.html',
  '/member-detail.html',
  '/profile.html',
  '/management.html',
  '/financial-upload.html',
  '/financial-preview.html',
  '/invite-share.html',
  '/open-external.html',
  '/month-events-standalone.html',
  '/css/style.css',
  '/js/auth.js',
  '/js/calendar.js',
  '/js/list.js',
  '/js/add-event.js',
  '/js/event-detail.js',
  '/js/members.js',
  '/js/member-detail.js',
  '/js/profile.js',
  '/js/management.js',
  '/js/financial-upload.js',
  '/js/cacheService.js',
  '/js/share-dialog.js',
  '/js/datePicker.js',
  '/js/timePicker.js',
  '/js/scroll-restore.js',
  '/js/eruda-loader.js',
  '/images/logo.png'
];

// Install：預快取靜態資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate：清除舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch：Cache-first（API 呼叫除外）
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API 呼叫直接走網路，不快取
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(response => {
        // 只快取成功的回應
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});

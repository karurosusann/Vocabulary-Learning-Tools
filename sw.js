const CACHE_NAME = 'csvocab-v2.2.4';
const ASSETS_TO_PRECACHE = [
  './',
  './index.html'
];

// キャッシュしないドメイン（外部API等）
const NO_CACHE_DOMAINS = [
  'accounts.google.com',
  'www.googleapis.com',
  'apis.google.com',
  'oauth2.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// install: 基本アセットをプリキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// activate: 古いキャッシュを削除し、即座にクライアントを制御
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// fetch: リクエスト種別に応じた戦略
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. 外部APIドメインへのリクエスト → キャッシュせず直接ネットワーク
  if (NO_CACHE_DOMAINS.some(d => url.hostname.includes(d))) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 2. ナビゲーション（HTMLページ）→ Network-First
  if (e.request.mode === 'navigate' || 
      (e.request.method === 'GET' && e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3. その他の静的リソース → Cache-First（オフライン対応）
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});

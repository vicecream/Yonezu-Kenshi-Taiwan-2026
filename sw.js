/* 米津玄師台北指南離線快取。更新內容時同步調整版本，讓裝置取得新資料。 */
const CACHE_VERSION = "v3.0.3";
const CACHE_NAME    = `yonezu-guide-${CACHE_VERSION}`;

/* Vite production builds include the entry, split lyrics/readings, and CSS
   images so opening a song for the first time also works offline. */
const VITE_BUILD_ASSETS = [];

/* 預快取目前活動的程式、PWA 圖示、官方海報與座位圖。 */
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./images/ghost-poster.jpg",
  "./images/taipei-seat-map.jpg",
  "./images/ghost-poster-mobile.jpg",
  ...VITE_BUILD_ASSETS
];

/* The route-loaded Noto Sans JP CSS and woff2 files are cached at runtime. */
const RUNTIME_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE.map(url =>
      cache.add(new Request(url, { cache: "reload" })).catch(() => {
        /* 單一檔案失敗不阻止其他內容完成快取。 */
      })
    ));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => (k.startsWith("yonezu-guide-")) && k !== CACHE_NAME)
          .map(k => caches.delete(k))          // 只清理本指南的舊版本快取
    );
    await self.clients.claim();
  })());
});

/* 頁面要求的額外本地內容依序快取；已快取或下載失敗的檔案略過。 */
async function cacheUrls(urls){
  const cache = await caches.open(CACHE_NAME);
  for (const url of urls){
    try {
      if (await cache.match(url)) continue;
      const res = await fetch(url, { cache: "no-cache" });
      if (res && res.ok) await cache.put(url, res.clone());
    } catch (e) { /* 略過本次失敗的檔案。 */ }
  }
}

/* 套用新版本或接收頁面的快取要求。 */
self.addEventListener("message", (event) => {
  const d = event.data;
  if (!d) return;
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  if (d.type === "CACHE_URLS" && Array.isArray(d.urls)) event.waitUntil(cacheUrls(d.urls));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* 僅處理同源資產與日文字型，不攔截 YouTube 及其他外部網站。 */
  const sameOrigin = url.origin === self.location.origin;
  const isFontHost = RUNTIME_HOSTS.includes(url.hostname);
  if (!sameOrigin && !isFontHost) return;

  /* 導覽優先連線取得新頁面，離線時回傳已快取的首頁。 */
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cache  = await caches.open(CACHE_NAME);
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }

  /* 靜態資產優先讀取版本快取，減少現場重複下載；內容變更須同步升版。 */
  const isStatic = /\.(js|css|woff2?|ttf|otf|jpe?g|png|gif|webp|svg|ico)$/i.test(url.pathname);

  event.respondWith((async () => {
    const cache  = await caches.open(CACHE_NAME);
    // Precache requests and module requests can have different Origin headers.
    // These same-origin static files have identical bodies; Vary: Origin must
    // not prevent an installed app from loading its JS/CSS offline.
    const cached = await cache.match(req, { ignoreVary: sameOrigin });

    if (isStatic && cached) return cached;

    const network = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    return cached || (await network) || Response.error();
  })());
});

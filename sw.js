// Network first, so every push shows up on the next open; the cache is only a fallback for offline.
const CACHE = 'pathlink-proto-202611101534';
const CORE = [
  './',
  './index.html',
  './jobs.html',
  './job.html',
  './job-apply.html',
  './add.html',
  './job-filter.html',
  './applications.html',
  './application.html',
  './profile.html',
  './seeker-plan.html',
  './auto-apply.html',
  './post-job.html',
  './company.html',
  './applicants.html',
  './applicant.html',
  './company-profile.html',
  './company-plans.html',
  './search.html',
  './search-results.html',
  './freelance-filter.html',
  './consult-filter.html',
  './course-filter.html',
  './orders-filter.html',
  './splash.html',
  './app.js',
  './styles.css',
  './manifest.webmanifest',
  './favicon.svg',
  './ds/pathlink/tokens.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './fonts/thmanyahsans-Regular.otf',
  './fonts/thmanyahsans-Medium.otf',
  './fonts/thmanyahsans-Bold.otf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
        )
      )
  );
});
// Network first, so every push shows up on the next open; the cache is only a fallback for offline.
const CACHE = 'pathlink-proto-202611121423';
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
  './consult.html',
  './consult-detail.html',
  './consult-book.html',
  './consult-pay.html',
  './consult-booked.html',
  './bookings.html',
  './booking.html',
  './reschedule.html',
  './session.html',
  './rate-session.html',
  './consultant-profile.html',
  './consultant.html',
  './add-consult.html',
  './availability.html',
  './freelance.html',
  './service.html',
  './service-checkout.html',
  './post-project.html',
  './my-projects.html',
  './project-offers.html',
  './accept-offer.html',
  './free-orders.html',
  './free-order.html',
  './request-revision.html',
  './order-chat.html',
  './rate-freelancer.html',
  './freelancer-profile.html',
  './freelancer.html',
  './add-service.html',
  './projects.html',
  './project.html',
  './submit-offer.html',
  './my-offers.html',
  './freelancer-order.html',
  './deliver.html',
  './account.html',
  './new-profile.html',
  './new-consultant.html',
  './new-trainer.html',
  './new-freelancer.html',
  './freelancer-pending.html',
  './freelancer-resubmitted.html',
  './need-approval.html',
  './courses.html',
  './coursera.html',
  './course.html',
  './course-checkout.html',
  './my-courses.html',
  './course-player.html',
  './rate-course.html',
  './trainer-pending.html',
  './trainer.html',
  './add-course.html',
  './course-content.html',
  './course-sales.html',
  './messages.html',
  './inquiry.html',
  './onboarding.html',
  './sign-in.html',
  './sign-up.html',
  './complete-profile.html',
  './verify.html',
  './forgot-password.html',
  './new-password.html',
  './login-gate.html',
  './splash.html',
  './app.js',
  './styles.css',
  './manifest.webmanifest',
  './favicon.png',
  './brand/logo-mark.png',
  './brand/logo-app.png',
  './brand/logo-symbol.png',
  './ds/pathlink/tokens.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './fonts/thmanyahsans-Regular.otf',
  './fonts/thmanyahsans-Medium.otf',
  './fonts/thmanyahsans-Bold.otf',
  './img/branding.jpg',
  './img/coffee-brand.jpg',
  './img/design-system.jpg',
  './img/excel-data.jpg',
  './img/figma.jpg',
  './img/flower-app.jpg',
  './img/interview.jpg',
  './img/landing-page.jpg',
  './img/lesson-video.jpg',
  './img/logo.jpg',
  './img/m1.jpg',
  './img/m2.jpg',
  './img/m3.jpg',
  './img/m4.jpg',
  './img/m5.jpg',
  './img/m6.jpg',
  './img/social-posts.jpg',
  './img/ui-design.jpg',
  './img/ux-research.jpg',
  './img/w1.jpg',
  './img/w2.jpg',
  './img/w3.jpg',
  './img/w4.jpg',
  './img/w5.jpg',
  './img/w6.jpg',
  './img/writing.jpg',
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
# Builds the static, installable (PWA) Path Link prototype from the design-canvas files.
# Everything in the repo root except fonts/, brand/ and scripts/ is GENERATED: change this script (or proto-app.js), never the output.
# brand/ holds the client's logo (from pathlink.com.sa): logo-mark.png (transparent, for UI) and logo-full.png (full-bleed, for app icons).
#   -Src : folder holding the canvas files (project/ of the "Path Link — Home" canvas, as saved by an artifact read)
#   -Out : the repo root (defaults to the folder above scripts/)
param([Parameter(Mandatory = $true)][string]$Src, [string]$Out = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false
$read = { param($p) [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) }

# canvas artboard -> prototype page (links between artboards are rewritten to these names)
$pages = @(
  @('HomeV3.dc.html',    'index.html',     'Path Link · الرئيسية'),
  @('JobsList.dc.html',  'jobs.html',      'Path Link · الوظائف'),
  @('JobDetail.dc.html', 'job.html',       'Path Link · تفاصيل الوظيفة'),
  @('JobApply.dc.html',  'job-apply.html', 'Path Link · تأكيد التقديم'),
  @('AddSheet.dc.html',  'add.html',       'Path Link · ماذا تريد أن تنشر'),
  @('JobFilter.dc.html',         'job-filter.html',      'Path Link · فلترة الوظائف'),
  @('MyApplications.dc.html',    'applications.html',    'Path Link · طلباتي'),
  @('ApplicationDetail.dc.html', 'application.html',     'Path Link · تفاصيل الطلب'),
  @('SeekerProfile.dc.html',     'profile.html',         'Path Link · الملف المهني'),
  @('SeekerPlan.dc.html',        'seeker-plan.html',     'Path Link · باقة الباحث عن عمل'),
  @('AutoApply.dc.html',         'auto-apply.html',      'Path Link · التقديم التلقائي'),
  @('PostJob.dc.html',           'post-job.html',        'Path Link · نشر وظيفة'),
  @('CompanyJobs.dc.html',       'company.html',         'Path Link · لوحة الشركة'),
  @('Applicants.dc.html',        'applicants.html',      'Path Link · المتقدمون'),
  @('ApplicantDetail.dc.html',   'applicant.html',       'Path Link · تفاصيل المتقدم'),
  @('CompanyProfile.dc.html',    'company-profile.html', 'Path Link · ملف الشركة'),
  @('CompanyPlans.dc.html',      'company-plans.html',   'Path Link · باقات الشركات'),
  @('Search.dc.html',            'search.html',          'Path Link · البحث'),
  @('SearchResults.dc.html',     'search-results.html',  'Path Link · نتائج البحث'),
  @('FreelanceFilter.dc.html',   'freelance-filter.html','Path Link · فلترة العمل الحر'),
  @('ConsultFilter.dc.html',     'consult-filter.html',  'Path Link · فلترة الاستشارات'),
  @('CourseFilter.dc.html',      'course-filter.html',   'Path Link · فلترة الكورسات'),
  @('OrdersFilter.dc.html',      'orders-filter.html',   'Path Link · فلترة الطلبات'),
  @('ConsultList.dc.html',       'consult.html',         'Path Link · الاستشارات'),
  @('ConsultDetail.dc.html',     'consult-detail.html',  'Path Link · تفاصيل الاستشارة'),
  @('ConsultBook.dc.html',       'consult-book.html',    'Path Link · اختيار الموعد'),
  @('ConsultPay.dc.html',        'consult-pay.html',     'Path Link · الدفع'),
  @('ConsultBooked.dc.html',     'consult-booked.html',  'Path Link · تم تأكيد الحجز'),
  @('MyBookings.dc.html',        'bookings.html',        'Path Link · حجوزات الاستشارات'),
  @('BookingDetail.dc.html',     'booking.html',         'Path Link · تفاصيل الحجز'),
  @('Reschedule.dc.html',        'reschedule.html',      'Path Link · طلب إعادة جدولة'),
  @('SessionCall.dc.html',       'session.html',         'Path Link · الجلسة'),
  @('RateSession.dc.html',       'rate-session.html',    'Path Link · تقييم الجلسة'),
  @('ConsultantProfile.dc.html', 'consultant-profile.html','Path Link · ملف المستشار'),
  @('ConsultantDash.dc.html',    'consultant.html',      'Path Link · لوحة المستشار'),
  @('AddConsult.dc.html',        'add-consult.html',     'Path Link · إضافة استشارة'),
  @('Availability.dc.html',      'availability.html',    'Path Link · جدول الإتاحة'),
  @('FreelanceHome.dc.html',     'freelance.html',       'Path Link · العمل الحر'),
  @('ServiceDetail.dc.html',     'service.html',         'Path Link · تفاصيل الخدمة'),
  @('ServiceCheckout.dc.html',   'service-checkout.html','Path Link · ملخص الطلب'),
  @('PostProject.dc.html',       'post-project.html',    'Path Link · نشر مشروع'),
  @('MyProjects.dc.html',        'my-projects.html',     'Path Link · مشاريعي'),
  @('ProjectOffers.dc.html',     'project-offers.html',  'Path Link · العروض المستلمة'),
  @('AcceptOffer.dc.html',       'accept-offer.html',    'Path Link · قبول العرض'),
  @('FreeOrders.dc.html',        'free-orders.html',     'Path Link · طلبات العمل الحر'),
  @('FreeOrderDetail.dc.html',   'free-order.html',      'Path Link · تفاصيل الطلب'),
  @('RequestRevision.dc.html',   'request-revision.html','Path Link · طلب تعديل'),
  @('OrderChat.dc.html',         'order-chat.html',      'Path Link · محادثة الطلب'),
  @('RateFreelancer.dc.html',    'rate-freelancer.html', 'Path Link · تقييم المستقل'),
  @('FreelancerProfile.dc.html', 'freelancer-profile.html','Path Link · ملف المستقل'),
  @('FreelancerDash.dc.html',    'freelancer.html',      'Path Link · لوحة المستقل'),
  @('AddService.dc.html',        'add-service.html',     'Path Link · نشر خدمة'),
  @('ProjectsBrowse.dc.html',    'projects.html',        'Path Link · المشاريع المفتوحة'),
  @('ProjectDetail.dc.html',     'project.html',         'Path Link · تفاصيل المشروع'),
  @('SubmitOffer.dc.html',       'submit-offer.html',    'Path Link · تقديم عرض'),
  @('MyOffers.dc.html',          'my-offers.html',       'Path Link · عروضي'),
  @('FreelancerOrder.dc.html',   'freelancer-order.html','Path Link · طلب للتنفيذ'),
  @('DeliverWork.dc.html',       'deliver.html',         'Path Link · تسليم العمل'),
  @('Account.dc.html',           'account.html',         'Path Link · حسابي'),
  @('ChooseProfile.dc.html',     'new-profile.html',     'Path Link · ملف مهني جديد'),
  @('CreateConsultant.dc.html',  'new-consultant.html',  'Path Link · ملف المستشار'),
  @('CreateTrainer.dc.html',     'new-trainer.html',     'Path Link · ملف المدرب')
)
# uploaded canvas fonts -> repo fonts/
$blobs = @{
  '22b0fac2bfa57f68c29fd0f0e3e8ea32' = 'fonts/thmanyahsans-Regular.otf'
  'f159786dc815520d31546578e8670ffb' = 'fonts/thmanyahsans-Medium.otf'
  'd38dc1bd5c239bc8523bcbace2a6da52' = 'fonts/thmanyahsans-Bold.otf'
  '4c8f4b27ec9b8de47115478eb5c392d8' = 'brand/logo-mark.png'
}
# first-frame values for the canvas's live {{holes}}; proto-app.js drives the behaviour
$tplDefaults = @{
  savedBorder = '1.5px solid #6C5CE7'; uploadBorder = '1px solid #E8EBEF'
  savedRing = '6px solid #6C5CE7'; uploadRing = '1.5px solid #C5CDD6'
}

foreach ($f in 'Regular', 'Medium', 'Bold') {
  if (-not (Test-Path (Join-Path $Out "fonts\thmanyahsans-$f.otf"))) { throw "fonts\thmanyahsans-$f.otf missing in $Out" }
}
foreach ($f in 'logo-mark.png', 'logo-full.png') {
  if (-not (Test-Path (Join-Path $Out "brand\$f"))) { throw "brand\$f missing in $Out" }
}
New-Item -ItemType Directory -Force (Join-Path $Out 'ds\pathlink') | Out-Null
Copy-Item (Join-Path $Src 'ds\pathlink\tokens.css') (Join-Path $Out 'ds\pathlink\tokens.css') -Force

$head = @'
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F9FAFB">
<title>__TITLE__</title>
<link rel="icon" href="favicon.png" type="image/png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Path Link">
<script>
(function () {
  // ?app=1 is the installed app's start_url; remember it for the session so later pages keep the app layout
  var app = /[?&]app=1/.test(location.search);
  try { if (app) sessionStorage.setItem('pl-app', '1'); else app = sessionStorage.getItem('pl-app') === '1'; } catch (e) {}
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true || app;
  if (standalone) document.documentElement.classList.add('standalone');
  // home goes through the splash once per session (before anything paints, so there is no flash)
  var file = location.pathname.split('/').pop() || 'index.html';
  var seen = false; try { seen = sessionStorage.getItem('pl-intro-seen') === 'true'; } catch (e) {}
  if (file === 'index.html' && !seen && !/[?&]skip/.test(location.search)) {
    try { sessionStorage.setItem('pl-intro-seen', 'true'); } catch (e) {}
    location.replace('splash.html' + (standalone ? '?app=1' : ''));
  }
})();
</script>
<link rel="stylesheet" href="ds/pathlink/tokens.css">
<link rel="stylesheet" href="styles.css">
'@
$tail = @'
<script src="app.js"></script>
<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
</script>
'@

foreach ($pg in $pages) {
  $doc = & $read (Join-Path $Src $pg[0])
  foreach ($k in $blobs.Keys) { $doc = $doc.Replace('/_blob/' + $k, $blobs[$k]) }
  if ($doc -match '/_blob/') { throw "unmapped upload left in $($pg[0])" }
  foreach ($p2 in $pages) { $doc = $doc.Replace('href="' + $p2[0] + '"', 'href="' + $(if ($p2[1] -eq 'index.html') { './?skip=1' } else { $p2[1] }) + '"') }
  if ($doc -match 'href="[^"]+\.dc\.html"') { throw "link to an artboard that is not in the prototype: $($Matches[0]) in $($pg[0])" }
  # sc-if branches become plain blocks the prototype script switches; the first one shows
  $doc = [regex]::Replace($doc, '<sc-if value="\{\{(\w+)\}\}"[^>]*>', { param($m) '<div data-step="' + $m.Groups[1].Value + '">' })
  $doc = $doc.Replace('</sc-if>', '</div>')
  # a sheet's artboard shows its parent page underneath on the canvas; in the prototype the sheet opens over the live page instead
  $doc = [regex]::Replace($doc, '(?s)\s*<div data-sheet-backdrop[^>]*>.*?</dc-import></div>', '')
  if ($doc -match '<dc-import') { throw "unhandled dc-import in $($pg[0])" }
  $doc = [regex]::Replace($doc, '\s+(on[A-Za-z]+|ref)="\{\{\w+\}\}"', '')
  $doc = [regex]::Replace($doc, '\{\{(\w+)\}\}', { param($m) if ($tplDefaults.ContainsKey($m.Groups[1].Value)) { $tplDefaults[$m.Groups[1].Value] } else { '' } })
  $helmet = [regex]::Match($doc, '(?s)<helmet>(.*?)</helmet>').Groups[1].Value.Trim()
  $body = [regex]::Match($doc, '(?s)</helmet>(.*?)</x-dc>').Groups[1].Value.Trim()
  if (-not $body) { throw "no screen found in $($pg[0])" }
  # the screen fills the phone: tag the root, let fixed 844px scroll areas follow the screen height
  $body = [regex]::Replace($body, '^<div style="', '<div class="screen" style="')
  $body = [regex]::Replace($body, '^<div class="scr"', '<div class="scr screen"')
  if ($body -notmatch '^<div class="[^"]*\bscreen\b') { throw "screen root not tagged in $($pg[0])" }
  $body = $body.Replace('height: 844px; overflow-y: auto', 'height: 100%; overflow-y: auto')
  # every step after the first starts hidden
  $seen = 0
  $body = [regex]::Replace($body, '<div data-step="(\w+)">', { param($m) $script:seen++; if ($script:seen -gt 1) { '<div data-step="' + $m.Groups[1].Value + '" class="proto-hide">' } else { $m.Value } })
  $html = "<!doctype html>`n<html lang=`"ar`" dir=`"rtl`">`n<head>`n" + $head.Replace('__TITLE__', $pg[2]) + "`n" + $helmet + "`n</head>`n<body>`n<main class=`"stage`">`n<div class=`"device`">`n" + $body + "`n</div>`n</main>`n" + $tail + "</body>`n</html>`n"
  [IO.File]::WriteAllText((Join-Path $Out $pg[1]), $html, $utf8)
}

# splash (first open of the session and every launch from the home-screen icon); passes on its own after 1.8s
$splash = @'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
__HEAD__
<style>
body{margin:0}
.splash{position:relative;width:390px;height:844px;overflow:hidden;background:#04070B radial-gradient(60% 40% at 50% 42%, rgba(108,92,231,0.45), rgba(241,104,255,0.12) 55%, rgba(4,7,11,0) 80%);color:#FFFFFF;font-family:'Thmanyah Sans',Tajawal,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;direction:rtl;cursor:pointer}
.splash .ring{position:absolute;border-radius:999px;border:1px solid rgba(255,255,255,0.08)}
.splash .mark{width:104px;height:104px;display:block;filter:drop-shadow(0 12px 30px rgba(241,104,255,0.35));animation:pl-pop .6s cubic-bezier(.34,1.56,.64,1) both}
.splash .name{font-size:30px;font-weight:700;direction:ltr;animation:pl-up .5s .2s ease both}
.splash .name b{background:linear-gradient(100deg,#CBB9FF 0%,#6C5CE7 45%,#F168FF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.splash .tag{font-size:14px;color:rgba(248,250,252,0.65);animation:pl-up .5s .35s ease both}
@keyframes pl-pop{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
@keyframes pl-up{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.splash *{animation:none!important}}
</style>
</head>
<body>
<main class="stage">
<div class="device">
<div class="screen splash" role="button" aria-label="متابعة">
<span class="ring" aria-hidden="true" style="width:520px;height:520px;top:-180px;left:-200px"></span>
<span class="ring" aria-hidden="true" style="width:300px;height:300px;top:-60px;left:-80px"></span>
<span class="ring" aria-hidden="true" style="width:420px;height:420px;bottom:-200px;right:-180px"></span>
<img class="mark" src="brand/logo-mark.png" alt="" width="104" height="104">
<span class="name">Path <b>Link</b></span>
<span class="tag">كل خدماتك المهنية في مكان واحد</span>
</div>
</div>
</main>
__TAIL__</body>
</html>
'@
$splash = $splash.Replace('__HEAD__', $head.Replace('__TITLE__', 'Path Link').Replace('<meta name="theme-color" content="#F9FAFB">', '<meta name="theme-color" content="#04070B">')).Replace('__TAIL__', $tail)
$splash = $splash.Replace('<style>', "<style>`n@font-face{font-family:`"Thmanyah Sans`";src:url(`"fonts/thmanyahsans-Bold.otf`") format(`"opentype`");font-weight:700;font-display:swap}")
[IO.File]::WriteAllText((Join-Path $Out 'splash.html'), $splash, $utf8)

$css = @'
* { -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; background: #E4E8EE; }
.stage { min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 32px 16px; box-sizing: border-box; }
.device { position: relative; width: 390px; height: 844px; border-radius: 48px; overflow: hidden; background: #F9FAFB; box-shadow: 0 0 0 10px #15202B, 0 30px 80px rgba(21,32,43,0.30); }
/* phones in the browser: edge to edge */
@media (max-width: 500px), (max-height: 700px) and (max-width: 900px) {
  html, body { background: #F9FAFB; }
  .stage { padding: 0; display: block; }
  .device { width: 100vw; height: 100vh; height: 100dvh; border-radius: 0; box-shadow: none; }
  .device > .screen { width: 100vw !important; height: 100vh !important; height: 100dvh !important; }
}
/* installed app (opened from the home-screen icon): full width and the full screen height, never a fixed 844 */
html.standalone, html.standalone body { background: #F9FAFB; height: 100%; overflow: hidden; }
html.standalone .stage { padding: 0; display: block; min-height: 0; height: 100%; }
html.standalone .device { width: 100%; height: 100%; border-radius: 0; box-shadow: none; }
html.standalone .device > .screen { width: 100% !important; height: 100% !important; }
@media (display-mode: standalone) {
  html, body { background: #F9FAFB; height: 100%; overflow: hidden; }
  .stage { padding: 0; display: block; min-height: 0; height: 100%; }
  .device { width: 100%; height: 100%; border-radius: 0; box-shadow: none; }
  .device > .screen { width: 100% !important; height: 100% !important; }
}
/* a drawn status bar, if a screen ever gets one, is hidden in the installed app (the phone shows the real one) */
html.standalone .proto-statusbar { display: none !important; }
.proto-toast { position: absolute; left: 50%; bottom: 100px; transform: translate(-50%, 12px); max-width: calc(100% - 48px); box-sizing: border-box; padding: 10px 18px; border-radius: 999px; background: #15202B; color: #FFFFFF; font: 500 13px/20px "Thmanyah Sans", Tajawal, system-ui, sans-serif; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease; z-index: 40; }
.proto-toast.show { opacity: 1; transform: translate(-50%, 0); }
.proto-hide { display: none !important; }
.proto-pop-in { animation: proto-pop-in .35s ease both; }
@keyframes proto-pop-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.proto-sheet-host { position: absolute; inset: 0; z-index: 30; }
.rail { scroll-snap-type: x mandatory; scroll-padding-inline: 16px; cursor: grab; overscroll-behavior-x: contain; }
.rail.dragging { scroll-snap-type: none; cursor: grabbing; }
.rail > a { scroll-snap-align: start; -webkit-user-drag: none; user-select: none; }
@media (prefers-reduced-motion: reduce) { .proto-toast, .proto-pop-in { transition: none; animation: none; } }
'@

$manifest = @'
{
  "name": "Path Link · خدماتك المهنية",
  "short_name": "Path Link",
  "description": "نموذج تفاعلي لتطبيق Path Link: الوظائف والعمل الحر والاستشارات والكورسات",
  "lang": "ar",
  "dir": "rtl",
  "id": "./",
  "start_url": "./?app=1",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#04070B",
  "theme_color": "#F9FAFB",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
'@

# PNG icons (iOS ignores SVG touch icons) from the client's logo; favicon from the transparent mark
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force (Join-Path $Out 'icons') | Out-Null
$logoFull = [System.Drawing.Image]::FromFile((Join-Path $Out 'brand\logo-full.png'))
$logoMark = [System.Drawing.Image]::FromFile((Join-Path $Out 'brand\logo-mark.png'))
function Save-Icon([int]$size, [float]$ratio, [string]$file) {
  # ratio 1 = the full-bleed logo; below 1 = logo inside the maskable safe zone on the same gradient
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point 0, $size), ([System.Drawing.ColorTranslator]::FromHtml('#5836C4')), ([System.Drawing.ColorTranslator]::FromHtml('#F687FF'))
  $g.FillRectangle($bg, 0, 0, $size, $size)
  $d = [int][Math]::Round($size * $ratio); $o = [int](($size - $d) / 2)
  $g.DrawImage($logoFull, $o, $o, $d, $d)
  $g.Dispose()
  $bmp.Save((Join-Path $Out "icons\$file"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Save-Icon 180 1.0 'apple-touch-icon.png'   # full square, iOS rounds it itself
Save-Icon 192 1.0 'icon-192.png'
Save-Icon 512 1.0 'icon-512.png'
Save-Icon 512 0.78 'icon-512-maskable.png'  # logo inside the 80% safe zone
$fav = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($fav)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($logoMark, 0, 0, 64, 64); $g.Dispose()
$fav.Save((Join-Path $Out 'favicon.png'), [System.Drawing.Imaging.ImageFormat]::Png); $fav.Dispose()
$logoFull.Dispose(); $logoMark.Dispose()
if (Test-Path (Join-Path $Out 'favicon.svg')) { Remove-Item (Join-Path $Out 'favicon.svg') }
# service worker: network first (every push shows on the next open), cache only as the offline fallback
$files = @('./', './index.html') + ($pages | Where-Object { $_[1] -ne 'index.html' } | ForEach-Object { './' + $_[1] }) + @(
  './splash.html', './app.js', './styles.css', './manifest.webmanifest', './favicon.png', './brand/logo-mark.png', './ds/pathlink/tokens.css',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
  './fonts/thmanyahsans-Regular.otf', './fonts/thmanyahsans-Medium.otf', './fonts/thmanyahsans-Bold.otf')
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmm')
$sw = @"
// Network first, so every push shows up on the next open; the cache is only a fallback for offline.
const CACHE = 'pathlink-proto-$stamp';
const CORE = [
$(($files | ForEach-Object { "  '$_'," }) -join "`n")
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
"@

$readme = @'
# Path Link · prototype

Static, clickable, installable (PWA) prototype of the Path Link app (Arabic, RTL), exported from the design canvas.

- `index.html` — home (services, current activity)
- `jobs.html`, `job.html`, `job-apply.html` — the jobs flow: list, details, apply sheet with success
- `add.html` — the (+) sheet
- `splash.html` — shown on the first open of a session and on every launch of the installed app; passes on its own

Install: open the site on a phone, then "Add to Home Screen". The installed app starts at `./?app=1`, opens full screen and works offline (network first, cache as fallback).

Everything except `fonts/`, `brand/` and `scripts/` is generated. To change it, edit `scripts/build-prototype.ps1` or `scripts/proto-app.js` and rebuild:

    powershell -File scripts/build-prototype.ps1 -Src <canvas project folder>

No build step on the host: Vercel serves the folder as-is. Thmanyah Sans licence for client use still to be confirmed.
'@

[IO.File]::WriteAllText((Join-Path $Out 'styles.css'), $css, $utf8)
Copy-Item (Join-Path $PSScriptRoot 'proto-app.js') (Join-Path $Out 'app.js') -Force
[IO.File]::WriteAllText((Join-Path $Out 'manifest.webmanifest'), $manifest, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'sw.js'), $sw, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'README.md'), $readme, $utf8)
Get-ChildItem $Out -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' } | Select-Object @{n = 'file'; e = { $_.FullName.Substring($Out.Length + 1) } }, Length | Format-Table -AutoSize | Out-String

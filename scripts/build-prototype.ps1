# Builds the static, installable (PWA) Path Link prototype from the design-canvas files.
# Everything in the repo root except fonts/ and scripts/ is GENERATED: change this script (or proto-app.js), never the output.
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
  @('AddSheet.dc.html',  'add.html',       'Path Link · ماذا تريد أن تنشر')
)
# uploaded canvas fonts -> repo fonts/
$blobs = @{
  '22b0fac2bfa57f68c29fd0f0e3e8ea32' = 'fonts/thmanyahsans-Regular.otf'
  'f159786dc815520d31546578e8670ffb' = 'fonts/thmanyahsans-Medium.otf'
  'd38dc1bd5c239bc8523bcbace2a6da52' = 'fonts/thmanyahsans-Bold.otf'
}
# first-frame values for the canvas's live {{holes}}; proto-app.js drives the behaviour
$tplDefaults = @{
  savedBorder = '1.5px solid #1F6FEB'; uploadBorder = '1px solid #E8EBEF'
  savedRing = '6px solid #1F6FEB'; uploadRing = '1.5px solid #C5CDD6'
}

foreach ($f in 'Regular', 'Medium', 'Bold') {
  if (-not (Test-Path (Join-Path $Out "fonts\thmanyahsans-$f.otf"))) { throw "fonts\thmanyahsans-$f.otf missing in $Out" }
}
New-Item -ItemType Directory -Force (Join-Path $Out 'ds\pathlink') | Out-Null
Copy-Item (Join-Path $Src 'ds\pathlink\tokens.css') (Join-Path $Out 'ds\pathlink\tokens.css') -Force

$head = @'
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F9FAFB">
<title>__TITLE__</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
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
  $doc = [regex]::Replace($doc, '\s+(on[A-Za-z]+|ref)="\{\{\w+\}\}"', '')
  $doc = [regex]::Replace($doc, '\{\{(\w+)\}\}', { param($m) if ($tplDefaults.ContainsKey($m.Groups[1].Value)) { $tplDefaults[$m.Groups[1].Value] } else { '' } })
  $helmet = [regex]::Match($doc, '(?s)<helmet>(.*?)</helmet>').Groups[1].Value.Trim()
  $body = [regex]::Match($doc, '(?s)</helmet>(.*?)</x-dc>').Groups[1].Value.Trim()
  if (-not $body) { throw "no screen found in $($pg[0])" }
  # the screen fills the phone: tag the root, let fixed 844px scroll areas follow the screen height
  $body = [regex]::Replace($body, '^<div style="', '<div class="screen" style="')
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
.splash{position:relative;width:390px;height:844px;overflow:hidden;background:#1F6FEB;color:#FFFFFF;font-family:'Thmanyah Sans',Tajawal,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;direction:rtl;cursor:pointer}
.splash .ring{position:absolute;border-radius:999px;border:1px solid rgba(255,255,255,0.16)}
.splash .mark{width:88px;height:88px;border-radius:999px;background:#FFFFFF;color:#1F6FEB;display:flex;align-items:center;justify-content:center;animation:pl-pop .6s cubic-bezier(.34,1.56,.64,1) both}
.splash .name{font-size:28px;font-weight:700;direction:ltr;animation:pl-up .5s .2s ease both}
.splash .tag{font-size:14px;color:rgba(255,255,255,0.85);animation:pl-up .5s .35s ease both}
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
<span class="mark"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.47 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16.97 15h3c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2Z" stroke-width="1.5"/><path d="M12 5h2.68c1.85 0 2.71 2.29 1.32 3.51L8.01 15.5C6.62 16.71 7.48 19 9.32 19H12" stroke-width="1.5"/></svg></span>
<span class="name">Path Link</span>
<span class="tag">كل خدماتك المهنية في مكان واحد</span>
</div>
</div>
</main>
__TAIL__</body>
</html>
'@
$splash = $splash.Replace('__HEAD__', $head.Replace('__TITLE__', 'Path Link').Replace('<meta name="theme-color" content="#F9FAFB">', '<meta name="theme-color" content="#1F6FEB">')).Replace('__TAIL__', $tail)
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
  "background_color": "#1F6FEB",
  "theme_color": "#F9FAFB",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
'@

# PNG icons (iOS ignores SVG touch icons): blue square, white route mark (the placeholder logo)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force (Join-Path $Out 'icons') | Out-Null
function Save-Icon([int]$size, [float]$markRatio, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#1F6FEB'))
  # the mark spans x 1.97..21.97 and y 2..22 on its 24-unit grid: a 20-unit box
  $s = ($size * $markRatio) / 20.0
  $ox = ($size - 20.0 * $s) / 2 - 1.97 * $s
  $oy = ($size - 20.0 * $s) / 2 - 2.0 * $s
  $pt = { param($x, $y) New-Object System.Drawing.PointF (($ox + $x * $s), ($oy + $y * $s)) }
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (1.9 * $s)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawEllipse($pen, ($ox + 1.97 * $s), ($oy + 2.0 * $s), (7.0 * $s), (7.0 * $s))
  $rect = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 2.0 * $s; $x0 = $ox + 14.97 * $s; $y0 = $oy + 15.0 * $s; $w = 7.0 * $s
  $rect.AddArc($x0, $y0, 2 * $r, 2 * $r, 180, 90); $rect.AddArc($x0 + $w - 2 * $r, $y0, 2 * $r, 2 * $r, 270, 90)
  $rect.AddArc($x0 + $w - 2 * $r, $y0 + $w - 2 * $r, 2 * $r, 2 * $r, 0, 90); $rect.AddArc($x0, $y0 + $w - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $rect.CloseFigure()
  $g.DrawPath($pen, $rect)
  $route = New-Object System.Drawing.Drawing2D.GraphicsPath
  $route.AddLine((& $pt 12 5), (& $pt 14.68 5))
  $route.AddBezier((& $pt 14.68 5), (& $pt 16.53 5), (& $pt 17.39 7.29), (& $pt 16 8.51))
  $route.AddLine((& $pt 16 8.51), (& $pt 8.01 15.5))
  $route.AddBezier((& $pt 8.01 15.5), (& $pt 6.62 16.71), (& $pt 7.48 19), (& $pt 9.32 19))
  $route.AddLine((& $pt 9.32 19), (& $pt 12 19))
  $g.DrawPath($pen, $route)
  $g.Dispose()
  $bmp.Save((Join-Path $Out "icons\$file"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Save-Icon 180 0.56 'apple-touch-icon.png'   # full square, iOS rounds it itself
Save-Icon 192 0.56 'icon-192.png'
Save-Icon 512 0.56 'icon-512.png'
Save-Icon 512 0.40 'icon-512-maskable.png'  # mark inside the 80% safe zone

$favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1F6FEB"/><g transform="translate(8 8) scale(2)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.47 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16.97 15h3c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2Z"/><path d="M12 5h2.68c1.85 0 2.71 2.29 1.32 3.51L8.01 15.5C6.62 16.71 7.48 19 9.32 19H12"/></g></svg>'

# service worker: network first (every push shows on the next open), cache only as the offline fallback
$files = @('./', './index.html') + ($pages | Where-Object { $_[1] -ne 'index.html' } | ForEach-Object { './' + $_[1] }) + @(
  './splash.html', './app.js', './styles.css', './manifest.webmanifest', './favicon.svg', './ds/pathlink/tokens.css',
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

Everything except `fonts/` and `scripts/` is generated. To change it, edit `scripts/build-prototype.ps1` or `scripts/proto-app.js` and rebuild:

    powershell -File scripts/build-prototype.ps1 -Src <canvas project folder>

No build step on the host: Vercel serves the folder as-is. Thmanyah Sans licence for client use still to be confirmed.
'@

[IO.File]::WriteAllText((Join-Path $Out 'styles.css'), $css, $utf8)
Copy-Item (Join-Path $PSScriptRoot 'proto-app.js') (Join-Path $Out 'app.js') -Force
[IO.File]::WriteAllText((Join-Path $Out 'favicon.svg'), $favicon, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'manifest.webmanifest'), $manifest, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'sw.js'), $sw, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'README.md'), $readme, $utf8)
Get-ChildItem $Out -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' } | Select-Object @{n = 'file'; e = { $_.FullName.Substring($Out.Length + 1) } }, Length | Format-Table -AutoSize | Out-String

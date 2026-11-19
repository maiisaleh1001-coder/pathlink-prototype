# Builds the static, installable (PWA) Path Link prototype from the design-canvas files.
# Everything in the repo root except fonts/, brand/, img/ and scripts/ is GENERATED: change this script (or proto-app.js), never the output.
# img/ holds the stock photos used on the canvas (scripts/canvas-images.json maps each canvas upload to its file).
# brand/ holds the client's logo (from pathlink.com.sa): logo-mark.png (original, see-through symbol), logo-app.png (clean: gradient square, white symbol, transparent outside; splash + favicon) and logo-full.png (full-bleed, for app icons).
#   -Src : folder holding the canvas files (project/ of the "Path Link — Home" canvas, as saved by an artifact read)
#   -Out : the repo root (defaults to the folder above scripts/)
param([Parameter(Mandatory = $true)][string]$Src, [string]$Out = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding $false
$read = { param($p) [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) }

# canvas artboard -> prototype page (links between artboards are rewritten to these names)
$pages = @(
  # dark redesign (V2) — separate pages so the light version stays intact
  @('DarkSplash.dc.html',        'dark.html',            'Path Link · الداكن'),
  @('DarkWelcome.dc.html',       'dark-welcome.html',    'Path Link · أهلًا بك'),
  @('DarkHome.dc.html',          'dark-home.html',       'Path Link · الرئيسية'),
  @('DarkHome2.dc.html',         'dark-home2.html',      'Path Link · الرئيسية'),
  @('DarkHome4.dc.html',         'dark-home4.html',      'Path Link · الرئيسية'),
  @('DarkJobApply.dc.html',      'dark-job-apply.html',  'Path Link · تأكيد التقديم'),
  @('DarkJobFilter.dc.html',     'dark-job-filter.html', 'Path Link · فلترة الوظائف'),
  @('DarkMyApplications.dc.html','dark-applications.html','Path Link · طلباتي'),
  @('DarkApplicationDetail.dc.html','dark-application.html','Path Link · تفاصيل الطلب'),
  @('DarkSeekerProfile.dc.html', 'dark-seeker-profile.html','Path Link · ملف الباحث عن عمل'),
  @('DarkSeekerPlan.dc.html',    'dark-seeker-plan.html','Path Link · باقة الباحث عن عمل'),
  @('DarkAutoApply.dc.html',     'dark-auto-apply.html', 'Path Link · التقديم التلقائي'),
  @('DarkPostJob.dc.html',       'dark-post-job.html',   'Path Link · نشر وظيفة'),
  @('DarkCompanyJobs.dc.html',   'dark-company.html',    'Path Link · لوحة الشركة'),
  @('DarkApplicants.dc.html',    'dark-applicants.html', 'Path Link · المتقدمون'),
  @('DarkApplicantDetail.dc.html','dark-applicant.html', 'Path Link · ملف المتقدم'),
  @('DarkCompanyProfile.dc.html','dark-company-profile.html','Path Link · ملف الشركة'),
  @('DarkCreateCompany.dc.html', 'dark-create-company.html','Path Link · حساب شركة جديد'),
  @('DarkCompanyPickPlan.dc.html','dark-company-choose-plan.html','Path Link · اختيار الباقة'),
  @('DarkCompanyPlans.dc.html',  'dark-company-plans.html','Path Link · باقات الشركات'),
  @('DarkServiceDetail.dc.html', 'dark-service.html',    'Path Link · تفاصيل الخدمة'),
  @('DarkServiceCheckout.dc.html','dark-service-checkout.html','Path Link · ملخص الطلب'),
  @('DarkPostProject.dc.html',   'dark-post-project.html','Path Link · نشر مشروع'),
  @('DarkMyProjects.dc.html',    'dark-my-projects.html','Path Link · مشاريعي'),
  @('DarkProjectOffers.dc.html', 'dark-project-offers.html','Path Link · عروض المشروع'),
  @('DarkAcceptOffer.dc.html',   'dark-accept-offer.html','Path Link · قبول العرض'),
  @('DarkFreeOrders.dc.html',    'dark-free-orders.html','Path Link · طلباتي'),
  @('DarkFreeOrderDetail.dc.html','dark-free-order.html','Path Link · تفاصيل الطلب'),
  @('DarkRequestRevision.dc.html','dark-request-revision.html','Path Link · طلب تعديل'),
  @('DarkOrderChat.dc.html',     'dark-order-chat.html', 'Path Link · محادثة الطلب'),
  @('DarkRateFreelancer.dc.html','dark-rate-freelancer.html','Path Link · تقييم المستقل'),
  @('DarkFreelancerProfile.dc.html','dark-freelancer-profile.html','Path Link · ملف المستقل'),
  @('DarkFreelancerDash.dc.html','dark-freelancer.html', 'Path Link · لوحة المستقل'),
  @('DarkAddService.dc.html',    'dark-add-service.html','Path Link · إضافة خدمة'),
  @('DarkProjectsBrowse.dc.html','dark-projects.html',   'Path Link · المشاريع المفتوحة'),
  @('DarkProjectDetail.dc.html', 'dark-project.html',    'Path Link · تفاصيل المشروع'),
  @('DarkSubmitOffer.dc.html',   'dark-submit-offer.html','Path Link · تقديم عرض'),
  @('DarkMyOffers.dc.html',      'dark-my-offers.html',  'Path Link · عروضي'),
  @('DarkFreelancerOrder.dc.html','dark-freelancer-order.html','Path Link · طلب التنفيذ'),
  @('DarkDeliverWork.dc.html',   'dark-deliver.html',    'Path Link · تسليم العمل'),
  @('DarkCreateFreelancer.dc.html','dark-new-freelancer.html','Path Link · ملف مستقل جديد'),
  @('DarkFreelancerPending.dc.html','dark-freelancer-pending.html','Path Link · ملفك قيد المراجعة'),
  @('DarkFreelancerResubmitted.dc.html','dark-freelancer-resubmitted.html','Path Link · أُعيد إرسال ملفك'),
  @('DarkNeedApproval.dc.html',  'dark-need-approval.html','Path Link · يلزم الاعتماد'),
  @('DarkMessages.dc.html',      'dark-messages.html',   'Path Link · الرسائل'),
  @('DarkInquiryChat.dc.html',   'dark-inquiry.html',    'Path Link · استفسار'),
  @('DarkFreelanceFilter.dc.html','dark-freelance-filter.html','Path Link · فلترة الخدمات'),
  @('DarkConsultDetail.dc.html', 'dark-consult-detail.html','Path Link · تفاصيل الاستشارة'),
  @('DarkConsultBook.dc.html',   'dark-consult-book.html','Path Link · اختر الموعد'),
  @('DarkConsultPay.dc.html',    'dark-consult-pay.html','Path Link · الدفع'),
  @('DarkConsultBooked.dc.html', 'dark-consult-booked.html','Path Link · تم تأكيد الحجز'),
  @('DarkMyBookings.dc.html',    'dark-bookings.html',   'Path Link · حجوزاتي'),
  @('DarkBookingDetail.dc.html', 'dark-booking.html',    'Path Link · تفاصيل الحجز'),
  @('DarkReschedule.dc.html',    'dark-reschedule.html', 'Path Link · إعادة الجدولة'),
  @('DarkSessionCall.dc.html',   'dark-session.html',    'Path Link · الجلسة'),
  @('DarkRateSession.dc.html',   'dark-rate-session.html','Path Link · تقييم الجلسة'),
  @('DarkConsultantProfile.dc.html','dark-consultant-profile.html','Path Link · ملف المستشار'),
  @('DarkConsultantDash.dc.html','dark-consultant.html', 'Path Link · لوحة المستشار'),
  @('DarkAddConsult.dc.html',    'dark-add-consult.html','Path Link · إضافة استشارة'),
  @('DarkAvailability.dc.html',  'dark-availability.html','Path Link · أوقات التوفر'),
  @('DarkConsultFilter.dc.html', 'dark-consult-filter.html','Path Link · فلترة الاستشارات'),
  @('DarkChooseProfile.dc.html', 'dark-new-profile.html','Path Link · ملف مهني جديد'),
  @('DarkCreateConsultant.dc.html','dark-new-consultant.html','Path Link · ملف مستشار جديد'),
  @('DarkHome4b.dc.html',        'dark-home4b.html',     'Path Link · الرئيسية'),
  @('DarkFreelance.dc.html',     'dark-freelance.html',  'Path Link · العمل الحر'),
  @('DarkConsult.dc.html',       'dark-consult.html',    'Path Link · الاستشارات'),
  @('DarkCourses.dc.html',       'dark-courses.html',    'Path Link · الكورسات'),
  @('DarkWelcome3.dc.html',      'dark-welcome3.html',   'Path Link · أهلًا بك'),
  @('DarkJobs3.dc.html',         'dark-jobs3.html',      'Path Link · الوظائف'),
  @('DarkJob3.dc.html',          'dark-job3.html',       'Path Link · تفاصيل الوظيفة'),
  @('DarkJobs.dc.html',          'dark-jobs.html',       'Path Link · الوظائف'),
  @('DarkJob.dc.html',           'dark-job.html',        'Path Link · تفاصيل الوظيفة'),
  @('DarkAccount.dc.html',       'dark-account.html',    'Path Link · حسابي'),
  @('DarkEarnings.dc.html',      'dark-earnings.html',   'Path Link · مستحقاتي'),
  @('DarkCourseraSheet.dc.html', 'dark-coursera.html',   'Path Link · كورس من Coursera'),
  @('DarkCourseDetail.dc.html',  'dark-course.html',     'Path Link · تفاصيل الكورس'),
  @('DarkCourseCheckout.dc.html','dark-course-checkout.html','Path Link · شراء الكورس'),
  @('DarkMyCourses.dc.html',     'dark-my-courses.html', 'Path Link · كورساتي'),
  @('DarkCoursePlayer.dc.html',  'dark-course-player.html','Path Link · مشاهدة الدرس'),
  @('DarkRateCourse.dc.html',    'dark-rate-course.html','Path Link · تقييم الكورس'),
  @('DarkCourseFilter.dc.html',  'dark-course-filter.html','Path Link · فلترة الكورسات'),
  @('DarkCreateTrainer.dc.html', 'dark-new-trainer.html','Path Link · ملف المدرب'),
  @('DarkTrainerPending.dc.html','dark-trainer-pending.html','Path Link · ملف المدرب قيد المراجعة'),
  @('DarkTrainerDash.dc.html',   'dark-trainer.html',    'Path Link · لوحة المدرب'),
  @('DarkAddCourse.dc.html',     'dark-add-course.html', 'Path Link · كورس جديد'),
  @('DarkCourseContent.dc.html', 'dark-course-content.html','Path Link · محتوى الكورس'),
  @('DarkCourseSales.dc.html',   'dark-course-sales.html','Path Link · مبيعات الكورسات'),
  @('DarkSearch.dc.html',        'dark-search.html',     'Path Link · البحث'),
  @('DarkSearchResults.dc.html', 'dark-search-results.html','Path Link · نتائج البحث'),
  @('DarkSearchJobs.dc.html',    'dark-search-jobs.html','Path Link · نتائج الوظائف'),
  @('DarkSearchFreelance.dc.html','dark-search-freelance.html','Path Link · نتائج العمل الحر'),
  @('DarkSearchConsult.dc.html', 'dark-search-consult.html','Path Link · نتائج الاستشارات'),
  @('DarkSearchCourses.dc.html', 'dark-search-courses.html','Path Link · نتائج الكورسات'),
  @('DarkOrdersFilter.dc.html',  'dark-orders-filter.html','Path Link · فلترة الطلبات'),
  @('DarkAddSheet.dc.html',      'dark-add.html',        'Path Link · إضافة'),
  @('DarkEarningDetail.dc.html', 'dark-earning.html',    'Path Link · تفاصيل المستحق'),
  @('DarkSettlements.dc.html',   'dark-settlements.html','Path Link · سجل التسويات'),
  @('DarkSettlementDetail.dc.html','dark-settlement.html','Path Link · تفاصيل التسوية'),
  @('DarkPayoutDetails.dc.html', 'dark-payout.html',     'Path Link · بيانات الاستلام'),
  @('DarkOnboarding.dc.html',    'dark-onboarding.html', 'Path Link · أهلًا بك'),
  @('DarkSignIn.dc.html',        'dark-sign-in.html',    'Path Link · تسجيل الدخول'),
  @('DarkSignUp.dc.html',        'dark-sign-up.html',    'Path Link · إنشاء حساب'),
  @('DarkCompleteProfile.dc.html','dark-complete-profile.html','Path Link · أكمل بياناتك'),
  @('DarkVerifyOtp.dc.html',     'dark-verify.html',     'Path Link · رمز التحقق'),
  @('DarkForgotPassword.dc.html','dark-forgot-password.html','Path Link · نسيت كلمة المرور'),
  @('DarkNewPassword.dc.html',   'dark-new-password.html','Path Link · كلمة مرور جديدة'),
  @('DarkLoginGate.dc.html',     'dark-login-gate.html', 'Path Link · سجّل للمتابعة'),
  @('DarkProfile.dc.html',       'dark-profile.html',    'Path Link · الملف الشخصي'),
  @('DarkEditProfile.dc.html',   'dark-edit-profile.html','Path Link · تعديل الملف الشخصي'),
  @('DarkSettings.dc.html',      'dark-settings.html',   'Path Link · الإعدادات'),
  @('DarkCompanyPage.dc.html',   'dark-company-page.html','Path Link · بروفايل الشركة'),
  @('DarkNotifications.dc.html', 'dark-notifications.html', 'Path Link · الإشعارات'),
  @('DarkSavedJobs.dc.html', 'dark-saved-jobs.html', 'Path Link · الوظائف المحفوظة'),
  @('DarkTerms.dc.html', 'dark-terms.html', 'Path Link · الشروط والأحكام'),
  @('DarkPrivacy.dc.html', 'dark-privacy.html', 'Path Link · سياسة الخصوصية'),
  @('DarkHelpCenter.dc.html', 'dark-help.html', 'Path Link · مركز المساعدة'),
  @('DarkContactSupport.dc.html', 'dark-contact.html', 'Path Link · تواصل معنا'),
  @('DarkReportIssue.dc.html', 'dark-report.html', 'Path Link · الإبلاغ عن مشكلة'),
  @('DarkComplaints.dc.html', 'dark-complaints.html', 'Path Link · البلاغات والشكاوى'),
  @('DarkDevices.dc.html', 'dark-devices.html', 'Path Link · الأجهزة المسجّلة'),
  @('DarkDeleteAccount.dc.html', 'dark-delete-account.html', 'Path Link · حذف الحساب'),
  @('DarkFreelancerPublic.dc.html', 'dark-freelancer-public.html', 'Path Link · ملف المستقلة'),
  @('DarkPortfolio.dc.html', 'dark-portfolio.html', 'Path Link · معرض الأعمال'),
  @('DarkAddPortfolio.dc.html', 'dark-add-portfolio.html', 'Path Link · إضافة نموذج عمل'),
  @('DarkAddExperience.dc.html', 'dark-add-experience.html', 'Path Link · إضافة خبرة أو مؤهل'),
  @('DarkEditSkills.dc.html', 'dark-edit-skills.html', 'Path Link · التخصص والمهارات'),
  @('DarkUploadCv.dc.html', 'dark-upload-cv.html', 'Path Link · السيرة الذاتية'),
  @('DarkAddLesson.dc.html', 'dark-add-lesson.html', 'Path Link · إضافة درس'),
  @('DarkPhotoSheet.dc.html', 'dark-photo-sheet.html', 'Path Link · الصورة الشخصية'),
  @('DarkCitySheet.dc.html', 'dark-city-sheet.html', 'Path Link · المدينة'),
  @('DarkDateSheet.dc.html', 'dark-date-sheet.html', 'Path Link · تاريخ الميلاد'),
  @('DarkPaymentSheet.dc.html', 'dark-payment-sheet.html', 'Path Link · طريقة الدفع'),
  @('DarkAttachSheet.dc.html', 'dark-attach-sheet.html', 'Path Link · إرفاق'),
  @('DarkLanguageSheet.dc.html', 'dark-language-sheet.html', 'Path Link · اللغة'),
  @('DarkAddSectionSheet.dc.html', 'dark-add-section.html', 'Path Link · إضافة قسم'),
  @('DarkProjectMenu.dc.html', 'dark-project-menu.html', 'Path Link · خيارات المشروع'),
  @('DarkFreelancerStatus.dc.html', 'dark-freelancer-status.html', 'Path Link · ملف المستقل'),
  @('DarkConsultantStatus.dc.html', 'dark-consultant-status.html', 'Path Link · ملف المستشار'),
  @('DarkTrainerStatus.dc.html', 'dark-trainer-status.html', 'Path Link · ملف المدرب'),
  @('DarkCompanyStatus.dc.html', 'dark-company-status.html', 'Path Link · ملف الشركة')
)
# light mode of V2: every dark page that has a LiteX board on the canvas gets a lite-* page (dark.html -> lite.html)
$pages += @($pages | Where-Object { $_[0] -like 'Dark*' -and (Test-Path (Join-Path $Src ('Lite' + $_[0].Substring(4)))) } | ForEach-Object {
  , @(('Lite' + $_[0].Substring(4)), ($_[1] -replace '^dark', 'lite'), $_[2])
})
# uploaded canvas fonts -> repo fonts/
$blobs = @{
  '22b0fac2bfa57f68c29fd0f0e3e8ea32' = 'fonts/thmanyahsans-Regular.otf'
  'f159786dc815520d31546578e8670ffb' = 'fonts/thmanyahsans-Medium.otf'
  'd38dc1bd5c239bc8523bcbace2a6da52' = 'fonts/thmanyahsans-Bold.otf'
  '4c8f4b27ec9b8de47115478eb5c392d8' = 'brand/logo-mark.png'
  'ffcc7a5133c629adb1dc4828cf42a761' = 'brand/logo-app.png'
  'c50e23933df4c0582306b2e4d7fc174c' = 'brand/logo-symbol.png'
}
# stock photos uploaded to the canvas (Freepik free licence, attribution in README) -> repo img/
$imgMap = Join-Path $PSScriptRoot 'canvas-images.json'
if (Test-Path $imgMap) {
  (Get-Content $imgMap -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object {
    $blobs[$_.Name] = $_.Value
    if (-not (Test-Path (Join-Path $Out $_.Value))) { throw "$($_.Value) missing in $Out" }
  }
}
# first-frame values for the canvas's live {{holes}}; proto-app.js drives the behaviour
$tplDefaults = @{
  savedBorder = '1.5px solid #6C5CE7'; uploadBorder = '1px solid #E8EBEF'
  savedRing = '6px solid #6C5CE7'; uploadRing = '1.5px solid #C5CDD6'
}

foreach ($f in 'Regular', 'Medium', 'Bold') {
  if (-not (Test-Path (Join-Path $Out "fonts\thmanyahsans-$f.otf"))) { throw "fonts\thmanyahsans-$f.otf missing in $Out" }
}
foreach ($f in 'logo-mark.png', 'logo-full.png', 'logo-app.png', 'logo-symbol.png') {
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
  # the canvas's generic link hover turns button text navy (and sticks after a tap on phones); styles.css has the hover/press feedback instead
  $doc = $doc.Replace('a:hover{color:#0E2A47}', '')
  foreach ($p2 in $pages) {
    $doc = $doc.Replace('href="' + $p2[0] + '"', 'href="' + $(if ($p2[1] -eq 'index.html') { './?skip=1' } else { $p2[1] }) + '"')
    # profile stories (freelancer, trainer): where an approved provider goes
    $doc = $doc.Replace('data-fl-ok="' + $p2[0] + '"', 'data-fl-ok="' + $p2[1] + '"').Replace('data-tr-ok="' + $p2[0] + '"', 'data-tr-ok="' + $p2[1] + '"')
  }
  if ($doc -match 'data-(fl|tr)-ok="[^"]+\.dc\.html"') { throw "story link to an artboard that is not in the prototype: $($Matches[0]) in $($pg[0])" }
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
  $pageHead = $head.Replace('__TITLE__', $pg[2])
  # dark redesign pages: dark status bar and no light page edges around the screen
  if ($pg[1] -like 'dark*') { $pageHead = $pageHead.Replace('<meta name="theme-color" content="#F9FAFB">', '<meta name="theme-color" content="#04070B">') + "`n<style>html,body,.stage,.device{background:#04070B}.scr{overflow:clip!important}</style>" }
  if ($pg[1] -like 'lite*') { $pageHead = $pageHead.Replace('<meta name="theme-color" content="#F9FAFB">', '<meta name="theme-color" content="#F4F5FA">') + "`n<style>html,body,.stage,.device{background:#F4F5FA}.scr{overflow:clip!important}</style>" }
  $html = "<!doctype html>`n<html lang=`"ar`" dir=`"rtl`">`n<head>`n" + $pageHead + "`n" + $helmet + "`n</head>`n<body>`n<main class=`"stage`">`n<div class=`"device`">`n" + $body + "`n</div>`n</main>`n" + $tail + "</body>`n</html>`n"
  [IO.File]::WriteAllText((Join-Path $Out $pg[1]), $html, $utf8)
}

# the site root (and the installed app's start_url ./?app=1): V2 only, in the mode last used on this device (dark the first time).
# A fresh open goes to that mode's splash; ?skip goes straight to its home.
$index = @'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#04070B">
<title>Path Link</title>
<link rel="icon" href="favicon.png" type="image/png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Path Link">
<style>html,body{margin:0;background:#04070B}</style>
<script>
(function () {
  var q = location.search, app = /[?&]app=1/.test(q);
  try { if (app) sessionStorage.setItem('pl-app', '1'); } catch (e) {}
  var m = 'dark'; try { if (localStorage.getItem('pl-mode') === 'lite') m = 'lite'; } catch (e) {}
  location.replace(/[?&]skip/.test(q) ? m + '-home.html' : m + '.html' + (app ? '?app=1' : ''));
})();
</script>
</head>
<body>
<noscript><a href="dark.html">Path Link</a></noscript>
<script>
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
</script>
</body>
</html>
'@
[IO.File]::WriteAllText((Join-Path $Out 'index.html'), $index, $utf8)

$css = @'
* { -webkit-tap-highlight-color: transparent; }
/* touch feedback: phones have no hover, so anything tappable sinks and dims a little while pressed */
.screen a, .screen button, .screen [role="button"], .screen label { transition: transform .12s ease, opacity .12s ease, filter .15s ease; }
.screen a:active, .screen button:active, .screen [role="button"]:active { transform: scale(.97); opacity: .82; }
.screen a.dim:active, .screen a[style*="inset: 0"]:active { transform: none; opacity: 1; }
/* mouse and trackpad: a light hover so the desktop demo feels alive too */
@media (hover: hover) {
  .screen a:hover, .screen button:hover, .screen [role="button"]:hover { filter: brightness(.95); }
  .screen a.dim:hover, .screen a[style*="inset: 0"]:hover { filter: none; }
}
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
  "background_color": "#6C5CE7",
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
$logoMark = [System.Drawing.Image]::FromFile((Join-Path $Out 'brand\logo-app.png'))
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
  './app.js', './styles.css', './manifest.webmanifest', './favicon.png', './brand/logo-mark.png', './brand/logo-app.png', './brand/logo-symbol.png', './ds/pathlink/tokens.css',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
  './fonts/thmanyahsans-Regular.otf', './fonts/thmanyahsans-Medium.otf', './fonts/thmanyahsans-Bold.otf') +
  @(Get-ChildItem (Join-Path $Out 'img') -Filter *.jpg -ErrorAction SilentlyContinue | ForEach-Object { './img/' + $_.Name })
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

- `index.html` — opens V2 (`dark.html` / `lite.html`, the mode last used on the device)
- `dark-*.html` — V2 dark; `lite-*.html` — the same screens in light mode
- `dark.html`, `lite.html` — the splash of each mode; passes on its own to the onboarding

Install: open the site on a phone, then "Add to Home Screen". The installed app starts at `./?app=1`, opens full screen and works offline (network first, cache as fallback).

Everything except `fonts/`, `brand/`, `img/` and `scripts/` is generated. To change it, edit `scripts/build-prototype.ps1` or `scripts/proto-app.js` and rebuild:

    powershell -File scripts/build-prototype.ps1 -Src <canvas project folder>

No build step on the host: Vercel serves the folder as-is. Thmanyah Sans licence for client use still to be confirmed.

Photos in `img/` are Freepik free-licence stock (attribution: Freepik), placeholders for the prototype only.
'@

[IO.File]::WriteAllText((Join-Path $Out 'styles.css'), $css, $utf8)
Copy-Item (Join-Path $PSScriptRoot 'proto-app.js') (Join-Path $Out 'app.js') -Force
[IO.File]::WriteAllText((Join-Path $Out 'manifest.webmanifest'), $manifest, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'sw.js'), $sw, $utf8)
[IO.File]::WriteAllText((Join-Path $Out 'README.md'), $readme, $utf8)
Get-ChildItem $Out -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' } | Select-Object @{n = 'file'; e = { $_.FullName.Substring($Out.Length + 1) } }, Length | Format-Table -AutoSize | Out-String

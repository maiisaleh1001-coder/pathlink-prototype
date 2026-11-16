// Path Link prototype behaviour (prototype only; the design canvas stays untouched).
// Splash on first open, toasts for screens not designed yet, the services rail, job filter chips, the apply sheet.
(function () {
  var screen = document.querySelector('.screen');
  var page = (location.pathname.split('/').pop() || 'index.html') || 'index.html';
  var standalone = document.documentElement.classList.contains('standalone');

  function read(key, fallback) { try { var v = sessionStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  // ---------- splash: once per session (and every cold start of the installed app) ----------
  if (page === 'index.html' && !read('pl-intro-seen', false) && !/[?&]skip/.test(location.search)) {
    write('pl-intro-seen', true);
    location.replace('splash.html' + (standalone || /[?&]app=1/.test(location.search) ? '?app=1' : ''));
    return;
  }
  if (page === 'splash.html') {
    write('pl-intro-seen', true);
    write('pl-fl', 'none'); // every presentation starts the profile stories from the beginning
    write('pl-tr', 'none');
    write('pl-au', 'user');
    // a new session starts at the onboarding (skip → sign in → home); the home page itself skips the splash
    var go = function () { location.replace('onboarding.html'); };
    var t = setTimeout(go, 1800); // passes on its own; a tap skips it
    if (screen) screen.addEventListener('click', function () { clearTimeout(t); go(); });
    return;
  }
  if (page === 'dark.html' || page === 'lite.html') {
    // the V2 splash (dark or its light mode): same fresh start, then its own onboarding
    write('pl-fl', 'none'); write('pl-tr', 'none'); write('pl-au', 'user');
    var v2 = page === 'lite.html' ? 'lite' : 'dark';
    var goDark = function () { location.replace(v2 + '-onboarding.html'); };
    var td = setTimeout(goDark, 1800);
    if (screen) screen.addEventListener('click', function (e) { e.preventDefault(); clearTimeout(td); goDark(); }, true);
    return;
  }

  // iOS Safari only applies :active (the pressed look) when the page listens for touches
  document.addEventListener('touchstart', function () {}, { passive: true });

  // ---------- toast ----------
  var toastEl, toastTimer;
  function toast(msg) {
    if (!screen) return;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'proto-toast'; toastEl.setAttribute('role', 'status'); screen.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // a toast handed over from the previous screen (links with data-toast that navigate)
  var carried = read('pl-toast', '');
  if (carried) { write('pl-toast', ''); setTimeout(function () { toast(carried); }, 250); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-toast]');
    if (!a || !screen || !screen.contains(a)) return;
    if (a.getAttribute('href') === '#') { e.preventDefault(); e.stopImmediatePropagation(); toast(a.getAttribute('data-toast')); }
    else write('pl-toast', a.getAttribute('data-toast'));
  }, true);

  // links to screens that are not designed yet
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (!a || !screen || !screen.contains(a)) return;
    e.preventDefault();
    if (a.hasAttribute('data-chip')) return;
    var label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
    toast(label && label.length <= 24 ? '«' + label + '» قيد التصميم' : 'هذه الشاشة قيد التصميم');
  });

  // ---------- back buttons return to the screen you came from (the link's own target is only the fallback, e.g. a page opened directly) ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[aria-label="رجوع"]');
    if (!a || !screen || !screen.contains(a)) return;
    var cameFromHere = false;
    try { cameFromHere = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch (err) {}
    // after switching dark <-> light the previous screen belongs to the other mode: follow the link (same mode) instead
    var themeOf = function (f) { return (String(f).match(/^(dark|lite)/) || [''])[0]; };
    try { if (cameFromHere && themeOf(fileOf(new URL(document.referrer).pathname.split('/').pop())) !== themeOf(page)) cameFromHere = false; } catch (err) {}
    if (cameFromHere) { e.preventDefault(); history.back(); }
  });
  // the appearance tiles in settings swap the whole app to the other mode without leaving a trail back to the old one
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-theme-tile]');
    if (!a || !screen || !screen.contains(a)) return;
    var to = fileOf(a.getAttribute('href'));
    if (to === page) return;
    e.preventDefault();
    if (a.hasAttribute('data-toast')) write('pl-toast', a.getAttribute('data-toast'));
    write('pl-theme', /^lite/.test(to) ? 'lite' : 'dark');
    location.replace(to);
  }, true);

  // ---------- profile stories: each provider profile's review state lives in the session, so a demo walks every step in order ----------
  // fl = freelancer: none → (create) pending → (admin) rejected → (resubmit) resubmitted → (admin) approved
  // tr = trainer:    none → (create) pending → (admin) approved
  //   data-fl="entry"   goes to the screen for the current state (data-fl-ok overrides it once approved)
  //   data-fl="gate"    keeps its own link once approved, otherwise opens the story's «needs approval» sheet
  //   data-fl-set="x"   moves the story to state x when tapped
  //   data-fl-show="…"  shown only in the listed states (data-fl-display restores a non-default display)
  // the trainer story uses the same attributes with data-tr…
  var STORIES = {
    fl: { route: { none: 'new-freelancer.html', pending: 'freelancer-pending.html', rejected: 'freelancer-profile.html', resubmitted: 'freelancer-resubmitted.html', approved: 'freelancer.html' }, gate: 'need-approval.html' },
    tr: { route: { none: 'new-trainer.html', pending: 'trainer-pending.html', approved: 'trainer.html' }, gate: 'trainer-pending.html' },
    // au = signed in or browsing as a guest: guests get the «سجّل للمتابعة» sheet on apply / order / book / buy
    au: { route: { user: './?skip=1', guest: 'sign-in.html' }, gate: 'login-gate.html', ok: 'user', def: 'user' }
  };
  var DARK_EQ = {
    'new-freelancer.html': 'dark-new-freelancer.html', 'freelancer-pending.html': 'dark-freelancer-pending.html',
    'freelancer-profile.html': 'dark-freelancer-profile.html', 'freelancer-resubmitted.html': 'dark-freelancer-resubmitted.html',
    'freelancer.html': 'dark-freelancer.html', 'need-approval.html': 'dark-need-approval.html',
    'new-trainer.html': 'dark-new-trainer.html', 'trainer-pending.html': 'dark-trainer-pending.html', 'trainer.html': 'dark-trainer.html',
    'login-gate.html': 'dark-login-gate.html', 'sign-in.html': 'dark-sign-in.html', './?skip=1': 'dark-home.html'
  };
  function applyStories(root) {
    Object.keys(STORIES).forEach(function (k) {
      var story = STORIES[k], def = story.def || 'none', st = read('pl-' + k, def);
      if (!story.route[st]) st = def;
      [].forEach.call(root.querySelectorAll('[data-' + k + '-show]'), function (el) {
        var on = (' ' + el.getAttribute('data-' + k + '-show') + ' ').indexOf(' ' + st + ' ') !== -1;
        el.style.display = on ? (el.getAttribute('data-' + k + '-display') || '') : 'none';
      });
      [].forEach.call(root.querySelectorAll('a[data-' + k + ']'), function (a) {
        if (!a.hasAttribute('data-own-href')) a.setAttribute('data-own-href', a.getAttribute('href'));
        var own = a.getAttribute('data-own-href'), ok = a.getAttribute('data-' + k + '-ok');
        var okState = story.ok || 'approved';
        var to = a.getAttribute('data-' + k) === 'gate' ? (st === okState ? own : story.gate) : (st === okState && ok ? ok : story.route[st]);
        // inside the dark version, story steps open their dark screens where they exist
        if (/^dark/.test(page) && DARK_EQ[to]) to = DARK_EQ[to];
        else if (/^lite/.test(page) && DARK_EQ[to]) to = DARK_EQ[to].replace(/^dark/, 'lite');
        a.setAttribute('href', to);
      });
    });
  }
  function storyClicks(root) {
    root.addEventListener('click', function (e) {
      Object.keys(STORIES).forEach(function (k) {
        var a = e.target.closest && e.target.closest('a[data-' + k + '-set]');
        if (a) write('pl-' + k, a.getAttribute('data-' + k + '-set'));
      });
    }, true);
  }
  applyStories(document);
  storyClicks(document);
  // back/forward from the cache keeps the old page: re-read the state when it shows again
  window.addEventListener('pageshow', function (e) { if (e.persisted) applyStories(document); });

  // ---------- shared controls on the designed screens (also run inside a sheet opened over the page) ----------
  // segmented tabs and chip rails (single choice), chip groups (multiple choice), on/off toggles
  function initControls(root) {
  [].forEach.call(root.querySelectorAll('.seg, .rail'), function (group) {
    var items = [].filter.call(group.children, function (c) { return c.matches('.seg > a, a.chip') && c.getAttribute('href') === '#'; });
    if (!items.length) return;
    items.forEach(function (a) {
      a.setAttribute('data-chip', '');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        items.forEach(function (o) { o.classList.toggle('on', o === a); o.setAttribute('aria-pressed', o === a ? 'true' : 'false'); });
      });
    });
  });
  [].forEach.call(root.querySelectorAll('.chips .chip'), function (c) {
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
    c.addEventListener('click', function () { var on = c.classList.toggle('on'); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  });
  [].forEach.call(root.querySelectorAll('.tog'), function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var off = t.classList.toggle('off');
      t.setAttribute('aria-pressed', off ? 'false' : 'true');
      var label = t.getAttribute('aria-label');
      if (!label) toast(off ? 'تم إيقاف التقديم التلقائي' : 'تم تفعيل التقديم التلقائي');
      else toast(off ? 'تم إيقاف «' + label + '»' : 'تم تفعيل «' + label + '»');
    });
  });
  // booking: one day and one time slot at a time (crossed-out ones are taken)
  [].forEach.call(root.querySelectorAll('.days, .slots'), function (group) {
    var items = [].filter.call(group.children, function (c) { return c.matches('.day, .slot'); });
    items.forEach(function (c) {
      if (c.classList.contains('off')) { c.setAttribute('aria-disabled', 'true'); return; }
      c.setAttribute('role', 'button');
      c.setAttribute('tabindex', '0');
      c.addEventListener('click', function () {
        items.forEach(function (o) { o.classList.toggle('on', o === c); });
      });
    });
  });
  }
  initControls(document);

  // ---------- demo status switcher: a dashed «للعرض» box lets the presenter flip a screen through all its statuses ----------
  //   [data-demo-switch] holds chips with data-demo="key"; [data-demo-show="k1 k2"] shows only for those keys
  function initDemo(root) {
    [].forEach.call(root.querySelectorAll('[data-demo-switch]'), function (box) {
      var show = function (k) {
        [].forEach.call(root.querySelectorAll('[data-demo-show]'), function (el) {
          var on = (' ' + el.getAttribute('data-demo-show') + ' ').indexOf(' ' + k + ' ') !== -1;
          el.style.display = on ? (el.getAttribute('data-demo-display') || '') : 'none';
        });
      };
      [].forEach.call(box.querySelectorAll('[data-demo]'), function (c) {
        c.addEventListener('click', function () { show(c.getAttribute('data-demo')); });
      });
      var cur = box.querySelector('[data-demo].on');
      if (cur) show(cur.getAttribute('data-demo'));
    });
  }
  initDemo(document);

  // ---------- chat: typing (or a quick reply) adds your message; the other side "types" and answers once ----------
  [].forEach.call(document.querySelectorAll('[data-chat-log]'), function (log) {
    var input = document.querySelector('[data-chat-input]'), send = document.querySelector('[data-chat-send]');
    var replied = false;
    var now = function () { var d = new Date(), h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' ص' : ' م'); };
    var down = function () { log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' }); };
    var add = function (who, text, tick) {
      var b = document.createElement('div'); b.className = 'bub ' + who + ' proto-pop-in'; b.textContent = text;
      var t = document.createElement('span'); t.className = 't'; t.textContent = now() + (tick ? ' ✓✓' : ''); b.appendChild(t);
      log.appendChild(b); down();
    };
    var post = function (text) {
      text = (text || '').trim();
      if (!text) { toast('اكتب رسالة أولًا'); if (input) input.focus(); return; }
      add('me', text, true);
      if (input) input.value = '';
      if (replied || !send) return;
      replied = true;
      setTimeout(function () {
        var typing = document.createElement('span'); typing.className = 'sysmsg proto-pop-in'; typing.textContent = 'يكتب الآن…';
        log.appendChild(typing); down();
        setTimeout(function () { typing.remove(); add('them', send.getAttribute('data-reply') || 'تمام'); }, 1400);
      }, 600);
    };
    if (send) send.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); post(input && input.value); });
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); post(input.value); } });
    [].forEach.call(document.querySelectorAll('[data-quick]'), function (q) {
      q.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); post(q.getAttribute('data-quick')); });
    });
  });

  // ---------- bottom sheets open over the current page (overlay + slide up), not as a new screen ----------
  var SHEETS = { 'add.html': 1, 'job-filter.html': 1, 'job-apply.html': 1, 'freelance-filter.html': 1, 'consult-filter.html': 1, 'course-filter.html': 1, 'orders-filter.html': 1, 'reschedule.html': 1, 'accept-offer.html': 1, 'request-revision.html': 1, 'need-approval.html': 1, 'coursera.html': 1, 'login-gate.html': 1, 'dark-job-filter.html': 1, 'dark-job-apply.html': 1, 'dark-accept-offer.html': 1, 'dark-request-revision.html': 1, 'dark-need-approval.html': 1, 'dark-freelance-filter.html': 1, 'dark-reschedule.html': 1, 'dark-consult-filter.html': 1, 'dark-course-filter.html': 1, 'dark-coursera.html': 1, 'dark-orders-filter.html': 1, 'dark-add.html': 1, 'dark-login-gate.html': 1 };
  Object.keys(SHEETS).forEach(function (k) { if (/^dark-/.test(k)) SHEETS[k.replace(/^dark-/, 'lite-')] = 1; }); // light mode of V2
  var SHEET_CSS = '.pl-wrap{position:absolute;inset:0;font-family:"Thmanyah Sans",Tajawal,sans-serif;direction:rtl}' +
    '.pl-backdrop{position:absolute;inset:0;background:rgba(14,26,43,.48);opacity:0;transition:opacity .25s ease}' +
    '.pl-sheet{position:absolute;left:0;right:0;bottom:0;max-height:92%;overflow-y:auto;scrollbar-width:none;transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.8,.2,1)}' +
    '.pl-sheet::-webkit-scrollbar{display:none}.pl-sheet>.sheet{position:relative;max-height:none}' +
    '.pl-wrap.open .pl-backdrop{opacity:1}.pl-wrap.open .pl-sheet{transform:none}' +
    '.proto-hide{display:none!important}.proto-pop-in{animation:pl-in .35s ease both}@keyframes pl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.pl-backdrop,.pl-sheet{transition:none}.proto-pop-in{animation:none}}' +
    '.pl-sheet a,.pl-sheet button,.pl-sheet [role="button"]{transition:transform .12s ease,opacity .12s ease,filter .15s ease}' +
    '.pl-sheet a:active,.pl-sheet button:active,.pl-sheet [role="button"]:active{transform:scale(.97);opacity:.82}' +
    '@media (hover:hover){.pl-sheet a:hover,.pl-sheet button:hover,.pl-sheet [role="button"]:hover{filter:brightness(.95)}}';
  var sheetCache = {};
  function fileOf(href) { var f = String(href || '').split('#')[0].split('?')[0].replace(/^\.\//, ''); return f || 'index.html'; }
  function openSheet(file) {
    var got = sheetCache[file] ? Promise.resolve(sheetCache[file]) : fetch(file).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    got.then(function (text) {
      sheetCache[file] = text;
      var doc = new DOMParser().parseFromString(text, 'text/html');
      var dialog = doc.querySelector('[role="dialog"]');
      if (!dialog) { location.href = file; return; }
      var closeBtn = dialog.querySelector('a[aria-label="إغلاق"]');
      var parentOf = closeBtn ? fileOf(closeBtn.getAttribute('href')) : page;
      var host = document.createElement('div');
      host.className = 'proto-sheet-host';
      var root = host.attachShadow({ mode: 'open' });
      var css = [].map.call(doc.querySelectorAll('head style'), function (st) { return st.textContent; }).join('\n');
      root.innerHTML = '<style>' + css + '\n' + SHEET_CSS + '</style><div class="pl-wrap"><div class="pl-backdrop"></div><div class="pl-sheet"></div></div>';
      var wrap = root.querySelector('.pl-wrap');
      root.querySelector('.pl-sheet').appendChild(document.importNode(dialog, true));
      screen.appendChild(host);
      var close = function () { wrap.classList.remove('open'); setTimeout(function () { host.remove(); }, 330); };
      root.addEventListener('click', function (e) {
        if (e.target.classList && e.target.classList.contains('pl-backdrop')) return close();
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        var h = a.getAttribute('href');
        if (h === '#') {
          e.preventDefault();
          if (a.hasAttribute('data-chip')) return;
          if (a.hasAttribute('data-toast')) return toast(a.getAttribute('data-toast'));
          var label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
          toast(label && label.length <= 24 ? '«' + label + '» قيد التصميم' : 'هذه الشاشة قيد التصميم');
          return;
        }
        if (fileOf(h) === page || fileOf(h) === parentOf) { // links back to the page underneath (or the sheet's own parent) close the sheet
          e.preventDefault();
          close();
          if (a.hasAttribute('data-toast')) toast(a.getAttribute('data-toast'));
          else if (/^عرض \d+/.test(a.textContent.trim())) toast('تم تطبيق الفلاتر');
        } else if (a.hasAttribute('data-toast')) write('pl-toast', a.getAttribute('data-toast'));
      });
      initControls(root);
      applyStories(root);
      storyClicks(root);
      if (file === 'job-apply.html') initApply(root);
      host.getBoundingClientRect(); // commit the closed position so the slide-up animates
      setTimeout(function () { wrap.classList.add('open'); }, 20);
    }).catch(function () { location.href = file; });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !screen || !screen.contains(a)) return;
    var f = fileOf(a.getAttribute('href'));
    if (SHEETS[f] && f !== page) { e.preventDefault(); openSheet(f); }
  });

  // ---------- home: the services rail scrolls with drag, wheel and touch, and snaps to a card ----------
  [].forEach.call(document.querySelectorAll('.rail'), function (el) {
    var down = false, moved = false, startX = 0, startLeft = 0;
    el.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollBy({ left: -e.deltaY, behavior: 'smooth' });
    }, { passive: false });
    el.addEventListener('mousedown', function (e) { down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft; });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) { moved = true; el.classList.add('dragging'); }
      if (moved) { e.preventDefault(); el.scrollLeft = startLeft - dx; }
    });
    window.addEventListener('mouseup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      el.classList.remove('dragging');
      var box = el.getBoundingClientRect(), best = null, bestDist = Infinity;
      [].forEach.call(el.children, function (c) {
        if (c.getAttribute('aria-hidden') === 'true') return; // end spacer
        var d = Math.abs(c.getBoundingClientRect().right - (box.right - 16));
        if (d < bestDist) { bestDist = d; best = c; }
      });
      if (best) best.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
    el.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  // ---------- jobs list: filter chips switch on tap ----------
  if (page === 'jobs.html') {
    var chipLabels = ['الكل', 'دوام كامل', 'دوام جزئي', 'عن بُعد', 'تدريب', 'الرياض'];
    var chips = [].filter.call(document.querySelectorAll('a[href="#"]'), function (a) { return chipLabels.indexOf(a.textContent.trim()) !== -1; });
    var paint = function (active) {
      chips.forEach(function (c) {
        var on = c === active;
        c.setAttribute('data-chip', '');
        c.style.background = on ? '#6C5CE7' : '#FFFFFF';
        c.style.color = on ? '#FFFFFF' : '#15202B';
        c.style.border = on ? '0' : '1px solid #E8EBEF';
        c.style.fontWeight = on ? '700' : '400';
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { paint(c); if (c.textContent.trim() !== 'الكل') toast('الفلترة في النموذج للعرض فقط'); }); });
    if (chips.length) paint(chips[0]);
  }

  // ---------- consultation booking: the summary follows the chosen day and time ----------
  if (page === 'consult-book.html') {
    var kvs = document.querySelectorAll('.kv b');
    var slotsLabel = [].filter.call(document.querySelectorAll('.lbl'), function (l) { return /^الأوقات المتاحة/.test(l.textContent); })[0];
    var dayName = function (d) { var n = d.childNodes[0].textContent.trim(); return 'ال' + n + ' ' + d.querySelector('b').textContent + ' نوفمبر'; };
    var plus45 = function (t) {
      var m = t.match(/(\d+):(\d+)\s*([صم])/); if (!m) return t;
      var h = +m[1] % 12 + (m[3] === 'م' ? 12 : 0), mins = h * 60 + +m[2] + 45;
      var eh = Math.floor(mins / 60) % 24, em = mins % 60, ap = eh >= 12 ? 'م' : 'ص';
      return (eh % 12 || 12) + ':' + (em < 10 ? '0' : '') + em + ' ' + ap;
    };
    [].forEach.call(document.querySelectorAll('.day:not(.off)'), function (d) {
      d.addEventListener('click', function () {
        if (kvs[1]) kvs[1].textContent = dayName(d);
        if (slotsLabel) slotsLabel.textContent = 'الأوقات المتاحة · ' + dayName(d);
      });
    });
    [].forEach.call(document.querySelectorAll('.slot:not(.off)'), function (s) {
      s.addEventListener('click', function () { var t = s.textContent.trim(); if (kvs[2]) kvs[2].textContent = t.replace(/\s*[صم]$/, '') + ' – ' + plus45(t); });
    });
  }

  // ---------- search: typing + Enter shows the results screen ----------
  if (/^(dark-|lite-)?search(-results)?\.html$/.test(page)) {
    var q = document.querySelector('input[type="search"]');
    if (q) {
      if (/search\.html$/.test(page) && standalone === false) q.focus({ preventScroll: true });
      q.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (!q.value.trim()) { toast('اكتب كلمة للبحث'); return; }
        location.href = ((page.match(/^(dark|lite)-/) || [''])[0]) + 'search-results.html';
      });
    }
  }

  // ---------- dark onboarding: story slides — the bar fills, then the next slide; tap or swipe moves on ----------
  var onb = document.querySelector('[data-onb]');
  if (onb) {
    var onbSlides = [].slice.call(onb.querySelectorAll('[data-onb-slide]'));
    var onbBars = [].slice.call(onb.querySelectorAll('[data-onb-bars] > span > span'));
    var onbCur = 0, onbTimer = null, ONB_MS = 4200;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var onbShow = function (i) {
      onbCur = (i + onbSlides.length) % onbSlides.length;
      onbSlides.forEach(function (s, k) {
        s.style.display = k === onbCur ? '' : 'none';
        if (k === onbCur) { s.classList.remove('onb-in'); void s.offsetWidth; s.classList.add('onb-in'); }
      });
      onbBars.forEach(function (b, k) { b.style.transition = 'none'; b.style.width = k < onbCur ? '100%' : '0%'; });
      var bar = onbBars[onbCur];
      if (bar) { void bar.offsetWidth; bar.style.transition = reduce ? 'none' : 'width ' + ONB_MS + 'ms linear'; bar.style.width = '100%'; }
      clearTimeout(onbTimer);
      onbTimer = setTimeout(function () { onbShow(onbCur + 1); }, ONB_MS);
    };
    var stage = onb.querySelector('[data-onb-stage]'), sx = null;
    if (stage) {
      stage.addEventListener('click', function () { onbShow(onbCur + 1); });
      stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) > 40) { e.preventDefault(); onbShow(onbCur + (dx > 0 ? 1 : -1)); } // RTL: swipe right = next
      });
    }
    onbShow(0);
  }

  // ---------- dark redesign: service nav — the notch and bubble slide to the tapped tab, then the page opens ----------
  var dnav = document.querySelector('[data-dnav]');
  if (dnav) {
    var DPOS = ['90%', '70%', '50%', '30%', '10%'];
    var setTab = function (i) { dnav.setAttribute('data-active', String(i)); dnav.style.setProperty('--x', DPOS[i]); };
    var curTab = +dnav.getAttribute('data-active');
    var prevTab = read('pl-dnav', null);
    if (prevTab !== null && prevTab !== curTab && DPOS[prevTab]) {
      // arrived from another tab by some other link: slide from where the bubble was
      dnav.style.transition = 'none';
      setTab(prevTab);
      void dnav.offsetWidth;
      setTimeout(function () { dnav.style.transition = ''; setTab(curTab); }, 40);
    }
    write('pl-dnav', curTab);
    dnav.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-i]');
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var i = +a.getAttribute('data-i');
      if (i === +dnav.getAttribute('data-active')) return;
      var href = a.getAttribute('href');
      if (!href || href === '#') {
        // tab whose dark screen is not designed yet: show it was tapped, then slide back
        setTab(i);
        toast('«' + (a.getAttribute('data-soon') || a.textContent.trim()) + '» في النسخة الداكنة لسه هتتصمم');
        setTimeout(function () { setTab(curTab); }, 1100);
        return;
      }
      setTab(i);
      if (SHEETS[fileOf(href)]) {
        // the add tab opens its sheet over this page; the bubble springs back to the current tab
        openSheet(fileOf(href));
        setTimeout(function () { setTab(curTab); }, 650);
        return;
      }
      write('pl-dnav', i);
      setTimeout(function () { location.href = href; }, 520);
    }, true);
  }

  // ---------- dark home (try 4): service cards carousel — centred card grows, dots follow ----------
  var svcRail = document.querySelector('[data-svc-rail]');
  if (svcRail) {
    var svcCards = Array.prototype.slice.call(svcRail.querySelectorAll('.svc-card'));
    var svcDots = Array.prototype.slice.call(document.querySelectorAll('[data-svc-dots] .svc-dot'));
    var svcStrips = Array.prototype.slice.call(document.querySelectorAll('[data-svc-strips] .svc-strip'));
    var svcActs = Array.prototype.slice.call(document.querySelectorAll('[data-svc-acts] .svc-act'));
    var svcFocus = function () {
      var mid = svcRail.getBoundingClientRect().left + svcRail.clientWidth / 2, best = 0, bestD = Infinity;
      svcCards.forEach(function (c, i) { var r = c.getBoundingClientRect(); var d = Math.abs(r.left + r.width / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
      svcCards.forEach(function (c, i) { c.classList.toggle('on', i === best); });
      svcDots.forEach(function (d, i) { d.classList.toggle('on', i === best); });
      // the activity strip under the cards follows the service in the middle
      svcStrips.forEach(function (s, i) { s.classList.toggle('on', i === best); });
      svcActs.forEach(function (s, i) { s.classList.toggle('on', i === best); });
    };
    svcRail.addEventListener('scroll', svcFocus, { passive: true });
    svcDots.forEach(function (d, i) { d.style.cursor = 'pointer'; d.addEventListener('click', function () { svcCards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }); });
    // a side card is a step in the carousel, not a link: the first tap brings it to the middle
    svcCards.forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (c.classList.contains('on')) return;
        e.preventDefault(); e.stopImmediatePropagation();
        c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, true);
    });
    svcFocus();
  }

  // ---------- apply sheet: pick a CV, send, success ----------
  if (page === 'job-apply.html') initApply(document);
  function initApply(root) {
    var confirmStep = root.querySelector('[data-step="confirm"]');
    var doneStep = root.querySelector('[data-step="done"]');
    if (!confirmStep || !doneStep) return;
    var buttons = confirmStep ? confirmStep.querySelectorAll('button') : [];
    var saved = buttons[0], upload = buttons[1], send = buttons[2];
    var ring = function (btn) { var s = btn && btn.querySelectorAll('span'); return s && s[s.length - 1]; };
    var pick = function (which) {
      [saved, upload].forEach(function (b) {
        if (!b) return;
        var on = b === which;
        b.style.border = on ? '1.5px solid #6C5CE7' : '1px solid #E8EBEF';
        var r = ring(b); if (r) r.style.border = on ? '6px solid #6C5CE7' : '1.5px solid #C5CDD6';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };
    if (saved) saved.addEventListener('click', function () { pick(saved); });
    if (upload) upload.addEventListener('click', function () { pick(upload); });
    if (send) send.addEventListener('click', function () {
      send.disabled = true;
      send.textContent = 'جارٍ الإرسال…';
      setTimeout(function () {
        confirmStep.classList.add('proto-hide');
        doneStep.classList.remove('proto-hide');
        doneStep.classList.add('proto-pop-in');
      }, 700);
    });
    pick(saved);
  }

  // ---------- presenter shortcut (prototype only, never on the canvas): a small floating button on every screen ----------
  // tap → menu: home · start over · dark ↔ light (V2) · hide. Drag it up/down so it never covers content. Key "H" = home.
  (function () {
    var host = document.querySelector('.device');
    if (!host || /^(splash|dark|lite)\.html$/.test(page)) return;
    var v = (page.match(/^(dark|lite)-/) || [])[1];
    var home = v ? v + '-home.html' : 'index.html?skip=1';
    var start = v ? v + '.html' : 'splash.html';
    var isHome = v ? page === v + '-home.html' : page === 'index.html';
    var typing = function (e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
    document.addEventListener('keydown', function (e) { if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey && !typing(e)) location.href = home; });
    if (read('pl-presenter-off', false)) {
      // hidden for this session: three quick taps on the top strip of the screen bring it back
      var taps = [];
      host.addEventListener('click', function (e) {
        var r = host.getBoundingClientRect(); if (e.clientY - r.top > 56) return;
        var now = Date.now(); taps = taps.filter(function (t) { return now - t < 800; }); taps.push(now);
        if (taps.length >= 3) { write('pl-presenter-off', false); location.reload(); }
      }, true);
      return;
    }
    var ico = {
      menu: '<path d="M5 10h2c2 0 3-1 3-3V5c0-2-1-3-3-3H5C3 2 2 3 2 5v2c0 2 1 3 3 3ZM17 10h2c2 0 3-1 3-3V5c0-2-1-3-3-3h-2c-2 0-3 1-3 3v2c0 2 1 3 3 3ZM17 22h2c2 0 3-1 3-3v-2c0-2-1-3-3-3h-2c-2 0-3 1-3 3v2c0 2 1 3 3 3ZM5 22h2c2 0 3-1 3-3v-2c0-2-1-3-3-3H5c-2 0-3 1-3 3v2c0 2 1 3 3 3Z"/>',
      home: '<path d="m9.02 2.84-5.39 4.2C2.73 7.74 2 9.23 2 10.36v7.41c0 2.32 1.89 4.22 4.21 4.22h11.58c2.32 0 4.21-1.9 4.21-4.21V10.5c0-1.21-.81-2.76-1.8-3.45l-6.18-4.33c-1.4-.98-3.65-.93-5 .12ZM12 17.99v-3"/>',
      start: '<path d="M14.55 21.67C18.84 20.54 22 16.64 22 12c0-5.52-4.44-10-10-10C5.33 2 2 7.56 2 7.56m0 0V3m0 4.56h4.44"/><path d="M2 12c0 5.52 4.48 10 10 10" stroke-dasharray="3 3"/>',
      theme: '<path d="M2.03 12.42c.36 5.15 4.73 9.34 9.96 9.57 3.69.16 6.99-1.56 8.97-4.27.82-1.11.38-1.85-.99-1.6-.67.12-1.36.17-2.08.14C13 16.06 9 11.97 8.98 7.14c-.01-1.3.26-2.53.75-3.65.54-1.24-.11-1.83-1.36-1.3C4.41 3.86 1.7 7.85 2.03 12.42Z"/>',
      hide: '<path d="M14.53 9.47 9.47 14.53a3.576 3.576 0 1 1 5.06-5.06Z"/><path d="M17.82 5.77C16.07 4.45 14.07 3.73 12 3.73c-3.53 0-6.82 2.08-9.11 5.68-.9 1.41-.9 3.78 0 5.19.79 1.24 1.71 2.31 2.71 3.17M8.42 19.53c1.14.48 2.35.74 3.58.74 3.53 0 6.82-2.08 9.11-5.68.9-1.41.9-3.78 0-5.19-.33-.52-.69-1.01-1.06-1.47M15.51 12.7a3.565 3.565 0 0 1-2.82 2.82M9.47 14.53 2 22M22 2l-7.47 7.47"/>'
    };
    var svg = function (k, s) { return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ico[k] + '</svg>'; };
    var st = document.createElement('style');
    st.textContent = '.pl-pres{position:absolute;z-index:60;left:10px;width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(18,20,30,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;display:flex;align-items:center;justify-content:center;opacity:.5;cursor:pointer;touch-action:none;box-shadow:0 6px 18px rgba(0,0,0,.25);transition:opacity .2s}' +
      '.pl-pres:hover,.pl-pres.on{opacity:1}' +
      '.pl-pres-menu{position:absolute;z-index:61;left:60px;min-width:190px;padding:6px;border-radius:18px;background:rgba(18,20,30,.92);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 34px rgba(0,0,0,.35);font-family:"Thmanyah Sans",Tajawal,sans-serif;direction:rtl;display:none;transform-origin:left center;animation:pl-pres-in .18s ease}' +
      '.pl-pres-menu.open{display:block}@keyframes pl-pres-in{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}' +
      '.pl-pres-menu button{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;color:#F8FAFC;font-size:14px;font-family:inherit;cursor:pointer}' +
      '.pl-pres-menu button:hover{background:rgba(255,255,255,.08)}.pl-pres-menu .sep{height:1px;margin:4px 8px;background:rgba(255,255,255,.1)}' +
      '.pl-pres-menu .k{margin-right:auto;font-size:11px;color:rgba(248,250,252,.45)}';
    document.head.appendChild(st);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pl-pres'; btn.setAttribute('aria-label', 'قائمة العرض'); btn.innerHTML = svg('menu', 20);
    var menu = document.createElement('div');
    menu.className = 'pl-pres-menu'; menu.setAttribute('role', 'menu');
    var items = [['home', 'الرئيسية', 'H'], ['start', 'من البداية', '']];
    if (v) items.push(['theme', v === 'dark' ? 'التبديل للفاتح' : 'التبديل للداكن', '']);
    items.push(['sep'], ['hide', 'إخفاء الزر', '']);
    menu.innerHTML = items.map(function (it) { return it[0] === 'sep' ? '<div class="sep"></div>' : '<button type="button" role="menuitem" data-act="' + it[0] + '">' + svg(it[0], 18) + '<span>' + it[1] + '</span>' + (it[2] ? '<span class="k">' + it[2] + '</span>' : '') + '</button>'; }).join('');
    host.appendChild(btn); host.appendChild(menu);
    var place = function (y) { y = Math.max(70, Math.min(host.clientHeight - 150, y)); btn.style.top = y + 'px'; menu.style.top = Math.max(12, Math.min(host.clientHeight - 230, y - 60)) + 'px'; write('pl-presenter-y', y); };
    place(read('pl-presenter-y', Math.round(host.clientHeight * 0.58)));
    var open = function (on) { menu.classList.toggle('open', on); btn.classList.toggle('on', on); };
    // drag vertically; a tap (no drag) opens the menu
    var startY = 0, baseY = 0, moved = false, down = false;
    btn.addEventListener('pointerdown', function (e) { down = true; moved = false; startY = e.clientY; baseY = parseFloat(btn.style.top) || 0; btn.setPointerCapture(e.pointerId); });
    btn.addEventListener('pointermove', function (e) { if (!down) return; var dy = e.clientY - startY; if (Math.abs(dy) > 5) { moved = true; open(false); } if (moved) place(baseY + dy); });
    btn.addEventListener('pointerup', function () { down = false; if (!moved) open(!menu.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) open(false); }, true);
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act'); open(false);
      if (act === 'home') { if (isHome) toast('أنت في الرئيسية'); else location.href = home; }
      else if (act === 'start') location.href = start;
      else if (act === 'hide') { write('pl-presenter-off', true); btn.remove(); menu.remove(); toast('اتخفى الزر · ٣ نقرات سريعة أعلى الشاشة ترجّعه'); }
      else if (act === 'theme') {
        var other = v === 'dark' ? 'lite' : 'dark', to = page.replace(/^(dark|lite)/, other);
        write('pl-theme', other);
        fetch(to).then(function (r) { location.replace(r.ok ? to : other + '-home.html'); }).catch(function () { location.replace(other + '-home.html'); });
      }
    });
  })();
})();

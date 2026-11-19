// Path Link prototype behaviour (prototype only; the design canvas stays untouched).
// Splash on first open, toasts for screens not designed yet, the services rail, job filter chips, the apply sheet.
(function () {
  var screen = document.querySelector('.screen');
  var page = (location.pathname.split('/').pop() || 'index.html') || 'index.html';
  var standalone = document.documentElement.classList.contains('standalone');

  function read(key, fallback) { try { var v = sessionStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function write(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  // the site root (index.html) opens V2 in the mode last used on this device; remember it on every V2 page
  var mode = (page.match(/^(dark|lite)[-.]/) || [])[1];
  if (mode) { try { localStorage.setItem('pl-mode', mode); } catch (e) {} }
  if (page === 'dark.html' || page === 'lite.html') {
    // the V2 splash (dark or its light mode): same fresh start, then its own onboarding
    write('pl-fl', 'none'); write('pl-tr', 'none'); write('pl-au', 'user'); write('pl-applied', '');
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
  var SHEETS = { 'add.html': 1, 'job-filter.html': 1, 'job-apply.html': 1, 'freelance-filter.html': 1, 'consult-filter.html': 1, 'course-filter.html': 1, 'orders-filter.html': 1, 'reschedule.html': 1, 'accept-offer.html': 1, 'request-revision.html': 1, 'need-approval.html': 1, 'coursera.html': 1, 'login-gate.html': 1, 'dark-job-filter.html': 1, 'dark-job-apply.html': 1, 'dark-accept-offer.html': 1, 'dark-request-revision.html': 1, 'dark-need-approval.html': 1, 'dark-freelance-filter.html': 1, 'dark-reschedule.html': 1, 'dark-consult-filter.html': 1, 'dark-course-filter.html': 1, 'dark-coursera.html': 1, 'dark-orders-filter.html': 1, 'dark-add.html': 1, 'dark-login-gate.html': 1, 'dark-photo-sheet.html': 1, 'dark-city-sheet.html': 1, 'dark-date-sheet.html': 1, 'dark-payment-sheet.html': 1, 'dark-attach-sheet.html': 1, 'dark-language-sheet.html': 1, 'dark-add-section.html': 1, 'dark-project-menu.html': 1 };
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
        } else if (SHEETS[fileOf(h)]) { e.preventDefault(); openSheet(fileOf(h)); } // a sheet opened from a sheet stacks on top
        else if (a.hasAttribute('data-toast')) write('pl-toast', a.getAttribute('data-toast'));
      });
      initControls(root);
      applyStories(root);
      storyClicks(root);
      if (/job-apply\.html$/.test(file)) initApply(root);
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
  // V2 (dark / light) too: «إرسال الطلب» → sending → success in the sheet; the job then shows «تم التقديم» and links to the application
  if (/^((dark|lite)-)?job-apply\.html$/.test(page)) initApply(document);
  function markApplied() {
    var m = page.match(/^(dark|lite)-job\.html$/);
    if (!m || read('pl-applied', '') !== '1') return;
    var b = document.querySelector('.foot a.btn[data-au], .foot a.btn[href*="job-apply"]');
    if (!b) return;
    b.removeAttribute('data-au'); b.removeAttribute('data-own-href');
    b.setAttribute('href', m[1] + '-application.html');
    b.className = 'btn2';
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:' + (m[1] === 'dark' ? '#A3D9B8' : '#1E7F4F') + '"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke-width="1.5"/><path d="m7.75 12 2.83 2.83 5.67-5.66" stroke-width="1.5"/></svg>تم التقديم · تابع طلبك';
  }
  markApplied();
  window.addEventListener('pageshow', function (e) { if (e.persisted) markApplied(); });
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
        var off = /^dark/.test(page) ? ['1px solid rgba(255,255,255,0.09)', '1.5px solid rgba(255,255,255,0.28)'] : /^lite/.test(page) ? ['1px solid rgba(21,32,43,0.1)', '1.5px solid rgba(21,32,43,0.25)'] : ['1px solid #E8EBEF', '1.5px solid #C5CDD6'];
        b.style.border = on ? '1.5px solid #6C5CE7' : off[0];
        var r = ring(b); if (r) r.style.border = on ? '6px solid #6C5CE7' : off[1];
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
        write('pl-applied', '1'); markApplied();
      }, 700);
    });
    pick(saved);
  }

  // ---------- presenter flows panel (prototype only, never inside the app design) ----------
  // Wide screens: a panel beside the phone listing every flow + the mode (V2 dark / V2 light) + start over.
  // Phones / installed app: nothing shows on screen; three quick taps on the top strip open the same list as a side drawer.
  // Key "H" = home of the current version.
  (function () {
    var host = document.querySelector('.device');
    var v = (page.match(/^(dark|lite)-/) || [])[1] || '';
    if (!host || !v) return; // V2 screens only (the splashes and the root redirect have no panel)
    var pre = v + '-';
    var home = v + '-home.html';
    var start = v + '.html';
    var typing = function (e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
    document.addEventListener('keydown', function (e) { if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey && !typing(e)) location.href = home; });
    var flows = [
      ['البداية والدخول', 'الإسبلاش ← الترحيب ← الدخول', start],
      ['الرئيسية', 'الخدمات ونشاطك الحالي', home],
      ['الوظائف · الباحث عن عمل', 'الوظائف ← التفاصيل ← التقديم', pre + 'jobs.html'],
      ['الوظائف · الشركة', 'وظائف الشركة ← المتقدمون', pre + 'company.html'],
      ['العمل الحر · العميل', 'الخدمات والمشاريع ← الطلب', pre + 'freelance.html'],
      ['العمل الحر · المستقل', 'لوحة المستقل ← العروض والتسليم', pre + 'freelancer.html'],
      ['الاستشارات · العميل', 'المستشارون ← الحجز ← الجلسة', pre + 'consult.html'],
      ['الاستشارات · المستشار', 'لوحة المستشار ← المواعيد', pre + 'consultant.html'],
      ['الكورسات · المتعلم', 'الكورسات ← الشراء ← المشاهدة', pre + 'courses.html'],
      ['الكورسات · المدرب', 'لوحة المدرب ← المحتوى والمبيعات', pre + 'trainer.html'],
      ['البحث', 'البحث ← النتائج ← الفلاتر', pre + 'search.html'],
      ['طلباتي', 'الطلبات والحجوزات والكورسات', pre + 'applications.html'],
      ['المستحقات والتسويات', 'المستحقات ← التفاصيل ← التسويات', pre + 'earnings.html'],
      ['الملفات المهنية', 'اختيار ملف ← الإنشاء ← المراجعة', pre + 'new-profile.html'],
      ['الحساب والإعدادات', 'حسابي ← الملف الشخصي ← الإعدادات', pre + 'account.html']
    ];
    var light = v !== 'dark';
    var col = light
      ? { bg: 'rgba(255,255,255,.86)', bd: 'rgba(21,32,43,.08)', ink: '#15202B', sub: 'rgba(21,32,43,.55)', hov: 'rgba(108,92,231,.08)', seg: 'rgba(21,32,43,.05)', on: '#FFFFFF', sh: '0 20px 50px rgba(21,32,43,.12)' }
      : { bg: 'rgba(16,18,27,.86)', bd: 'rgba(255,255,255,.08)', ink: '#F8FAFC', sub: 'rgba(248,250,252,.5)', hov: 'rgba(255,255,255,.06)', seg: 'rgba(255,255,255,.05)', on: 'rgba(255,255,255,.12)', sh: '0 20px 50px rgba(0,0,0,.4)' };
    var st = document.createElement('style');
    st.textContent =
      '.pl-flows{position:fixed;z-index:80;top:50%;transform:translateY(-50%);right:max(20px,calc(50% - 195px - 330px));width:290px;max-height:calc(100vh - 48px);overflow-y:auto;scrollbar-width:none;padding:18px;box-sizing:border-box;border-radius:26px;background:' + col.bg + ';border:1px solid ' + col.bd + ';-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:' + col.sh + ';color:' + col.ink + ';font-family:"Thmanyah Sans",Tajawal,sans-serif;direction:rtl;display:flex;flex-direction:column;gap:12px}' +
      '.pl-flows::-webkit-scrollbar{display:none}' +
      '.pl-flows .t{font-size:17px;font-weight:700}.pl-flows .s{font-size:12px;color:' + col.sub + '}' +
      '.pl-flows .seg{display:flex;padding:4px;border-radius:999px;background:' + col.seg + '}' +
      '.pl-flows .seg a{flex:1;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:12px;color:' + col.sub + ';text-decoration:none}' +
      '.pl-flows .seg a.on{background:linear-gradient(90deg,#6C5CE7,#F168FF);color:#fff;font-weight:700}' +
      '.pl-flows ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}' +
      '.pl-flows li a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;color:' + col.ink + ';text-decoration:none}' +
      '.pl-flows li a:hover{background:' + col.hov + '}.pl-flows li a.on{background:' + col.hov + ';box-shadow:inset 0 0 0 1px rgba(108,92,231,.35)}' +
      '.pl-flows .n{width:24px;height:24px;flex:none;border-radius:8px;background:' + col.seg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:' + col.sub + '}' +
      '.pl-flows li a.on .n{background:linear-gradient(135deg,#6C5CE7,#F168FF);color:#fff}' +
      '.pl-flows .l{display:flex;flex-direction:column;min-width:0}.pl-flows .l b{font-size:13px;font-weight:700}.pl-flows .l span{font-size:11px;color:' + col.sub + '}' +
      '.pl-flows .go{height:40px;border-radius:999px;border:1px solid ' + col.bd + ';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:' + col.ink + ';text-decoration:none}' +
      '.pl-flows .k{text-align:center;font-size:11px;color:' + col.sub + '}' +
      '@media (max-width:1060px),(max-height:600px){.pl-flows:not(.drawer){display:none}}' +
      'html.standalone .pl-flows:not(.drawer){display:none}' +
      '.pl-flows.drawer{right:0;top:0;bottom:0;transform:translateX(105%);max-height:none;height:100%;border-radius:26px 0 0 26px;width:min(300px,86vw);transition:transform .3s cubic-bezier(.2,.8,.2,1)}' +
      '.pl-flows.drawer.open{transform:none}' +
      '.pl-flows-dim{position:fixed;inset:0;z-index:79;background:rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .25s}.pl-flows-dim.open{opacity:1;pointer-events:auto}';
    document.head.appendChild(st);
    var cur = page + (location.search || '');
    var versions = [['V2 داكن', 'dark', 'dark'], ['V2 فاتح', 'lite', 'lite']];
    var verLink = function (it) {
      if (!it[2]) return it[1];
      if (v) return page.replace(/^(dark|lite)/, it[2]); // same screen in the other mode
      return it[2] + '-home.html';
    };
    var html = '<span class="t">Path Link · العرض</span><span class="s">اختر النسخة والفلو اللي هتعرضه</span>' +
      '<div class="seg">' + versions.map(function (it) { return '<a href="' + verLink(it) + '" data-ver="' + it[2] + '"' + ((it[2] || '') === v ? ' class="on"' : '') + '>' + it[0] + '</a>'; }).join('') + '</div>' +
      '<ol>' + flows.map(function (f, i) { var on = f[2] === page || f[2] === cur; return '<li><a href="' + f[2] + '"' + (on ? ' class="on"' : '') + '><span class="n">' + (i + 1) + '</span><span class="l"><b>' + f[0] + '</b><span>' + f[1] + '</span></span></a></li>'; }).join('') + '</ol>' +
      '<a class="go" href="' + start + '">من البداية</a><span class="k">H للرئيسية · على الموبايل: 3 نقرات أعلى الشاشة</span>';
    var make = function (drawer) { var el = document.createElement('nav'); el.className = 'pl-flows' + (drawer ? ' drawer' : ''); el.setAttribute('aria-label', 'فلوهات العرض'); el.innerHTML = html; document.body.appendChild(el); return el; };
    var side = make(false);
    var drawer = make(true);
    var dim = document.createElement('div'); dim.className = 'pl-flows-dim'; document.body.appendChild(dim);
    var openDrawer = function (on) { drawer.classList.toggle('open', on); dim.classList.toggle('open', on); };
    dim.addEventListener('click', function () { openDrawer(false); });
    // switching version to the other V2 mode: replace, so back stays inside one mode; a missing screen falls back to that mode's home
    [side, drawer].forEach(function (el) {
      el.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-ver]'); if (!a) return;
        var to = a.getAttribute('href'), ver = a.getAttribute('data-ver');
        if (ver === v) { e.preventDefault(); openDrawer(false); return; }
        if (v && ver) {
          e.preventDefault(); write('pl-theme', ver);
          fetch(to).then(function (r) { location.replace(r.ok ? to : ver + '-home.html'); }).catch(function () { location.replace(ver + '-home.html'); });
        }
      });
    });
    // phones: three quick taps on the top strip of the screen open the drawer
    var taps = [];
    host.addEventListener('click', function (e) {
      var r = host.getBoundingClientRect(); if (e.clientY - r.top > 56) return;
      var now = Date.now(); taps = taps.filter(function (t) { return now - t < 800; }); taps.push(now);
      if (taps.length >= 3) { taps = []; openDrawer(true); }
    }, true);
  })();
})();

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
    var go = function () { location.replace('./?skip=1'); };
    var t = setTimeout(go, 1800); // passes on its own; a tap skips it
    if (screen) screen.addEventListener('click', function () { clearTimeout(t); go(); });
    return;
  }

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

  // links to screens that are not designed yet
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (!a || !screen || !screen.contains(a)) return;
    e.preventDefault();
    if (a.hasAttribute('data-chip')) return;
    var label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
    toast(label && label.length <= 24 ? '«' + label + '» قيد التصميم' : 'هذه الشاشة قيد التصميم');
  });

  // ---------- shared controls on the designed screens (also run inside a sheet opened over the page) ----------
  // segmented tabs and chip rails (single choice), chip groups (multiple choice), on/off toggles
  function initControls(root) {
  [].forEach.call(root.querySelectorAll('.seg, .rail'), function (group) {
    var items = [].filter.call(group.children, function (c) { return c.matches('.seg > a, a.chip'); });
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
      toast(off ? 'تم إيقاف التقديم التلقائي' : 'تم تفعيل التقديم التلقائي');
    });
  });
  }
  initControls(document);

  // ---------- bottom sheets open over the current page (overlay + slide up), not as a new screen ----------
  var SHEETS = { 'add.html': 1, 'job-filter.html': 1, 'job-apply.html': 1, 'freelance-filter.html': 1, 'consult-filter.html': 1, 'course-filter.html': 1, 'orders-filter.html': 1 };
  var SHEET_CSS = '.pl-wrap{position:absolute;inset:0;font-family:"Thmanyah Sans",Tajawal,sans-serif;direction:rtl}' +
    '.pl-backdrop{position:absolute;inset:0;background:rgba(14,26,43,.48);opacity:0;transition:opacity .25s ease}' +
    '.pl-sheet{position:absolute;left:0;right:0;bottom:0;max-height:92%;overflow-y:auto;scrollbar-width:none;transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.8,.2,1)}' +
    '.pl-sheet::-webkit-scrollbar{display:none}.pl-sheet>.sheet{position:relative;max-height:none}' +
    '.pl-wrap.open .pl-backdrop{opacity:1}.pl-wrap.open .pl-sheet{transform:none}' +
    '.proto-hide{display:none!important}.proto-pop-in{animation:pl-in .35s ease both}@keyframes pl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.pl-backdrop,.pl-sheet{transition:none}.proto-pop-in{animation:none}}';
  var sheetCache = {};
  function fileOf(href) { var f = String(href || '').split('#')[0].split('?')[0].replace(/^\.\//, ''); return f || 'index.html'; }
  function openSheet(file) {
    var got = sheetCache[file] ? Promise.resolve(sheetCache[file]) : fetch(file).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    got.then(function (text) {
      sheetCache[file] = text;
      var doc = new DOMParser().parseFromString(text, 'text/html');
      var dialog = doc.querySelector('[role="dialog"]');
      if (!dialog) { location.href = file; return; }
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
          var label = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
          toast(label && label.length <= 24 ? '«' + label + '» قيد التصميم' : 'هذه الشاشة قيد التصميم');
          return;
        }
        if (fileOf(h) === page) { // links back to the page underneath close the sheet
          e.preventDefault();
          close();
          if (/^عرض \d+/.test(a.textContent.trim())) toast('تم تطبيق الفلاتر');
        }
      });
      initControls(root);
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
        c.style.background = on ? '#1F6FEB' : '#FFFFFF';
        c.style.color = on ? '#FFFFFF' : '#15202B';
        c.style.border = on ? '0' : '1px solid #E8EBEF';
        c.style.fontWeight = on ? '700' : '400';
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { paint(c); if (c.textContent.trim() !== 'الكل') toast('الفلترة في النموذج للعرض فقط'); }); });
    if (chips.length) paint(chips[0]);
  }

  // ---------- search: typing + Enter shows the results screen ----------
  if (page === 'search.html' || page === 'search-results.html') {
    var q = document.querySelector('input[type="search"]');
    if (q) {
      if (page === 'search.html' && standalone === false) q.focus({ preventScroll: true });
      q.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (!q.value.trim()) { toast('اكتب كلمة للبحث'); return; }
        location.href = 'search-results.html';
      });
    }
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
        b.style.border = on ? '1.5px solid #1F6FEB' : '1px solid #E8EBEF';
        var r = ring(b); if (r) r.style.border = on ? '6px solid #1F6FEB' : '1.5px solid #C5CDD6';
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
})();

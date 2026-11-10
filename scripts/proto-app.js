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

  // ---------- apply sheet: pick a CV, send, success ----------
  if (page === 'job-apply.html') {
    var confirmStep = document.querySelector('[data-step="confirm"]');
    var doneStep = document.querySelector('[data-step="done"]');
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

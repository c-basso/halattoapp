/* halatto.app — page behaviour (no dependencies) */
(function () {
  // Mobile menu: the header nav collapses behind a toggle on small screens.
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.nav-toggle');
  if (toggle) {
    var setMenu = function (open) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('is-open'));
    });
    header.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
    });
  }

  // Screenshot strip: arrow keys scroll one frame when the strip has focus.
  var reel = document.querySelector('.reel');
  if (reel) {
    reel.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var frame = reel.querySelector('.reel-frame');
      reel.scrollBy({ left: dir * (frame ? frame.offsetWidth + 22 : 280), behavior: 'smooth' });
    });
  }

  // Before/after slider: drag anywhere on the picture; the hidden range input gives keyboard control.
  Array.prototype.forEach.call(document.querySelectorAll('.ba-slider'), function (slider) {
    var range = slider.querySelector('.ba-slider-range');
    var set = function (value) {
      var pos = Math.max(0, Math.min(100, value));
      slider.style.setProperty('--pos', pos + '%');
      if (range) range.value = String(Math.round(pos));
    };
    var fromEvent = function (e) {
      var box = slider.getBoundingClientRect();
      set(((e.clientX - box.left) / box.width) * 100);
    };
    var dragging = false;
    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      if (slider.setPointerCapture) slider.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    slider.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach(function (name) {
      slider.addEventListener(name, function () { dragging = false; });
    });
    if (range) {
      range.style.pointerEvents = 'none';
      range.addEventListener('input', function () { set(Number(range.value)); });
    }
  });

  // App Store clicks: a Metrika goal with the place, page and locale taken from the link's campaign token
  // (ct=web_<locale>_<page>_<place>), so the site's own numbers can be compared with App Store Connect.
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href*="apps.apple.com/app/"]');
    if (!link || typeof window.ym !== 'function' || !window.HALATTO_YM) return;
    var match = /[?&]ct=([^&#]+)/.exec(link.getAttribute('href') || '');
    var ct = match ? decodeURIComponent(match[1]) : '';
    var parts = ct.split('_');
    window.ym(window.HALATTO_YM, 'reachGoal', 'appstore_click', {
      ct: ct || 'none',
      locale: parts[1] || '',
      page: parts[2] || '',
      place: parts.slice(3).join('_')
    });
  }, true);

  // Small screens: an install bar slides in while no App Store button is on screen.
  var bar = document.querySelector('[data-sticky-cta]');
  if (bar && 'IntersectionObserver' in window) {
    bar.hidden = false;
    var onScreen = [];
    var updateBar = function () {
      bar.classList.toggle('is-visible', onScreen.length === 0 && window.scrollY > 240);
    };
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var i = onScreen.indexOf(entry.target);
        if (entry.isIntersecting && i === -1) onScreen.push(entry.target);
        if (!entry.isIntersecting && i !== -1) onScreen.splice(i, 1);
      });
      updateBar();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.store-button, .footer-store'), function (el) { watcher.observe(el); });
    window.addEventListener('scroll', updateBar, { passive: true });
  }

  // Small screens: FAQ answers stay in the HTML (SEO) but collapse behind a button.
  if (!window.matchMedia) return;
  var mq = window.matchMedia('(max-width: 760px)');
  var items = document.querySelectorAll('.faq-list .faq-item');
  var done = false;
  function enhance() {
    if (done || !mq.matches || !items.length) return;
    done = true;
    Array.prototype.forEach.call(items, function (item, i) {
      var q = item.querySelector('.faq-q');
      var a = item.querySelector('.faq-a');
      if (!q || !a) return;
      a.id = a.id || 'faq-answer-' + (i + 1);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'faq-toggle';
      btn.setAttribute('aria-controls', a.id);
      while (q.firstChild) btn.appendChild(q.firstChild);
      q.appendChild(btn);
      item.classList.add('is-collapsible');
      var set = function (open) {
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      };
      set(i === 0);
      btn.addEventListener('click', function () { set(!item.classList.contains('is-open')); });
    });
  }
  enhance();
  if (mq.addEventListener) mq.addEventListener('change', enhance);
})();

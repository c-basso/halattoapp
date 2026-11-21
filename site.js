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

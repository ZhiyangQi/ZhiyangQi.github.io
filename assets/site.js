/* Zhiyang Qi — site scripts (theme, nav, back-to-top, copy, publication filters) */
(function () {
  'use strict';

  /* ---------- storage helpers (may throw in private mode) ---------- */
  function getPref(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      setPref('theme', next);
    });
  });

  /* ---------- nav border + back to top ---------- */
  var nav = document.querySelector('.nav');
  var topBtn = document.getElementById('backToTop');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 8);
    if (topBtn) topBtn.classList.toggle('visible', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- toast + clipboard ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      return Promise.resolve();
    }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    return fallback();
  }

  var bioBtn = document.getElementById('bio-copy');
  if (bioBtn) {
    bioBtn.addEventListener('click', function () {
      copyText(bioBtn.getAttribute('data-bio')).then(function () { toast('Bio copied to clipboard'); });
    });
  }

  /* ---------- news expand ---------- */
  var newsToggle = document.querySelector('.news-toggle');
  if (newsToggle) {
    newsToggle.addEventListener('click', function () {
      var box = newsToggle.closest('.news');
      var open = box.classList.toggle('expanded');
      newsToggle.textContent = open ? 'Show less' : newsToggle.getAttribute('data-more');
    });
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* =========================================================
     Publications: abstract / BibTeX toggles
     ========================================================= */
  document.querySelectorAll('.toggle[aria-controls]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.hidden = open;
    });
  });
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.panel-bib').querySelector('pre');
      copyText(pre.textContent).then(function () {
        var label = btn.querySelector('span');
        btn.classList.add('done'); label.textContent = 'Copied';
        setTimeout(function () { btn.classList.remove('done'); label.textContent = 'Copy'; }, 1600);
      });
    });
  });

  /* =========================================================
     Publications: filters
     ========================================================= */
  var filters = document.getElementById('pub-filters');
  if (!filters) return;

  var pubs = Array.prototype.slice.call(document.querySelectorAll('.pub'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.pub-section'));
  var firstOnly = document.getElementById('first-only');
  var countEl = document.getElementById('pub-count');
  var resetBtn = document.getElementById('pub-reset');
  var emptyEl = document.getElementById('pub-empty');
  var groups = ['type', 'year', 'topic'];
  var state = { type: new Set(), year: new Set(), topic: new Set() };

  function matches(p, ignore) {
    if (firstOnly.checked && p.dataset.first !== '1') return false;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g === ignore || state[g].size === 0) continue;
      var vals = (p.dataset[g] || '').split(' ').filter(Boolean);
      var hit = vals.some(function (v) { return state[g].has(v); });
      if (!hit) return false;
    }
    return true;
  }

  function apply() {
    var shown = 0;
    pubs.forEach(function (p) {
      var ok = matches(p, null);
      p.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    sections.forEach(function (s) {
      var n = s.querySelectorAll('.pub:not(.is-hidden)').length;
      s.classList.toggle('is-hidden', n === 0);
      var c = s.querySelector('.count');
      if (c) c.textContent = n;
    });
    countEl.textContent = shown;
    emptyEl.hidden = shown !== 0;
    var active = firstOnly.checked || groups.some(function (g) { return state[g].size > 0; });
    resetBtn.disabled = !active;

    // live counts per chip (respecting the other active filters)
    filters.querySelectorAll('.chip[data-group]').forEach(function (chip) {
      var g = chip.dataset.group, v = chip.dataset.value;
      var n = pubs.filter(function (p) {
        return matches(p, g) && (p.dataset[g] || '').split(' ').indexOf(v) !== -1;
      }).length;
      chip.querySelector('.n').textContent = n;
      chip.disabled = n === 0 && chip.getAttribute('aria-pressed') !== 'true';
    });
    syncUrl();
  }

  function syncUrl() {
    var q = new URLSearchParams();
    if (firstOnly.checked) q.set('first', '1');
    groups.forEach(function (g) { if (state[g].size) q.set(g, Array.from(state[g]).join(',')); });
    var qs = q.toString();
    try { history.replaceState(null, '', qs ? '?' + qs : location.pathname); } catch (e) { /* file:// may refuse */ }
  }

  function readUrl() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (q.get('first') === '1') firstOnly.checked = true;
    groups.forEach(function (g) {
      (q.get(g) || '').split(',').filter(Boolean).forEach(function (v) { state[g].add(v); });
    });
    filters.querySelectorAll('.chip[data-group]').forEach(function (chip) {
      chip.setAttribute('aria-pressed', state[chip.dataset.group].has(chip.dataset.value) ? 'true' : 'false');
    });
  }

  filters.querySelectorAll('.chip[data-group]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var g = chip.dataset.group, v = chip.dataset.value;
      if (state[g].has(v)) state[g].delete(v); else state[g].add(v);
      chip.setAttribute('aria-pressed', state[g].has(v) ? 'true' : 'false');
      apply();
    });
  });
  firstOnly.addEventListener('change', apply);
  resetBtn.addEventListener('click', function () {
    firstOnly.checked = false;
    groups.forEach(function (g) { state[g].clear(); });
    filters.querySelectorAll('.chip[data-group]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    apply();
  });
  var ft = document.querySelector('.filter-toggle');
  if (ft) ft.addEventListener('click', function () {
    var open = filters.classList.toggle('open');
    ft.setAttribute('aria-expanded', open ? 'true' : 'false');
    ft.textContent = open ? 'Hide filters' : 'More filters';
  });

  readUrl();
  apply();
})();

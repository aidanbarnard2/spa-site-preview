/* Saint Paul Agency site behavior: menus, evaluation dialog, forms, on-screen ad countdown. */
(function () {
  var doc = document;
  var PHONE = '(612) 599-8422';
  var EMAIL = 'info@saintpaulagency.com';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll position: a refresh opens at the top, back/forward returns to where the visitor was ---- */
  (function () {
    var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var key = 'spa-y:' + location.pathname, y = 0, moved = false;
    function put(top) { try { window.scrollTo({ top: top, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, top); } }
    window.addEventListener('pagehide', function () { try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch (e) {} });
    if (location.hash) return;
    if (nav && nav.type === 'back_forward') { try { y = parseInt(sessionStorage.getItem(key), 10) || 0; } catch (e) {} }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { once: true, passive: true }); });
    if (Math.round(window.scrollY) !== y) put(y);
    window.addEventListener('load', function () { if (!moved && Math.abs(window.scrollY - y) > 2) put(y); });
  })();

  /* ---- analytics: events land in Google Tag Manager's dataLayer once GTM is added ---- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var p = params || {};
    p.event = event;
    p.page_path = location.pathname;
    window.dataLayer.push(p);
  }
  window.SPA_TRACK = track;
  doc.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/^tel:/.test(href)) track('phone_click', { phone: href.slice(4), link_text: a.textContent.trim() });
    else if (/^mailto:/.test(href)) track('email_click', { email: href.slice(7) });
    else if (/^https?:/.test(href) && a.host !== location.host) track('outbound_click', { link_url: href, link_text: a.textContent.trim().slice(0, 80) });
  }, true);

  /* ---- menus ---- */
  function closeMenus(except) {
    doc.querySelectorAll('.nav .has-menu.open').forEach(function (li) {
      if (li !== except) {
        li.classList.remove('open');
        var b = li.querySelector('.nav-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
  }

  doc.addEventListener('click', function (ev) {
    var t = ev.target;

    var navBtn = t.closest('.nav-btn');
    if (navBtn) {
      var li = navBtn.parentElement;
      var open = !li.classList.contains('open');
      closeMenus(li);
      li.classList.toggle('open', open);
      navBtn.setAttribute('aria-expanded', String(open));
      return;
    }
    if (!t.closest('.nav .menu')) closeMenus();

    var burger = t.closest('.burger');
    if (burger) {
      var panel = doc.getElementById('mobile-nav');
      var show = panel.hidden;
      panel.hidden = !show;
      burger.setAttribute('aria-expanded', String(show));
      return;
    }

    var ev_ = t.closest('[data-eval]');
    if (ev_) { track('evaluation_open', { service: ev_.getAttribute('data-eval') || '', button_text: ev_.textContent.trim() }); openEval(ev_.getAttribute('data-eval')); return; }

    var dlg = doc.getElementById('eval');
    if (t.closest('[data-close]') || t === dlg) { closeEval(); return; }

    var vid = t.closest('[data-video]');
    if (vid) {
      track('video_play', { video_title: vid.getAttribute('data-title') || '', source: vid.hasAttribute('data-watch') ? 'hero' : 'reel' });
      openPlayer(vid.getAttribute('data-video'), vid.getAttribute('data-title'), vid.getAttribute('data-href'));
      return;
    }

    var surf = t.closest('[data-channel-surf]');
    if (surf) { channelSurf(JSON.parse(surf.getAttribute('data-channel-surf'))); return; }
    var pl = doc.getElementById('player');
    if (t.closest('[data-close-player]') || (pl && t === pl)) { closePlayer(); return; }

    var toggle = t.closest('.brand-toggle');
    if (toggle) {
      var wrap = toggle.closest('.brands');
      if (!toggle.dataset.label) toggle.dataset.label = toggle.textContent;
      var isOpen = wrap.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = isOpen ? 'Show fewer' : toggle.dataset.label;
    }
  });

  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeMenus();
  });

  /* ---- evaluation dialog ---- */
  var lastFocus = null;
  function openEval(slug) {
    var dlg = doc.getElementById('eval');
    if (!dlg) return;
    lastFocus = doc.activeElement;
    if (slug) {
      dlg.querySelectorAll('input[data-slug]').forEach(function (cb) { if (cb.dataset.slug === slug) cb.checked = true; });
    }
    var mob = doc.getElementById('mobile-nav');
    if (mob && !mob.hidden) { mob.hidden = true; doc.querySelector('.burger').setAttribute('aria-expanded', 'false'); }
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    var first = dlg.querySelector('input:not([type=hidden]):not([name=bot-field])');
    if (first) first.focus();
  }
  function closeEval() {
    var dlg = doc.getElementById('eval');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---- video player (Vimeo) ---- */
  function openPlayer(src, title, href) {
    var dlg = doc.getElementById('player');
    if (!dlg) return;
    lastFocus = doc.activeElement;
    dlg.querySelector('.player-title').textContent = title || 'Saint Paul Agency';
    var ext = dlg.querySelector('.player-ext');
    if (href) { ext.href = href; ext.hidden = false; ext.textContent = /youtu/.test(href) ? 'Open on YouTube' : 'Open on Vimeo'; } else { ext.hidden = true; }
    var box0 = dlg.querySelector('.player-frame');
    if (window.SPA_PREVIEW) {
      box0.innerHTML = '<div class="player-note"><p>Videos play right here on the live site. This preview can\'t embed Vimeo.</p></div>';
      ext.hidden = !href;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      return;
    }
    var sep = src.indexOf('?') > -1 ? '&' : '?';
    var frame = doc.createElement('iframe');
    frame.src = src + (src.indexOf('autoplay') > -1 ? '' : sep + 'autoplay=1');
    frame.title = title || 'Video';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.setAttribute('allowfullscreen', '');
    var box = dlg.querySelector('.player-frame');
    box.innerHTML = '';
    box.appendChild(frame);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closePlayer() {
    var dlg = doc.getElementById('player');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  doc.addEventListener('close', function (ev) {
    if (ev.target && ev.target.id === 'player') {
      ev.target.querySelector('.player-frame').innerHTML = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }, true);

  /* ---- muted background loops inside TV screens, loaded after the page is ready ---- */
  function loadBgVideos() {
    var conn = navigator.connection;
    if (window.SPA_PREVIEW || reduce || (conn && (conn.saveData || /2g/.test(conn.effectiveType || '')))) return;
    doc.querySelectorAll('[data-vimeo-bg]').forEach(function (box) {
      if (box._loaded) return;
      box._loaded = true;
      var f = doc.createElement('iframe');
      f.src = 'https://player.vimeo.com/video/' + box.getAttribute('data-vimeo-bg') + '?background=1&autoplay=1&loop=1&muted=1&dnt=1';
      f.title = 'Saint Paul Agency video loop';
      f.allow = 'autoplay; fullscreen';
      f.tabIndex = -1;
      f.setAttribute('aria-hidden', 'true');
      box.appendChild(f);
    });
  }
  // Keep the poster frame up until Vimeo reports the loop is actually playing.
  window.addEventListener('message', function (ev) {
    if (!/^https:\/\/player\.vimeo\.com$/.test(ev.origin)) return;
    var data;
    try { data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (!data || !data.event) return;
    doc.querySelectorAll('[data-vimeo-bg] iframe, .ch-frame iframe').forEach(function (f) {
      if (f.contentWindow !== ev.source) return;
      if (data.event === 'ready') {
        ['play', 'playProgress', 'timeupdate'].forEach(function (name) {
          f.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: name }), 'https://player.vimeo.com');
        });
        if (f._paused) f.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), 'https://player.vimeo.com');
      } else if (data.event === 'play' || data.event === 'playProgress' || data.event === 'timeupdate') {
        if (f._paused) { f.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), 'https://player.vimeo.com'); }
        if (!f._live) {
          f._live = true;
          (f.closest('.ch') || f.parentNode).classList.add('playing');
          ['playProgress', 'timeupdate'].forEach(function (name) {
            f.contentWindow.postMessage(JSON.stringify({ method: 'removeEventListener', value: name }), 'https://player.vimeo.com');
          });
        }
      }
    });
  });
  if (doc.readyState === 'complete') setTimeout(loadBgVideos, 300);
  else window.addEventListener('load', function () { setTimeout(loadBgVideos, 300); });

  /* ---- forms (Netlify Forms: POST url-encoded to "/") ---- */
  doc.addEventListener('submit', function (ev) {
    var form = ev.target.closest('form.js-form');
    if (!form) return;
    ev.preventDefault();
    var msg = form.querySelector('.form-msg');
    var btn = form.querySelector('[type=submit]');
    msg.className = 'form-msg';
    msg.textContent = '';
    var svc = form.querySelector('input[name="services"]');
    if (svc) svc.value = [].map.call(form.querySelectorAll('[data-service]:checked'), function (c) { return c.value; }).join(', ');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (window.SPA_PREVIEW || window.SPA_FORMS_OFF) {
      msg.className = 'form-msg err';
      msg.textContent = 'Preview only. This form starts sending once the site is live.';
      return;
    }
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    var body = new URLSearchParams(new FormData(form)).toString();
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset();
        msg.className = 'form-msg ok';
        msg.textContent = form.getAttribute('data-success') || 'Sent.';
        track('form_submit', { form_name: form.getAttribute('name') });
      })
      .catch(function () {
        msg.className = 'form-msg err';
        msg.textContent = "That didn't send. Call " + PHONE + ' or email ' + EMAIL + " and we'll take it from there.";
      })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  });

  /* ---- on-screen ad countdown and slate timecode ---- */
  function tick() {
    var now = performance.now();
    doc.querySelectorAll('[data-countdown]').forEach(function (el) {
      if (!reduce && el.closest('.is-off')) return;
      var secs = parseInt(el.getAttribute('data-countdown'), 10) || 30;
      if (reduce) { el.textContent = '0:' + String(secs).padStart(2, '0'); return; }
      if (!el._t0) el._t0 = now;
      var left = Math.max(1, Math.ceil(secs - ((now - el._t0) / 1000) % secs));
      el.textContent = '0:' + String(left).padStart(2, '0');
    });
    doc.querySelectorAll('[data-timecode]').forEach(function (el) {
      if (reduce || el.closest('.is-off')) return;
      if (!el._t0) el._t0 = now;
      var f = Math.floor((now - el._t0) / (1000 / 24)) + 14 * 24 + 22;
      var s = Math.floor(f / 24) % 60, fr = f % 24;
      el.textContent = '00:00:' + String(s).padStart(2, '0') + ':' + String(fr).padStart(2, '0');
    });
  }
  setInterval(function () { if (!doc.hidden) tick(); }, 125);
  tick();

  /* ---- hero TV: client spots play full-bleed and the set changes channel ---- */
  function initHeroTV() {
    var box = doc.querySelector('[data-channels]');
    if (!box || box._tv) return;
    box._tv = true;
    var chans = [].slice.call(box.querySelectorAll('.ch'));
    var onair = doc.querySelector('.onair');
    var toggle = doc.querySelector('[data-tv-toggle]');
    var st = box.querySelector('.static');
    var conn = navigator.connection;
    var video = !reduce && !(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));
    var cur = 0, paused = reduce, timer = null, HOLD = 7000, heroOn = true;

    function post(f, method) { try { f.contentWindow.postMessage(JSON.stringify({ method: method }), 'https://player.vimeo.com'); } catch (e) {} }
    function poster(ch) {
      var im = ch.querySelector('img[data-src]');
      if (!im) return;
      if (im.getAttribute('data-srcset')) im.srcset = im.getAttribute('data-srcset');
      im.src = im.getAttribute('data-src');
      im.removeAttribute('data-src'); im.removeAttribute('data-srcset');
    }
    function load(ch) {
      poster(ch);
      if (!video || ch._f) return;
      var f = doc.createElement('iframe');
      f.src = 'https://player.vimeo.com/video/' + ch.getAttribute('data-vid') + '?background=1&autoplay=1&loop=1&muted=1&dnt=1#t=' + (ch.getAttribute('data-t') || 0) + 's';
      f.title = 'Client spot: ' + ch.getAttribute('data-client');
      f.allow = 'autoplay; fullscreen';
      f.tabIndex = -1;
      f.setAttribute('aria-hidden', 'true');
      f._paused = paused || !heroOn || ch !== chans[cur];
      ch.querySelector('.ch-frame').appendChild(f);
      ch._f = f;
    }
    function unload(ch) { if (ch._f) { ch._f.remove(); ch._f = null; ch.classList.remove('playing'); } }
    function label(ch) {
      if (!onair) return;
      onair.querySelector('.onair-client').textContent = ch.getAttribute('data-client');
      onair.querySelector('.onair-spot').textContent = ch.getAttribute('data-spot');
      onair.classList.remove('swap'); void onair.offsetWidth; onair.classList.add('swap');
      var w = onair.querySelector('[data-watch]');
      if (w) {
        var id = ch.getAttribute('data-vid');
        w.setAttribute('data-video', 'https://player.vimeo.com/video/' + id + '?autoplay=1&dnt=1');
        w.setAttribute('data-title', ch.getAttribute('data-client') + ' ' + ch.getAttribute('data-spot'));
        w.setAttribute('data-href', 'https://vimeo.com/' + id);
      }
    }
    function sync() {
      chans.forEach(function (c) {
        if (!c._f) return;
        var want = paused || !heroOn || c !== chans[cur];
        if (c._f._paused !== want) { c._f._paused = want; post(c._f, want ? 'pause' : 'play'); }
      });
    }
    function tuneTo(n) {
      var next = chans[n];
      if (st && !reduce) { st.classList.remove('flip'); void st.offsetWidth; st.classList.add('flip'); }
      chans[cur].classList.remove('on');
      next.classList.add('on');
      cur = n;
      load(next);
      sync();
      label(next);
      var seal = doc.querySelector('.hero-seal');
      if (seal && !reduce) { seal.classList.remove('flash'); void seal.offsetWidth; seal.classList.add('flash'); }
      var ahead = chans[(n + 1) % chans.length];
      chans.forEach(function (c) { if (c !== next && c !== ahead) unload(c); });
      poster(ahead);
      setTimeout(function () { load(ahead); }, 2500);
    }
    function schedule() {
      clearInterval(timer);
      if (paused || !heroOn) return;
      timer = setInterval(function () { if (!doc.hidden) tuneTo((cur + 1) % chans.length); }, HOLD);
    }
    if (toggle) {
      if (reduce) { toggle.setAttribute('aria-pressed', 'true'); toggle.querySelector('span').textContent = 'Play video'; }
      toggle.addEventListener('click', function () {
        paused = !paused;
        if (!paused && reduce) { video = true; load(chans[cur]); }
        toggle.setAttribute('aria-pressed', String(paused));
        track('hero_video_toggle', { state: paused ? 'paused' : 'playing' });
        toggle.querySelector('span').textContent = paused ? 'Play video' : 'Pause video';
        sync();
        schedule();
      });
    }
    function start() {
      poster(chans[1]);
      // Phones show the stills first and start video once the page has settled or the visitor touches it.
      var phone = matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
      var began = false;
      function go() {
        if (began) return; began = true;
        ['touchstart', 'scroll', 'pointerdown'].forEach(function (e) { window.removeEventListener(e, go); });
        load(chans[cur]);
        setTimeout(function () { load(chans[(cur + 1) % chans.length]); }, 2500);
      }
      if (phone) {
        poster(chans[0]);
        ['touchstart', 'scroll', 'pointerdown'].forEach(function (e) { window.addEventListener(e, go, { passive: true }); });
        setTimeout(go, 4000);
      } else go();
      schedule();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          if (heroOn === es[0].isIntersecting) return;
          heroOn = es[0].isIntersecting;
          sync();
          schedule();
        }).observe(box);
      }
    }
    if (doc.readyState === 'complete') setTimeout(start, 200);
    else window.addEventListener('load', function () { setTimeout(start, 200); });
  }
  initHeroTV();

  /* ---- scroll motion: headings wipe in, blocks slide up, numbers count ---- */
  var motion = !reduce && 'IntersectionObserver' in window;
  // Clipped elements don't register with IntersectionObserver, so check positions on scroll instead.
  var pending = [], ticking = false;
  function reveal(el) {
    el.classList.remove('rv-wait');
    setTimeout(function () { el.classList.add('rv-done'); }, 1200);
    el.querySelectorAll('dd[data-count]').forEach(countUp);
  }
  function checkReveal() {
    ticking = false;
    var line = window.innerHeight * 0.9;
    pending = pending.filter(function (el) {
      if (!el.isConnected) return false;
      if (el.getBoundingClientRect().top < line) { reveal(el); return false; }
      return true;
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(checkReveal); } }
  if (motion) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }
  var revealIO = { observe: function (el) { pending.push(el); onScroll(); } };

  function countUp(dd) {
    var m = dd.getAttribute('data-count').match(/^(\D*)(\d[\d,]*)(.*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ''), 10), t0 = performance.now(), dur = 1300;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - k, 3)));
      dd.textContent = m[1] + v.toLocaleString('en-US') + m[3];
      if (k < 1) requestAnimationFrame(step); else dd.textContent = dd.getAttribute('data-count');
    })(t0);
  }

  var RISE = '.case-row, .reels > li, .included > li, .grid-list > li, .trio > li, .steps > li, .related > li, .people > li, .leaders > li, .timeline > li, .faq, .rate-list > li, .partners > li, .industries > li, .lineup-group, .status > li, .stats > div, .facts > div, .results > div, .methods > li, .stage, .panel-fig, .artifact, .monitor, .industry-cta, .approach > li, .contact-card';
  function initReveal(root) {
    if (!motion) return;
    root = root || doc;
    doc.documentElement.classList.add('js-motion');
    var fold = window.innerHeight * 0.95;
    root.querySelectorAll('.stats dd, .facts dd, .results dd').forEach(function (dd) {
      var txt = dd.textContent.trim();
      if (/^\D*\d[\d,]*\D*$/.test(txt) && !/^(19|20)\d\d$/.test(txt) && dd.getBoundingClientRect().top > fold) dd.setAttribute('data-count', txt);
    });
    var seen = new Set();
    root.querySelectorAll('main h2:not(.sr), main ' + RISE.split(', ').join(', main ')).forEach(function (el) {
      if (seen.has(el) || el.closest('.hero-video, dialog, .menu, .launch')) return;
      seen.add(el);
      if (el.getBoundingClientRect().top < fold) return;
      var isHead = el.tagName === 'H2';
      el.classList.add(isHead ? 'rv-wipe' : 'rv', 'rv-wait');
      if (!isHead) {
        var i = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--d', (Math.min(i, 5) * 0.08) + 's');
      }
      revealIO.observe(el);
    });
  }
  initReveal();

  /* ---- FLOYD rocket: lift off when visible, run the mission clock ---- */
  function initLaunch(root) {
    (root || doc).querySelectorAll('[data-launch]').forEach(function (fig) {
      if (fig._l) return;
      fig._l = true;
      var clock = fig.querySelector('[data-mission-clock]'), t0 = null;
      function go() {
        if (fig.classList.contains('go')) return;
        fig.classList.add('go');
        t0 = performance.now();
        fig.querySelectorAll('.telemetry dd').forEach(function (dd) {
          var txt = dd.textContent.trim();
          if (motion && !/^(19|20)\d\d$/.test(txt)) { dd.setAttribute('data-count', txt); countUp(dd); }
        });
      }
      function tickClock() {
        if (clock && t0 !== null && fig.isConnected) {
          var s = Math.floor((performance.now() - t0) / 1000);
          var hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor(s / 60) % 60).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
          clock.textContent = 'T+ ' + hh + ':' + mm + ':' + ss;
        }
        if (fig.isConnected) setTimeout(tickClock, 500);
      }
      tickClock();
      if (!motion) { go(); return; }
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { go(); io.disconnect(); } }, { threshold: 0.35 });
      io.observe(fig);
    });
  }
  initLaunch();

  /* ---- channel-flip monitor beside the services list ---- */
  function tune(row) {
    var wrap = row.closest('[data-monitor]');
    if (!wrap) return;
    var slug = row.getAttribute('data-channel');
    var cur = wrap.querySelector('.mon-prog.on');
    if (cur && cur.getAttribute('data-prog') === slug) return;
    wrap.querySelectorAll('.rate-row.on-air').forEach(function (r) { r.classList.remove('on-air'); });
    row.classList.add('on-air');
    wrap.querySelectorAll('.mon-prog').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-prog') === slug); });
    var st = wrap.querySelector('.static');
    if (st && !reduce) { st.classList.remove('flip'); void st.offsetWidth; st.classList.add('flip'); }
  }
  doc.addEventListener('pointerover', function (ev) {
    var row = ev.target.closest && ev.target.closest('[data-monitor] .rate-row');
    if (row && ev.pointerType !== 'touch') tune(row);
  });
  doc.addEventListener('focusin', function (ev) {
    var row = ev.target.closest && ev.target.closest('[data-monitor] .rate-row');
    if (row) tune(row);
  });
  function initMonitors(root) {
    (root || doc).querySelectorAll('[data-monitor]').forEach(function (wrap) {
      var first = wrap.querySelector('.rate-row');
      if (first && !wrap.querySelector('.rate-row.on-air')) first.classList.add('on-air');
      // warm the other channels once the visitor reaches the list
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { wrap.querySelectorAll('.mon-prog img').forEach(function (im) { im.loading = 'eager'; }); io.disconnect(); }
        }, { rootMargin: '200px' });
        io.observe(wrap);
      }
    });
  }
  initMonitors();

  /* =================== NEXT LEVEL =================== */
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // header color bars as a video timeline; runs once per frame only while the page is scrolling
  var head = doc.querySelector('.site-head'), playhead = doc.querySelector('.playhead');
  var frameQueued = false, scrolled = null, phW = 0, docMax = 0;
  function measure() { phW = playhead ? playhead.offsetWidth : 0; docMax = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight); }
  function onFrameScroll() {
    frameQueued = false;
    var y = window.scrollY;
    if (!docMax) measure();
    if (playhead) {
      var p = Math.min(1, Math.max(0, y / docMax));
      playhead.style.setProperty('--p', p.toFixed(4));
      playhead.style.setProperty('--px', ((phW - 6) * p).toFixed(1) + 'px');
    }
    var s = y > 24;
    if (head && s !== scrolled) { scrolled = s; head.classList.toggle('is-scrolled', s); }
    updateSeal(y);
  }
  function queueFrame() { if (!frameQueued) { frameQueued = true; requestAnimationFrame(onFrameScroll); } }
  window.addEventListener('scroll', queueFrame, { passive: true });
  window.addEventListener('resize', function () { docMax = 0; queueFrame(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(function () { docMax = 0; queueFrame(); }).observe(doc.body);

  /* ---- sections out of view pause their looping motion (CSS: .is-off) ---- */
  var offIO = null;
  function initOffscreen() {
    if (!('IntersectionObserver' in window)) return;
    if (offIO) offIO.disconnect();
    offIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { en.target.classList.toggle('is-off', !en.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    var LOOPS = '.station-rings, .orb-layer, .launch, .marquee, .live, .progress, .stars, [data-countdown], [data-timecode], [data-channels]';
    doc.querySelectorAll('main > *, .site-foot').forEach(function (el) { if (el.querySelector(LOOPS)) offIO.observe(el); });
  }
  initOffscreen();

  // pointer effects: magnetic buttons and 3D tilt (mouse only)
  if (fine && !reduce) {
    var MAG = '.btn-signal, .hero-video .btn, .cta-actions .btn, .hero-404 .btn';
    var TILT = '.case-photo, .reel-thumb, .launch-window, .artifact > img, .stage-photo, .case-hero-photo, .leader-photo img';
    var px = 0, py = 0, ptrPending = false, curMag = null, curTilt = null, target = null;
    doc.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse') return;
      px = ev.clientX; py = ev.clientY; target = ev.target;
      if (!ptrPending) { ptrPending = true; requestAnimationFrame(applyPointer); }
    }, { passive: true });
    function clearMag() { if (curMag) { curMag.style.setProperty('--tx', '0px'); curMag.style.setProperty('--ty', '0px'); curMag = null; } }
    function clearTilt() { if (curTilt) { curTilt.style.transform = ''; curTilt.classList.remove('tilt-on'); curTilt = null; } }
    function applyPointer() {
      ptrPending = false;
      if (!target || !target.closest) return;
      var mg = target.closest(MAG);
      if (mg !== curMag) clearMag();
      if (mg) {
        var b = mg.getBoundingClientRect();
        mg.classList.add('magnet');
        mg.style.setProperty('--tx', Math.max(-10, Math.min(10, (px - (b.left + b.width / 2)) * 0.22)).toFixed(1) + 'px');
        mg.style.setProperty('--ty', Math.max(-8, Math.min(8, (py - (b.top + b.height / 2)) * 0.3)).toFixed(1) + 'px');
        curMag = mg;
      }
      var tl = target.closest(TILT);
      if (tl !== curTilt) clearTilt();
      if (tl) {
        var q = tl.getBoundingClientRect(), nx = (px - q.left) / q.width - 0.5, ny = (py - q.top) / q.height - 0.5;
        tl.classList.add('tilt-on');
        tl.style.transform = 'perspective(900px) rotateX(' + (-ny * 8).toFixed(2) + 'deg) rotateY(' + (nx * 10).toFixed(2) + 'deg) translateY(-6px) scale(1.02)';
        curTilt = tl;
      }
    }
    doc.addEventListener('pointerleave', function () { clearMag(); clearTilt(); });
  }

  /* ---- FLOYD easter egg: type "floyd" anywhere ---- */
  var ROCKET = '<svg viewBox="0 0 120 250" aria-hidden="true"><path fill="#FFC629" d="M44 176 Q60 250 76 176 Z"/><path fill="#fff" d="M51 176 Q60 222 69 176 Z"/>' +
    '<path fill="#233975" d="M31 118 L6 166 L9 184 L34 160 Z"/><path fill="#233975" d="M89 118 L114 166 L111 184 L86 160 Z"/>' +
    '<path fill="#fff" d="M60 8 C86 38 93 92 90 162 L30 162 C27 92 34 38 60 8 Z"/><path fill="#233975" d="M60 8 C71 21 78 36 82 50 L38 50 C42 36 49 21 60 8 Z"/>' +
    '<rect fill="#233975" x="31" y="128" width="58" height="9"/><circle fill="#5EA6F3" stroke="#233975" stroke-width="5" cx="60" cy="88" r="14"/>' +
    '<path fill="#2A3550" d="M43 160 L77 160 L71 177 L49 177 Z"/></svg>';
  var typed = '', eggBusy = false;
  function toast(msg) {
    var t = doc.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    doc.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3200);
    setTimeout(function () { t.remove(); }, 3800);
  }
  function launchEgg() {
    if (eggBusy) return;
    eggBusy = true;
    track('floyd_launch');
    toast('FLOYD is go for launch. It\u2019s not rocket science. But it\u2019s close.');
    if (reduce) { setTimeout(function () { eggBusy = false; }, 3800); return; }
    var r = doc.createElement('div');
    r.className = 'egg-rocket';
    r.innerHTML = ROCKET + '<span class="egg-trail"></span>';
    doc.body.appendChild(r);
    setTimeout(function () { r.remove(); eggBusy = false; }, 3200);
  }
  doc.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
    if (ev.key && ev.key.length === 1) {
      typed = (typed + ev.key.toLowerCase()).slice(-5);
      if (typed === 'floyd') { typed = ''; launchEgg(); }
    }
  });
  doc.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.mission-patch')) launchEgg(); });

  /* ---- 404: change channel lands on a random service ---- */
  function channelSurf(paths) {
    var next = paths[Math.floor(Math.random() * paths.length)];
    track('channel_surf', { destination: next });
    if (reduce) { location.href = next; return; }
    var s = doc.createElement('div');
    s.className = 'surf-static';
    doc.body.appendChild(s);
    setTimeout(function () { if (window.SPA_PREVIEW) { s.remove(); var a = doc.createElement('a'); a.href = next; doc.body.appendChild(a); a.click(); a.remove(); } else location.href = next; }, 450);
  }

  /* ---- big seals turn and shrink a little as the page scrolls; they never leave their own space ---- */
  var sealEl = null, badge = doc.querySelector('.site-head .logo-badge'), root = doc.documentElement;
  function initSeal() {
    if (sealEl) sealEl.style.transform = '';
    sealEl = reduce ? null : doc.querySelector('main [data-seal]');
    if (sealEl) { sealEl._h = 0; updateSeal(window.scrollY); }
  }
  function updateSeal(y) {
    if (!sealEl || !sealEl.isConnected) return;
    if (!sealEl._h) sealEl._h = Math.max(300, (sealEl.closest('.hero') || sealEl.parentNode).offsetHeight);
    var p = Math.min(1, Math.max(0, y / sealEl._h));
    if (p === sealEl._p) return;
    sealEl._p = p;
    sealEl.style.transform = p ? 'rotate(' + (-14 * p).toFixed(2) + 'deg) scale(' + (1 - 0.12 * p).toFixed(4) + ')' : '';
  }
  window.addEventListener('resize', function () { if (sealEl) { sealEl._h = 0; sealEl._p = -1; updateSeal(window.scrollY); } });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fitOrbits(); });

  /* ---- orbit: service names circling the big seal ---- */
  var orbs = [];
  function fitOrbits() {
    orbs.forEach(function (g) {
      var tp = g.querySelector('textPath'), t = g.querySelector('text');
      if (!tp || !t) return;
      var target = parseFloat(tp.getAttribute('textLength'));
      tp.removeAttribute('textLength');
      var len = t.getComputedTextLength(), fs = parseFloat(getComputedStyle(t).fontSize);
      if (len > 0) t.style.fontSize = (fs * target / len * 0.97).toFixed(2) + 'px';
      tp.setAttribute('textLength', target);
    });
  }
  function initOrbits() {
    orbs = [].slice.call(doc.querySelectorAll('[data-orbit] [data-orb]'));
    fitOrbits();
  }
  /* ---- first-visit intro: the seal fills the screen, then flies to its spot ---- */
  function runIdent() {
    var screen = doc.querySelector('.ident');
    if (!screen || !root.classList.contains('ident-on')) return;
    var seal = screen.querySelector('.ident-seal'), flown = false, done = false;
    function finish() {
      if (done) return; done = true;
      root.classList.remove('ident-on', 'ident-hold', 'ident-badge'); root.classList.add('ident-done');
      screen.remove();
      updateSeal(window.scrollY);
    }
    function land() {
      root.classList.remove('ident-hold');
      screen.classList.add('land');
      setTimeout(finish, 420);
    }
    function fly(fast) {
      if (flown) return; flown = true;
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.removeEventListener(ev, skip); });
      var target = doc.querySelector('main [data-seal]');
      var tr = target && target.getBoundingClientRect();
      if (!tr || tr.bottom < 0 || tr.top > window.innerHeight) { tr = badge && badge.getBoundingClientRect(); root.classList.add('ident-badge'); }
      var r = seal.getBoundingClientRect();
      screen.classList.add('fly');
      if (tr && r.width) {
        if (fast) seal.style.transitionDuration = '.35s';
        seal.style.transform = 'translate(' + (tr.left - r.left).toFixed(1) + 'px,' + (tr.top - r.top).toFixed(1) + 'px) scale(' + (tr.width / r.width).toFixed(4) + ')';
      }
      setTimeout(land, fast ? 360 : 720);
    }
    function skip() { fly(true); }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, skip, { passive: true }); });
    // hold the seal on screen long enough to read it, even on a slow connection
    var img = seal.querySelector('img'), late = !(img && img.complete);
    function ready() { setTimeout(function () { fly(false); }, Math.max(150, 1350 - performance.now(), late ? 900 : 0)); }
    if (img && !img.complete) { img.addEventListener('load', ready); img.addEventListener('error', ready); } else ready();
    setTimeout(function () { fly(true); }, 3600);
    setTimeout(finish, 4400);
  }

  window.SPA_INIT = function () { initMonitors(); initHeroTV(); initReveal(); initLaunch(); tick(); initSeal(); initOrbits(); initOffscreen(); docMax = 0; queueFrame(); setTimeout(loadBgVideos, 300); };
  initSeal();
  initOrbits();
  queueFrame();
  runIdent();
})();

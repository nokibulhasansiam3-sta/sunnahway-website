/* Sunnahway — one scroll loop drives the whole "Fajr to Isha" day. No libraries. */
(function () {
  window.__sw = 1;
  var d = document, root = d.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var range = function (v, a, b) { return clamp((v - a) / (b - a)); };

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  function ramp(list, t) {
    var x = clamp(t) * (list.length - 1), i = Math.min(Math.floor(x), list.length - 2);
    return mix(list[i], list[i + 1], x - i);
  }
  function ramps(hexes) { return hexes.map(rgb); }
  function lerpList(list, t) {
    var x = clamp(t) * (list.length - 1), i = Math.min(Math.floor(x), list.length - 2);
    return list[i] + (list[i + 1] - list[i]) * (x - i);
  }

  /* Word-by-word heading reveal: wraps text nodes, keeps <em>/<br>. */
  $$('[data-split]').forEach(function (el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          if (!c.textContent.trim()) return;
          var f = d.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (!part.trim()) { f.appendChild(d.createTextNode(' ')); return; }
            var w = d.createElement('span'), s = d.createElement('span');
            w.className = 'w'; s.textContent = part; s.style.setProperty('--w', n++);
            w.appendChild(s); f.appendChild(w);
          });
          node.replaceChild(f, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR' && !c.classList.contains('rot') && !c.classList.contains('sr')) walk(c);
      });
    })(el);
  });

  /* Reveal once on entry */
  var reveal = $$('[data-r],[data-split]');
  if (reduce || !('IntersectionObserver' in window)) reveal.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach(function (e) {
      /* Anything already on screen animates straight away, without waiting for the observer. */
      var b = e.getBoundingClientRect();
      if (b.top < innerHeight && b.bottom > 0 && !e.closest('.hh-veil')) e.classList.add('in');
      else io.observe(e);
    });
  }

  /* Counters */
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suffix || '', t0 = performance.now();
        (function step(t) {
          var k = clamp((t - t0) / 1500), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
          el.textContent = Math.round(v) + suf;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    $$('[data-count]').forEach(function (e) { cio.observe(e); });
  }

  /* Starfields: painted once, twinkle only while visible */
  $$('canvas.stars').forEach(function (cv) {
    var ctx = cv.getContext('2d'), stars = [], visible = true, last = 0, W, H;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    function size() {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(W * H / 9000); stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.pow(Math.random(), 1.5) * H * .85, r: Math.random() * 1.15 + .3, p: Math.random() * 6.28, s: Math.random() * .0016 + .0005 });
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#f7f2e6';
      stars.forEach(function (s) {
        ctx.globalAlpha = .28 + .62 * (reduce ? .7 : (Math.sin(t * s.s + s.p) + 1) / 2);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill();
      });
    }
    function loop(t) { if (!visible) return; if (t - last > 50) { draw(t); last = t; } requestAnimationFrame(loop); }
    size(); addEventListener('resize', size);
    if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver(function (es) {
      var was = visible; visible = es[0].isIntersecting; if (visible && !was) requestAnimationFrame(loop);
    }).observe(cv);
    if (!reduce) requestAnimationFrame(loop);
  });

  /* Rising suns in arch scenes */
  $$('.scene[data-rise]').forEach(function (s) {
    var y = s.dataset.rise;
    setTimeout(function () { s.style.setProperty('--sun-y', y); }, 120);
  });

  /* Scroll-driven pieces */
  var bar = $('.nav-day i');
  var hero = $('.hh'), heroStage = hero && $('.hh-stage', hero), heroArch = hero && $('.hh-arch', hero), heroCopy = hero && $('.hh-copy', hero), heroScene = hero && $('.scene', hero), heroVeil = hero && $('.hh-veil', hero), heroStars = hero && $('.stars', hero), heroCue = hero && $('.cue', hero);
  var HS = { s1: ramps(['#17324a', '#2f7ea6', '#d7e4dc']), s2: ramps(['#3f6079', '#7fbcc9', '#efe9d9']), s3: ramps(['#e08f62', '#f4d8a6', '#f4efe3']) };

  var story = $('.story-body'), thread = $('.thread'), steps = $$('.st'), storyScene = $('.story-pin .scene');
  var SS = { s1: ramps(['#17324a', '#2f7ea6', '#1a6f8c', '#351a3c']), s2: ramps(['#3f6079', '#86c1cc', '#c99a4e', '#8a2f45']), s3: ramps(['#e08f62', '#f4d8a6', '#e9b45c', '#e8774a']), y: [58, 26, 12, 62] };

  var day = $('.day'), dayStage = day && $('.day-stage', day), dayScreens = day ? $$('.day-screens img', day) : [], dayPanels = day ? $$('.day-p', day) : [], dayBtns = day ? $$('.day-rail button', day) : [], dayIdx = -1, dayStars = day && $('.stars', day);
  /*              Fajr       Dhuhr      Asr        Maghrib    Isha */
  var DS = { s1: ramps(['#0d1f33', '#0e4a66', '#5c3a14', '#2f1737', '#050d18']),
             s2: ramps(['#20445c', '#14677a', '#855720', '#74293f', '#0b1c2e']),
             s3: ramps(['#b76e56', '#4fa08c', '#d79a3f', '#e0683f', '#12303a']),
             d1: ramps(['#071019', '#0b3a3f', '#3a230c', '#1c0d22', '#03080f']) };

  var pars = $$('[data-par]'), ctaSun = $('.cta-sun'), ahPhone = $('[data-lift]');

  function frame() {
    ticking = false;
    var vh = innerHeight, vw = innerWidth, sy = scrollY;
    var max = root.scrollHeight - vh;
    if (bar) bar.parentNode.style.setProperty('--scroll', max > 0 ? clamp(sy / max).toFixed(4) : 0);

    if (hero && !reduce) {
      var r = hero.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh));
      if (r.bottom > 0) {
        var aw = heroArch.offsetWidth, ah = heroArch.offsetHeight;
        var ar = { left: heroArch.offsetLeft };
        var e = ease(range(p, .02, .95));
        var scale = 1 + e * (Math.max(vw / aw, vh / (ah * .55)) * 2.1 - 1);
        var dx = (vw / 2 - (ar.left + aw / 2)) * e;
        heroArch.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + (-e * vh * .12).toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
        var t = ease(range(p, .05, .85));
        heroScene.style.setProperty('--s1', ramp(HS.s1, t));
        heroScene.style.setProperty('--s2', ramp(HS.s2, t));
        heroScene.style.setProperty('--s3', ramp(HS.s3, t));
        if (p > .004 || heroScene.classList.contains('live')) { heroScene.classList.add('live'); heroScene.style.setProperty('--sun-y', (60 - e * 56).toFixed(1) + '%'); }
        var fade = 1 - range(p, .02, .34);
        heroCopy.style.opacity = fade;
        heroCopy.style.visibility = fade <= 0 ? 'hidden' : 'visible';
        heroCopy.style.translate = '0 ' + (-p * 150).toFixed(1) + 'px';
        if (heroStars) heroStars.style.opacity = 1 - range(p, .05, .5);
        if (heroCue) heroCue.style.opacity = 1 - range(p, 0, .08);
        heroVeil.style.setProperty('--veil', range(p, .8, .985).toFixed(3));
      }
    }

    if (story && thread) {
      var tr = thread.getBoundingClientRect(), tp = clamp((vh * .62 - tr.top) / tr.height);
      thread.style.setProperty('--draw', tp.toFixed(4));
      var active = 0;
      steps.forEach(function (st, i) { if (st.getBoundingClientRect().top < vh * .62) active = i; });
      steps.forEach(function (st, i) { st.classList.toggle('on', i === active); });
      if (storyScene) {
        var sp = clamp(tp);
        storyScene.style.setProperty('--s1', ramp(SS.s1, sp));
        storyScene.style.setProperty('--s2', ramp(SS.s2, sp));
        storyScene.style.setProperty('--s3', ramp(SS.s3, sp));
        storyScene.style.setProperty('--sun-y', lerpList(SS.y, sp).toFixed(1) + '%');
      }
    }

    if (day) {
      var dr = day.getBoundingClientRect(), dp = clamp(-dr.top / (dr.height - vh));
      if (dr.bottom > -vh && dr.top < vh * 2) {
        dayStage.style.setProperty('--s1', ramp(DS.s1, dp));
        dayStage.style.setProperty('--s2', ramp(DS.s2, dp));
        dayStage.style.setProperty('--s3', ramp(DS.s3, dp));
        dayStage.style.setProperty('--d1', ramp(DS.d1, dp));
        var sun = clamp(dp / .82);
        var small = vw <= 760, arc = Math.sin(sun * Math.PI);
        dayStage.style.setProperty('--x', (small ? 14 + sun * 72 : 39 + sun * 22).toFixed(1) + '%');
        dayStage.style.setProperty('--y', (small ? 88 - arc * 16 : 92 - arc * 84).toFixed(1) + '%');
        dayStage.style.setProperty('--so', (1 - range(dp, .8, .9)).toFixed(3));
        dayStage.style.setProperty('--mo', range(dp, .84, .96).toFixed(3));
        dayStage.style.setProperty('--dx', (-dp * 2.4).toFixed(2) + '%');
        if (dayStars) dayStars.style.opacity = Math.max(1 - range(dp, 0, .12), range(dp, .82, .96));
        var idx = Math.min(4, Math.floor(dp * 5));
        if (idx !== dayIdx) setDay(idx);
      }
    }

    if (!reduce) {
      pars.forEach(function (el) {
        var b = el.getBoundingClientRect();
        if (b.bottom < -200 || b.top > vh + 200) return;
        el.style.translate = '0 ' + (((b.top + b.height / 2) - vh / 2) * +el.dataset.par).toFixed(1) + 'px';
      });
      if (ctaSun) { var c = ctaSun.parentNode.getBoundingClientRect(); ctaSun.style.setProperty('--rise', (clamp((c.top + c.height * .3) / vh) * 120 - 40).toFixed(1) + 'px'); }
      if (ahPhone) { ahPhone.style.transform = 'translateY(' + (-Math.min(sy, vh * 1.2) * .08).toFixed(1) + 'px)'; }
    }
  }

  function setDay(i) {
    dayScreens.forEach(function (im, n) { im.classList.toggle('prev', n === dayIdx); im.classList.toggle('on', n === i); });
    dayPanels.forEach(function (x, n) { x.classList.toggle('on', n === i); });
    dayBtns.forEach(function (x, n) { x.classList.toggle('on', n === i); x.setAttribute('aria-current', n === i ? 'true' : 'false'); });
    dayIdx = i;
  }
  dayBtns.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var top = day.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (i + .5) / 5 * (day.offsetHeight - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  var ticking = false;
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  frame();

  /* Language rotator */
  var rot = $('.rot');
  if (rot && !reduce) {
    var words = $$('i', rot), wi = 0;
    setInterval(function () {
      if (d.hidden) return;
      var a = words[wi]; wi = (wi + 1) % words.length; var b = words[wi];
      a.classList.remove('on'); a.classList.add('off');
      b.classList.remove('off'); b.classList.add('on');
      setTimeout(function () { a.classList.remove('off'); }, 850);
    }, 2100);
  }

  /* Anatomy pins light up with their row */
  $$('[data-pin]').forEach(function (li) {
    var pin = $('.pin[data-n="' + li.dataset.pin + '"]');
    if (!pin) return;
    li.addEventListener('pointerenter', function () { pin.classList.add('hot'); });
    li.addEventListener('pointerleave', function () { pin.classList.remove('hot'); });
  });

  /* Mouse drag for the screenshot rail */
  var rail = $('.rail');
  if (rail && matchMedia('(pointer:fine)').matches) {
    var down = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', function (e) { down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
    addEventListener('pointerup', function () { down = false; rail.classList.remove('drag'); });
    addEventListener('pointermove', function (e) { if (down) { e.preventDefault(); rail.scrollLeft = sl - (e.clientX - sx); } });
  }

  /* Privacy table of contents */
  var toc = $$('.toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) toc.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    $$('.prose h2').forEach(function (h) { tio.observe(h); });
  }
})();

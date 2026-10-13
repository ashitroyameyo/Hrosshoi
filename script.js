(function () {
  "use strict";
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- masthead: fit "HROSSHO I" to the container width ---- */
  var mast = $("#masthead");
  function fitMasthead() {
    var wrap = mast.parentElement;
    var avail = wrap.clientWidth - parseFloat(getComputedStyle(wrap).paddingLeft) * 2;
    mast.style.fontSize = "100px";
    var w = mast.firstElementChild.getBoundingClientRect().width;
    if (w) mast.style.fontSize = (100 * avail / w) * 0.995 + "px";
  }
  fitMasthead();
  window.addEventListener("resize", fitMasthead);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMasthead);

  /* ---- theme: ember (black/red) <-> blood (red/black) ---- */
  var themeBtn = $("#themeBtn"), themeLabel = $("#themeLabel");
  function setTheme(t) {
    root.dataset.theme = t;
    themeLabel.textContent = t === "blood" ? "Ember mode" : "Blood mode";
    store.set("hrossho:theme", t);
  }
  setTheme(root.dataset.theme === "blood" ? "blood" : "ember");
  themeBtn.addEventListener("click", function () { setTheme(root.dataset.theme === "blood" ? "ember" : "blood"); });

  /* ---- mobile menu ---- */
  var menuBtn = $("#menuBtn"), nav = $("#nav");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.textContent = open ? "Close" : "Menu";
  });
  $$("#nav a").forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Menu"; }); });

  /* ---- motion toggle ---- */
  var motionBtn = $("#motionBtn"), motionLabel = $("#motionLabel"), tickerPause = $("#tickerPause");
  function setMotion(on) {
    root.dataset.motion = on ? "on" : "off";
    motionBtn.setAttribute("aria-pressed", String(!on));
    tickerPause.setAttribute("aria-pressed", String(!on));
    motionLabel.textContent = on ? "Motion on · pause" : "Motion off · play";
    tickerPause.textContent = on ? "Pause motion" : "Play motion";
    store.set("hrossho:motion", on ? "on" : "off");
    if (!on) $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
  var savedMotion = store.get("hrossho:motion");
  setMotion(!(reduceMq.matches || savedMotion === "off"));
  [motionBtn, tickerPause].forEach(function (b) { b.addEventListener("click", function () { setMotion(root.dataset.motion === "off"); }); });
  var motionOn = function () { return root.dataset.motion !== "off"; };

  /* ---- ticker: duplicate set for a seamless loop ---- */
  var track = $("#tickerTrack"), set = track.firstElementChild;
  var reps = Math.max(1, Math.ceil(window.innerWidth * 2 / Math.max(1, set.getBoundingClientRect().width)));
  for (var i = 0; i < reps * 2 - 1; i++) {
    var c = set.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    $$("a", c).forEach(function (a) { a.tabIndex = -1; });
    track.appendChild(c);
  }
  track.style.animationDuration = (reps * 2 * 16) + "s";

  /* ---- scroll: progress bar, parallax, ghost flame ---- */
  var progress = $("#progress"), ghost = $(".ghost-flame"), pars = $$("[data-parallax]");
  var ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    var y = scrollY;
    progress.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    if (motionOn()) {
      ghost.style.transform = "translate3d(8vw," + (-6 - y * 0.04) + "vh,0)";
      pars.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var mid = Math.max(-1.2, Math.min(1.2, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
        el.style.translate = "0 " + (mid * parseFloat(el.dataset.parallax)) + "px";
      });
    }
    ticking = false;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- cursor glow ---- */
  var glow = $(".glow");
  addEventListener("pointermove", function (e) {
    if (!motionOn()) return;
    glow.style.setProperty("--mx", e.clientX + "px");
    glow.style.setProperty("--my", e.clientY + "px");
  }, { passive: true });

  /* ---- reveal + section triggers + counters ---- */
  function countUp(el) {
    var target = +el.dataset.count, suf = el.dataset.suffix || "";
    if (!motionOn()) { el.textContent = target + suf; return; }
    var t0 = performance.now(), dur = 1400;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      var n = $("[data-count]", en.target);
      if (n && !n.dataset.done) { n.dataset.done = 1; countUp(n); }
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  $$(".reveal, .two-lines, .space").forEach(function (el, i) { el.style.transitionDelay = el.classList.contains("reveal") ? (i % 4) * 70 + "ms" : ""; io.observe(el); });

  /* ---- tilt cards ---- */
  $$(".tilt").forEach(function (card) {
    if (card.classList.contains("event")) return; // rows stay flat for readability
    card.addEventListener("pointermove", function (e) {
      if (!motionOn()) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(900px) rotateY(" + x * 6 + "deg) rotateX(" + -y * 6 + "deg)";
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  });

  /* ---- magnetic button ---- */
  $$(".magnet").forEach(function (b) {
    b.addEventListener("pointermove", function (e) {
      if (!motionOn()) return;
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.15 + "px," + (e.clientY - r.top - r.height / 2) * 0.25 + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });

  /* ---- programme filter ---- */
  var chips = $$(".chip"), events = $$(".event"), empty = $("#emptyMsg");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.dataset.filter, shown = 0;
      chips.forEach(function (c) { c.classList.toggle("is-on", c === chip); c.setAttribute("aria-pressed", c === chip); });
      events.forEach(function (ev) {
        var ok = f === "all" || ev.dataset.cat.split(" ").indexOf(f) > -1;
        ev.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
    });
  });

  /* ---- countdown to the next (demo) event ---- */
  var cd = $("#countdown"), target = new Date("2026-10-17T17:00:00+06:00").getTime();
  function tick() {
    var d = target - Date.now();
    if (d <= 0) { cd.textContent = "Tonight"; return; }
    var days = Math.floor(d / 864e5), hrs = Math.floor(d % 864e5 / 36e5);
    cd.textContent = days + "d " + hrs + "h to go";
  }
  tick(); setInterval(tick, 60000);

  /* ---- do not press ---- */
  var press = $("#pressBtn"), burst = $("#burst");
  press.addEventListener("click", function () {
    var r = press.getBoundingClientRect();
    burst.style.setProperty("--bx", (r.left + r.width / 2) + "px");
    burst.style.setProperty("--by", (r.top + r.height / 2) + "px");
    burst.classList.remove("go"); void burst.offsetWidth; burst.classList.add("go");
    if (motionOn()) { document.body.classList.add("shake"); setTimeout(function () { document.body.classList.remove("shake"); }, 500); }
    press.setAttribute("aria-pressed", "true");
    setTimeout(function () { press.setAttribute("aria-pressed", "false"); }, 1500);
  });

  /* ---- newsletter (front-end only) ---- */
  var form = $("#newsForm"), msg = $("#formMsg"), email = $("#email");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) { msg.textContent = "Please enter a valid email address."; email.focus(); return; }
    msg.textContent = "Thanks! We’ll be in touch with the next programme.";
    form.reset();
  });
})();

/* Injected only into the throwaway _audit.html copy for automated QA.
   Renders a JSON report into <pre#__audit> so Chrome --dump-dom can hand it back.

   Media playback in headless Chrome + virtual time is unreliable, so media
   actions are verified by intercepting HTMLMediaElement.play/pause and by
   dispatching synthetic 'ended' events; visual state is checked separately. */
(function () {
  "use strict";

  var START = "AUDIT_JSON_START";
  var END = "AUDIT_JSON_END";
  var report = { viewport: {}, tests: [], errors: [], contrast: [] };
  var playLog = [];

  window.addEventListener("error", function (e) {
    report.errors.push("error: " + String(e.message));
  });
  window.addEventListener("unhandledrejection", function (e) {
    report.errors.push("rejection: " + String(e.reason));
  });

  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  function ok(name, pass, detail) {
    report.tests.push({ name: name, pass: !!pass, detail: detail });
  }
  function css(el, prop) {
    return getComputedStyle(el).getPropertyValue(prop).trim();
  }
  function rect(el) {
    var r = el.getBoundingClientRect();
    return {
      x: +r.x.toFixed(1),
      y: +r.y.toFixed(1),
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
      top: +r.top.toFixed(1),
      bottom: +r.bottom.toFixed(1)
    };
  }
  function parseColor(str) {
    var m = String(str).match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1];
  }
  function bgOf(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      var c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c[3] > 0.9) return c;
      node = node.parentElement;
    }
    return [255, 255, 255, 1];
  }
  function luminance(rgb) {
    var ch = rgb.slice(0, 3).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(fg, bg) {
    var a = luminance(fg);
    var b = luminance(bg);
    return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
  }
  function canvasInk(canvas) {
    var ctx = canvas.getContext("2d");
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var painted = 0;
    for (var i = 3; i < data.length; i += 4) {
      if (data[i] > 10) painted++;
    }
    return +((painted / (data.length / 4)) * 100).toFixed(1);
  }
  function gridCols(el) {
    var tpl = getComputedStyle(el).gridTemplateColumns;
    return tpl ? tpl.split(" ").filter(Boolean).length : 0;
  }
  function key(k, code) {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: k, code: code || "", bubbles: true, cancelable: true })
    );
  }

  async function waitFor(predicate, timeout) {
    var started = Date.now();
    while (!predicate() && Date.now() - started < timeout) {
      await sleep(50);
    }
    return predicate();
  }

  (async function () {
    await sleep(400);
    await waitFor(function () {
      var nodes = document.querySelectorAll("canvas.wave");
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].width || !nodes[i].height) return false;
      }
      return nodes.length > 0;
    }, 4000);

    /* capture media intents rather than relying on the headless media clock */
    var origPlay = HTMLMediaElement.prototype.play;
    var origPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () {
      playLog.push({ op: "play", src: String(this.src).split("/").pop() });
      var result = origPlay.apply(this, arguments);
      if (result && result.catch) result.catch(function () {});
      return result;
    };
    HTMLMediaElement.prototype.pause = function () {
      playLog.push({ op: "pause", src: String(this.src).split("/").pop() });
      return origPause.apply(this, arguments);
    };

    var docEl = document.documentElement;
    if (location.hash) {
      await sleep(500);
      var hashTarget = document.getElementById(location.hash.slice(1));
      report.hashCheck = {
        hash: location.hash,
        found: !!hashTarget,
        scrollY: Math.round(window.scrollY),
        top: hashTarget ? Math.round(hashTarget.getBoundingClientRect().top) : null
      };
    }
    report.viewport = {
      w: innerWidth,
      h: innerHeight,
      dpr: devicePixelRatio,
      lang: docEl.getAttribute("data-lang"),
      theme: docEl.getAttribute("data-theme"),
      pageHeight: docEl.scrollHeight
    };
    var isNarrow = innerWidth < 700;
    var isWide = innerWidth >= 1200;

    /* ---------- structure ---------- */
    var cases = document.querySelectorAll(".case");
    var players = document.querySelectorAll(".player");
    var canvases = document.querySelectorAll("canvas.wave");
    var seqBtns = document.querySelectorAll(".seq-btn");
    var playBtns = document.querySelectorAll(".player .play");
    ok("7 case sections", cases.length === 7, cases.length);
    ok("49 players (42 model + 7 ref)", players.length === 49, players.length);
    ok("49 waveforms", canvases.length === 49, canvases.length);
    ok("7 sequence buttons", seqBtns.length === 7, seqBtns.length);
    ok("49 play buttons", playBtns.length === 49, playBtns.length);
    ok("42 model clips", document.querySelectorAll(".clip").length === 42, document.querySelectorAll(".clip").length);

    var emptyAria = [];
    Array.prototype.forEach.call(playBtns, function (b) {
      if (!b.getAttribute("aria-label")) emptyAria.push(b.className);
    });
    ok("play buttons have aria-label", emptyAria.length === 0, emptyAria.length);

    var ids = {};
    var dupes = [];
    Array.prototype.forEach.call(document.querySelectorAll("[id]"), function (n) {
      if (ids[n.id]) dupes.push(n.id);
      ids[n.id] = true;
    });
    ok("no duplicate ids", dupes.length === 0, dupes);

    var inks = [];
    for (var i = 0; i < canvases.length; i += 7) inks.push(canvasInk(canvases[i]));
    ok("waveforms painted", inks.every(function (v) { return v > 2; }), inks);

    /* ---------- layout ---------- */
    var offenders = [];
    Array.prototype.forEach.call(document.querySelectorAll("body *"), function (el) {
      if (el.closest(".case-nav-track") || el.closest(".skip-link")) return;
      var r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) {
        offenders.push({ tag: el.tagName, cls: String(el.className).slice(0, 36), left: +r.left.toFixed(1) });
      }
    });
    ok("no horizontal overflow", offenders.length === 0, offenders.slice(0, 4));
    ok("document fits viewport width", docEl.scrollWidth <= innerWidth + 1, docEl.scrollWidth + " vs " + innerWidth);

    var playerCols = gridCols(document.querySelector(".players"));
    ok(
      isWide ? "model grid = 3 columns on desktop" : isNarrow ? "model grid = 1 column on phone" : "model grid = 2 columns on tablet",
      isWide ? playerCols === 3 : isNarrow ? playerCols === 1 : playerCols === 2,
      playerCols
    );

    var infoRect = rect(document.querySelector(".case-info"));
    var refRect = rect(document.querySelector(".ref-box"));
    ok(
      isNarrow ? "reference box stacks under text on phone" : "reference box sits beside text",
      isNarrow ? refRect.top > infoRect.top + 10 : Math.abs(refRect.top - infoRect.top) < 3,
      { info: infoRect.top, ref: refRect.top }
    );

    var clipRect = rect(document.querySelector(".clip"));
    ok("clip height is compact", clipRect.h > 55 && clipRect.h < 130, clipRect.h);

    var overlap = [];
    Array.prototype.forEach.call(cases, function (c, idx) {
      if (idx === 0) return;
      var prev = cases[idx - 1].getBoundingClientRect();
      var cur = c.getBoundingClientRect();
      if (cur.top < prev.bottom - 1) overlap.push(idx);
    });
    ok("case cards do not overlap", overlap.length === 0, overlap);

    ok(
      "target text uses serif face",
      /serif|Songti|Palatino|Georgia/i.test(css(document.querySelector(".target-text"), "font-family")),
      css(document.querySelector(".target-text"), "font-family").slice(0, 56)
    );
    ok("header is sticky", css(document.querySelector(".site-header"), "position") === "sticky", "");
    ok(
      "case has scroll-margin",
      css(document.querySelector(".case"), "scroll-margin-top") !== "0px",
      css(document.querySelector(".case"), "scroll-margin-top")
    );

    /* ---------- i18n ---------- */
    var emptyText = [];
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n], [data-i18n-html]"), function (n) {
      if (!n.textContent.trim()) emptyText.push(n.getAttribute("data-i18n") || n.getAttribute("data-i18n-html"));
    });
    ok("all data-i18n slots filled", emptyText.length === 0, emptyText.slice(0, 5));

    var langBtn = document.getElementById("lang-toggle");
    var beforeLang = docEl.getAttribute("data-lang");
    langBtn.click();
    await sleep(150);
    var afterLang = docEl.getAttribute("data-lang");
    ok("language toggles", beforeLang !== afterLang, beforeLang + " -> " + afterLang);
    ok("html[lang] matches", docEl.lang === (afterLang === "zh" ? "zh-CN" : "en"), docEl.lang);
    ok("title localised", /DSI-CDTTS/.test(document.title), document.title);
    var lede = document.querySelector(".lede").textContent.trim();
    ok("lede text rendered", lede.length > 40, lede.slice(0, 64));
    var titleText = document.querySelector(".case-title").textContent;
    ok("case title shows native + roman", titleText.indexOf("粤语") >= 0 && /Yue/.test(titleText), titleText);
    ok(
      "nav chip follows language",
      document.querySelector(".nav-chip").textContent.trim() === (afterLang === "en" ? "Yue" : "粤语"),
      document.querySelector(".nav-chip").textContent.trim()
    );
    ok(
      "player aria-label follows language",
      /Play|播放/.test(document.querySelector(".clip .play").getAttribute("aria-label")),
      document.querySelector(".clip .play").getAttribute("aria-label")
    );
    langBtn.click();
    await sleep(120);
    ok("language toggles back", docEl.getAttribute("data-lang") === beforeLang, docEl.getAttribute("data-lang"));

    /* ---------- theme ---------- */
    var themeBtn = document.getElementById("theme-toggle");
    var themeBefore = docEl.getAttribute("data-theme");
    var waveBefore = css(docEl, "--wave");
    var inkBefore = canvasInk(canvases[0]);
    themeBtn.click();
    await sleep(150);
    ok("theme toggles", themeBefore !== docEl.getAttribute("data-theme"), themeBefore + " -> " + docEl.getAttribute("data-theme"));
    ok("palette changes with theme", css(docEl, "--wave") !== waveBefore, waveBefore + " -> " + css(docEl, "--wave"));
    ok("canvas repainted after theme switch", canvasInk(canvases[0]) > 2, canvasInk(canvases[0]));
    themeBtn.click();
    await sleep(120);
    ok(
      "theme toggles back",
      docEl.getAttribute("data-theme") === themeBefore && canvasInk(canvases[0]) === inkBefore,
      docEl.getAttribute("data-theme")
    );

    /* ---------- contrast ---------- */
    var probes = [
      [".lede", "lede"], [".hint", "hint"], [".clip-name", "clip name"],
      [".clip-note", "clip note"], [".clip-dur", "clip duration"],
      [".ref-label", "ref label"], [".ref-region", "ref region"],
      [".target-label", "target label"], [".case-index", "case index"],
      [".nav-chip", "nav chip"], [".seq-btn", "seq button"], [".time", "time"],
      [".task-kicker", "task kicker"], [".task-sub", "task sub"],
      [".brand-sub", "brand sub"], [".footer-inner", "footer"],
      [".footer-meta", "footer meta"], [".stats dt", "stat label"], [".pill", "pill"]
    ];
    var contrasts = [];
    probes.forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (!el) return;
      contrasts.push({
        what: pair[1],
        ratio: contrast(parseColor(getComputedStyle(el).color), bgOf(el)),
        size: css(el, "font-size")
      });
    });
    contrasts.sort(function (a, b) { return a.ratio - b.ratio; });
    report.contrast = contrasts;
    var lowContrast = contrasts.filter(function (c) { return c.ratio < 4.5; });
    ok("all sampled text contrast >= 4.5", lowContrast.length === 0, lowContrast);

    /* ---------- anchor + sticky header ---------- */
    docEl.style.scrollBehavior = "auto";
    var case4 = document.getElementById("case-04_dongbei_s12");
    case4.scrollIntoView();
    await sleep(400);
    /* headless dump-dom does not always deliver scroll events; nudge the handler */
    window.dispatchEvent(new Event("scroll"));
    await sleep(100);
    var headerH = document.querySelector(".site-header").getBoundingClientRect().height;
    ok("header stays at viewport top when scrolled", Math.abs(document.querySelector(".site-header").getBoundingClientRect().top) < 1, "");
    ok(
      "anchored case clears sticky header",
      case4.getBoundingClientRect().top >= headerH - 2,
      { caseTop: +case4.getBoundingClientRect().top.toFixed(1), headerH: +headerH.toFixed(1), scrollY: Math.round(scrollY) }
    );
    var active = document.querySelector(".nav-chip.is-active");
    ok(
      "nav chip highlights the scrolled-to case",
      !!active && active.textContent.trim() === (docEl.getAttribute("data-lang") === "en" ? "Northeastern" : "东北话"),
      active ? active.textContent.trim() : null
    );

    /* ---------- lazy audio ---------- */
    var mp3Requests = performance.getEntriesByType("resource").filter(function (e) {
      return /\.mp3(\?|$)/.test(e.name);
    });
    ok("audio not downloaded before interaction", mp3Requests.length === 0, mp3Requests.length);

    /* ---------- playback ---------- */
    var casesEl = document.querySelector(".cases");
    window.scrollTo(0, casesEl.getBoundingClientRect().top + scrollY - 30);
    await sleep(250);
    var clips = document.querySelectorAll(".clip");
    playLog.length = 0;
    clips[0].querySelector(".play").click();
    await sleep(250);
    ok("play button starts first clip", playLog.some(function (e) { return e.op === "play" && /01_main/.test(e.src); }), playLog.slice(-3));
    var a1 = clips[0].querySelector("audio");
    ok("audio element created on demand", !!a1, !!a1);
    ok("player shows is-playing", clips[0].querySelector(".player").classList.contains("is-playing"), "");
    playLog.length = 0;
    clips[1].querySelector(".play").click();
    await sleep(250);
    ok(
      "starting a clip pauses the previous one",
      playLog.some(function (e) { return e.op === "pause" && /01_main/.test(e.src); }) &&
        playLog.some(function (e) { return e.op === "play" && /02_m2d/.test(e.src); }),
      playLog.slice()
    );
    var a2 = clips[1].querySelector("audio");
    clips[1].querySelector(".play").click();
    await sleep(200);
    ok("clicking again pauses", a2 && a2.paused === true, a2 ? a2.paused : null);

    /* ---------- waveform seek ---------- */
    var wrap = clips[0].querySelector(".wave-wrap");
    var wr = wrap.getBoundingClientRect();
    var waveDebug = { fired: 0, rect: rect(wrap), errors: [] };
    wrap.addEventListener("pointerdown", function () { waveDebug.fired++; });
    try {
      wrap.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true, clientX: wr.left + wr.width * 0.5, clientY: wr.top + wr.height / 2, pointerId: 1
        })
      );
    } catch (e) {
      waveDebug.errors.push(String(e));
    }
    await sleep(300);
    waveDebug.times = Array.prototype.map.call(clips, function (c, i) {
      if (i > 3) return null;
      return c.querySelector(".time").textContent;
    }).filter(Boolean);
    waveDebug.audios = Array.prototype.map.call(clips, function (c, i) {
      if (i > 1) return null;
      var a = c.querySelector("audio");
      return a ? { rs: a.readyState, ns: a.networkState, dur: a.duration, ct: a.currentTime, err: a.error && a.error.code } : null;
    }).filter(Boolean);
    report.waveDebug = waveDebug;
    var seekedTime = clips[0].querySelector(".time").textContent;
    ok("clicking the waveform seeks", seekedTime !== "0:00", seekedTime);

    /* ---------- sequence ---------- */
    playLog.length = 0;
    var seqBtn = document.querySelector(".seq-btn");
    seqBtn.click();
    await sleep(250);
    ok("sequence starts", seqBtn.classList.contains("is-active"), seqBtn.textContent.trim());
    ok(
      "sequence plays the main model first",
      playLog.length > 0 && playLog[0].op === "play" && /01_main/.test(playLog[0].src),
      playLog.slice(0, 2)
    );
    clips[0].querySelector("audio").dispatchEvent(new Event("ended"));
    await sleep(250);
    ok(
      "sequence advances to next system",
      playLog.some(function (e) { return e.op === "play" && /02_m2d/.test(e.src); }),
      playLog.slice(-2)
    );
    clips[1].querySelector("audio").dispatchEvent(new Event("ended"));
    await sleep(250);
    ok(
      "sequence keeps advancing",
      playLog.some(function (e) { return e.op === "play" && /03_cv3_1ref_10k/.test(e.src); }),
      playLog.slice(-2)
    );
    seqBtn.click();
    await sleep(200);
    ok("sequence stops", !seqBtn.classList.contains("is-active"), seqBtn.textContent.trim());

    /* ---------- keyboard ---------- */
    playLog.length = 0;
    document.body.focus();
    key(" ", "Space");
    await sleep(300);
    ok("space toggles playback", playLog.length > 0, playLog.slice(-2));
    var beforeArrow = Array.prototype.map.call(document.querySelectorAll(".time"), function (n) {
      return n.textContent;
    }).join("|");
    key("ArrowRight");
    await sleep(250);
    var afterArrow = Array.prototype.map.call(document.querySelectorAll(".time"), function (n) {
      return n.textContent;
    }).join("|");
    ok("right arrow seeks forward", beforeArrow !== afterArrow, { before: beforeArrow.slice(0, 30), after: afterArrow.slice(0, 30) });

    /* ---------- output ---------- */
    var pre = document.createElement("pre");
    pre.id = "__audit";
    pre.textContent = START + JSON.stringify(report) + END;
    document.body.appendChild(pre);
  })();
})();

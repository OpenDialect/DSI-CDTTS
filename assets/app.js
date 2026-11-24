/* ==========================================================================
   DSI-CDTTS audio demo — all behaviour, no dependencies.
   Works from file:// as well as from a static host (relative URLs, no fetch).
   ========================================================================== */

(function () {
  "use strict";

  var DATA = window.DEMO_DATA;
  var CLIPS = window.DEMO_CLIPS || {};
  if (!DATA) {
    return;
  }

  var root = document.documentElement;
  var state = {
    lang: root.getAttribute("data-lang") === "zh" ? "zh" : "en",
    theme: root.getAttribute("data-theme") === "dark" ? "dark" : "light",
    current: null,
    seq: null
  };

  var players = [];
  var caseRecords = [];
  var chips = [];
  var activeChip = -1;
  var dynamicUpdaters = [];
  var staticNodes = [];
  var ariaNodes = [];
  var wrapToPlayer = new WeakMap();
  var rafId = 0;
  var palette = { wave: "#d3cbbd", played: "#b23a26" };
  var ICON_PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>';
  var ICON_STOP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  /* ------------------------------------------------------------------ i18n */

  var I18N = {
    en: {
      pageTitle: "DSI-CDTTS · Cross-Dialect Voice Cloning Demo",
      skip: "Skip to demo",
      brandSub: "Audio Demo",
      navAria: "Jump to a dialect case",
      eyebrow: "Anonymous submission · Audio demo",
      h1a: "Cross-Dialect Voice Cloning",
      h1b: "Demo",
      lede:
        "A reference recording in one Chinese dialect, a target sentence in another. " +
        "The task: keep the speaker, switch the variety. Seven dialects, six systems, " +
        "one clip per system — listen and judge for yourself.",
      taskRefKicker: "Reference voice",
      taskRefMain: "Source-dialect speech",
      taskRefSub: "the speaker to preserve",
      taskTextKicker: "Target text",
      taskTextMain: "Another dialect",
      taskTextSub: "the content to speak",
      taskOutKicker: "Generated speech",
      taskOutMain: "Target dialect, same voice",
      taskOutSub: "6 systems to compare",
      statDialects: "Dialects",
      statSystems: "Systems",
      statClips: "Clips",
      hintHtml:
        "Headphones recommended · <kbd>Space</kbd> play / pause · " +
        "<kbd>←</kbd> <kbd>→</kbd> seek 5 s · <kbd>Esc</kbd> stop",
      demoHeading: "Listen to the demos",
      refLabel: "Reference voice",
      targetLabel: "Target text",
      playAll: "Play all",
      stopSeq: "Stop",
      oursTag: "OURS",
      playAria: "Play {label} — {dialect} case",
      pauseAria: "Pause {label} — {dialect} case",
      seqAria: "Play all six systems of the {dialect} case back to back",
      themeToggleAria: "Switch between light and dark theme",
      langToggleAria: "Switch to Chinese",
      footerTitle: "Anonymous submission · For review only",
      footerData:
        "Seven Chinese dialects × six systems: 42 generated clips plus 7 reference " +
        "recordings. Model outputs are the raw evaluation files (48 kHz mono MP3) — " +
        "no loudness normalisation or other post-processing has been applied.",
      footerNoMetrics:
        "This page deliberately shows no objective or subjective scores; all metrics " +
        "are reported in the paper.",
      footerOffline:
        "Everything here is self-contained: no external fonts, scripts or analytics. " +
        "The page also works offline from a local copy.",
      footerMeta: "Static HTML · CSS · JS · 49 audio clips · no trackers",
      noAudio: "Audio failed to load"
    },
    zh: {
      pageTitle: "DSI-CDTTS · 跨方言语音克隆试听 Demo",
      skip: "跳到试听",
      brandSub: "音频 Demo",
      navAria: "跳转到某个方言 case",
      eyebrow: "匿名投稿 · 音频 Demo",
      h1a: "跨方言语音克隆",
      h1b: "试听 Demo",
      lede:
        "给定一条汉语方言的参考录音，和一句另一种方言的目标文本。任务要求：保留说话人音色，" +
        "同时切换到目标方言。七个方言、六个系统，每个 case 六段生成音频——请直接试听判断。",
      taskRefKicker: "参考音色",
      taskRefMain: "源方言语音",
      taskRefSub: "需要保留的说话人",
      taskTextKicker: "目标文本",
      taskTextMain: "另一种方言",
      taskTextSub: "需要合成的内容",
      taskOutKicker: "生成语音",
      taskOutMain: "目标方言 + 同一音色",
      taskOutSub: "6 个系统对比",
      statDialects: "方言",
      statSystems: "系统",
      statClips: "音频",
      hintHtml:
        "建议佩戴耳机 · <kbd>空格</kbd> 播放 / 暂停 · " +
        "<kbd>←</kbd> <kbd>→</kbd> 快退 / 快进 5 秒 · <kbd>Esc</kbd> 停止",
      demoHeading: "试听",
      refLabel: "参考音色",
      targetLabel: "目标文本",
      playAll: "顺序播放",
      stopSeq: "停止",
      oursTag: "本文",
      playAria: "{dialect} case：播放 {label}",
      pauseAria: "{dialect} case：暂停 {label}",
      seqAria: "顺序播放 {dialect} case 的六个系统",
      themeToggleAria: "切换浅色 / 深色主题",
      langToggleAria: "Switch to English",
      footerTitle: "匿名投稿 · 仅供评审",
      footerData:
        "七个汉语方言 × 六个系统：42 段生成音频与 7 段参考录音。模型输出为评测原始文件" +
        "（48 kHz 单声道 MP3），未做响度归一化或其他后处理。",
      footerNoMetrics: "本页刻意不展示客观 / 主观指标，完整指标见论文。",
      footerOffline:
        "本页完全自包含：无外部字体、脚本或统计代码，下载到本地也可离线试听。",
      footerMeta: "静态 HTML · CSS · JS · 49 段音频 · 无追踪",
      noAudio: "音频加载失败"
    }
  };

  function t(key, lang) {
    var L = lang || state.lang;
    var table = I18N[L] || I18N.en;
    var value = table[key];
    if (value == null) {
      value = I18N.en[key];
    }
    return value == null ? "" : value;
  }

  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars && vars[key] != null ? vars[key] : "";
    });
  }

  function dialectName(dialect, lang) {
    var entry = DATA.dialects[dialect];
    if (!entry) {
      return dialect;
    }
    return entry[(lang || state.lang) === "zh" ? "zh" : "en"];
  }

  function modelLabel(key, lang) {
    var m = DATA.models[key];
    if (!m) {
      return key;
    }
    return m[(lang || state.lang) === "zh" ? "labelZh" : "labelEn"];
  }

  function modelNote(key, lang) {
    var m = DATA.models[key];
    if (!m) {
      return "";
    }
    return m[(lang || state.lang) === "zh" ? "noteZh" : "noteEn"];
  }

  /* ---------------------------------------------------------------- helpers */

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      seconds = 0;
    }
    var total = Math.floor(seconds + 0.0001);
    return Math.floor(total / 60) + ":" + pad2(total % 60);
  }

  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds <= 0) {
      return "";
    }
    return seconds.toFixed(1) + "s";
  }

  function make(tag, className) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    return node;
  }

  function savePref(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* file:// or private mode: preference is simply not persisted */
    }
  }

  /* --------------------------------------------------------------- palette */

  function refreshPalette() {
    var cs = getComputedStyle(root);
    palette.wave = cs.getPropertyValue("--wave").trim() || "#d3cbbd";
    palette.played = cs.getPropertyValue("--wave-play").trim() || "#b23a26";
  }

  /* ---------------------------------------------------------------- player */

  function createPlayer(opts) {
    var clip = CLIPS[opts.src] || {};
    var p = {
      src: opts.src,
      kind: opts.kind,
      caseData: opts.caseData,
      caseIndex: opts.caseIndex,
      clipIndex: opts.clipIndex,
      getLabel: opts.getLabel,
      peaks: clip.peaks || null,
      duration: clip.duration || 0,
      audio: null,
      playing: false,
      error: false,
      progress: 0,
      cssW: 0,
      cssH: 0,
      dpr: 0,
      dragging: false,
      pendingSeek: null,
      durEl: opts.durEl || null
    };

    var wrap = make("div", "player" + (opts.kind === "ref" ? " player--ref" : ""));
    var btn = make("button", "play");
    btn.type = "button";
    btn.innerHTML =
      '<svg class="ic-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>' +
      '<svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="7" y="5" width="3.6" height="14" rx="1.3"/>' +
      '<rect x="13.4" y="5" width="3.6" height="14" rx="1.3"/></svg>';

    var waveWrap = make("div", "wave-wrap");
    var canvas = make("canvas", "wave");
    canvas.setAttribute("aria-hidden", "true");
    waveWrap.appendChild(canvas);

    var timeEl = make("span", "time");
    timeEl.textContent = "0:00";

    wrap.append(btn, waveWrap, timeEl);

    p.wrap = wrap;
    p.btn = btn;
    p.canvas = canvas;
    p.ctx = canvas.getContext("2d");
    p.waveWrap = waveWrap;
    p.timeEl = timeEl;

    btn.addEventListener("click", function () {
      togglePlayer(p);
    });

    waveWrap.addEventListener("pointerdown", function (event) {
      if (p.error || (event.button != null && event.button !== 0)) {
        return;
      }
      event.preventDefault();
      p.dragging = true;
      if (waveWrap.setPointerCapture) {
        try {
          waveWrap.setPointerCapture(event.pointerId);
        } catch (e) {}
      }
      seekByEvent(p, event);
    });
    waveWrap.addEventListener("pointermove", function (event) {
      if (p.dragging) {
        seekByEvent(p, event);
      }
    });
    function endDrag() {
      p.dragging = false;
    }
    waveWrap.addEventListener("pointerup", endDrag);
    waveWrap.addEventListener("pointercancel", endDrag);

    p.updateTime = function () {
      if (p.error) {
        return;
      }
      var audio = p.audio;
      var seconds;
      if (p.pendingSeek != null) {
        seconds = p.pendingSeek;
      } else if (audio && isFinite(audio.currentTime)) {
        seconds = audio.currentTime;
      } else {
        seconds = p.progress * p.duration;
      }
      p.timeEl.textContent = formatTime(seconds);
    };

    p.draw = function () {
      drawPlayer(p);
    };

    wrapToPlayer.set(waveWrap, p);
    players.push(p);
    return p;
  }

  function seekByEvent(p, event) {
    var rect = p.waveWrap.getBoundingClientRect();
    if (!rect.width) {
      return;
    }
    var ratio = (event.clientX - rect.left) / rect.width;
    if (p !== state.current) {
      pauseAll(p);
      state.current = p;
    }
    seekToRatio(p, ratio);
  }

  function seekToRatio(p, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    var audio = ensureAudio(p);
    var duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : p.duration;
    p.progress = ratio;
    drawPlayer(p);
    var target = ratio * duration;
    p.pendingSeek = target;
    if (isFinite(audio.duration) && audio.duration > 0) {
      try {
        audio.currentTime = Math.min(target, Math.max(0, audio.duration - 0.05));
      } catch (e) {}
    }
    p.updateTime();
  }

  function ensureAudio(p) {
    if (p.audio) {
      return p.audio;
    }
    var audio = document.createElement("audio");
    audio.preload = "auto";
    audio.src = p.src;
    audio.style.display = "none";

    audio.addEventListener("loadedmetadata", function () {
      if (isFinite(audio.duration) && audio.duration > 0) {
        p.duration = audio.duration;
        if (p.durEl) {
          p.durEl.textContent = formatDuration(p.duration);
        }
      }
      if (p.pendingSeek != null && isFinite(audio.duration) && audio.duration > 0) {
        try {
          audio.currentTime = Math.min(p.pendingSeek, audio.duration - 0.05);
        } catch (e) {}
      }
      if (isFinite(audio.duration) && audio.duration > 0) {
        p.progress = Math.min(1, audio.currentTime / audio.duration);
      }
      drawPlayer(p);
      p.updateTime();
    });

    audio.addEventListener("play", function () {
      p.playing = true;
      p.wrap.classList.add("is-playing");
      updatePlayerAria(p);
      if (state.current === p) {
        startTick();
      }
    });

    audio.addEventListener("pause", function () {
      p.playing = false;
      p.wrap.classList.remove("is-playing");
      updatePlayerAria(p);
      if (state.current === p) {
        stopTick();
        p.updateTime();
      }
    });

    audio.addEventListener("seeked", function () {
      p.pendingSeek = null;
      if (!isFinite(audio.duration) || audio.duration <= 0) {
        return;
      }
      p.progress = Math.min(1, audio.currentTime / audio.duration);
      drawPlayer(p);
      p.updateTime();
    });

    audio.addEventListener("ended", function () {
      p.progress = 0;
      drawPlayer(p);
      try {
        audio.currentTime = 0;
      } catch (e) {}
      p.updateTime();
      onClipEnded(p);
    });

    audio.addEventListener("error", function () {
      p.error = true;
      p.wrap.classList.add("is-error");
      p.wrap.setAttribute("title", t("noAudio"));
      p.timeEl.textContent = "--:--";
      p.btn.setAttribute("aria-disabled", "true");
      if (state.seq && state.seq.rec.players[state.seq.idx] === p) {
        advanceSequence();
      }
    });

    p.audio = audio;
    p.wrap.appendChild(audio);
    return audio;
  }

  function pauseAll(except) {
    players.forEach(function (q) {
      if (q !== except && q.audio && !q.audio.paused) {
        q.audio.pause();
      }
    });
  }

  function playPlayer(p, fromSequence) {
    if (p.error) {
      return;
    }
    if (!fromSequence) {
      stopSequence(false);
    }
    if (p.audio && !p.audio.paused) {
      state.current = p;
      return;
    }
    pauseAll(p);
    var audio = ensureAudio(p);
    state.current = p;
    var promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(function () {
        p.playing = false;
        p.wrap.classList.remove("is-playing");
        updatePlayerAria(p);
      });
    }
  }

  function togglePlayer(p) {
    if (p.playing && p.audio) {
      p.audio.pause();
      return;
    }
    playPlayer(p);
  }

  function onClipEnded(p) {
    if (state.seq && state.seq.rec.players[state.seq.idx] === p) {
      advanceSequence();
    }
  }

  function updatePlayerAria(p) {
    var label = p.getLabel ? p.getLabel(state.lang) : "";
    var dialect = dialectName(p.caseData.dialect, state.lang);
    var key = p.playing ? "pauseAria" : "playAria";
    p.btn.setAttribute("aria-label", fmt(t(key), { label: label, dialect: dialect }));
    if (p.durEl) {
      p.durEl.setAttribute("title", formatDuration(p.duration));
    }
  }

  /* --------------------------------------------------------------- drawing */

  function drawPlayer(p) {
    var ctx = p.ctx;
    var w = p.cssW;
    var h = p.cssH;
    if (!ctx || !w || !h || !p.peaks) {
      return;
    }
    ctx.clearRect(0, 0, w, h);
    var peaks = p.peaks;
    var n = peaks.length;
    var slot = w / n;
    var barW = Math.max(1, slot * 0.62);
    var mid = h / 2;
    var playedX = p.progress * w;
    for (var i = 0; i < n; i++) {
      var x = Math.round(i * slot + (slot - barW) / 2);
      var magnitude = peaks[i] / 100;
      var barH = Math.max(1.5, magnitude * (h - 5));
      ctx.fillStyle = x + barW / 2 <= playedX ? palette.played : palette.wave;
      ctx.fillRect(x, (mid - barH / 2) | 0, barW, Math.round(barH));
    }
    if (p.progress > 0 && p.progress < 1) {
      ctx.fillStyle = palette.played;
      ctx.fillRect(Math.round(playedX), 0, 1.5, h);
    }
  }

  function sizeCanvas(p) {
    var w = p.waveWrap.clientWidth;
    var h = p.waveWrap.clientHeight;
    if (!w || !h) {
      return;
    }
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (p.cssW === w && p.cssH === h && p.dpr === dpr) {
      return;
    }
    p.cssW = w;
    p.cssH = h;
    p.dpr = dpr;
    p.canvas.width = Math.round(w * dpr);
    p.canvas.height = Math.round(h * dpr);
    p.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlayer(p);
  }

  function sizeAll() {
    players.forEach(sizeCanvas);
  }

  /* ------------------------------------------------------------- tick loop */

  function startTick() {
    if (rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function stopTick() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function tick() {
    rafId = 0;
    var p = state.current;
    if (!p || !p.audio || p.audio.paused) {
      return;
    }
    var audio = p.audio;
    var duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : p.duration;
    p.progress = duration ? Math.min(1, audio.currentTime / duration) : 0;
    drawPlayer(p);
    p.updateTime();
    rafId = window.requestAnimationFrame(tick);
  }

  /* -------------------------------------------------------------- sequence */

  function startSequence(rec) {
    stopSequence(false);
    pauseAll(null);
    state.seq = { rec: rec, idx: 0 };
    rec.seqBtn.classList.add("is-active");
    updateSeqLabels();
    playPlayer(rec.players[0], true);
  }

  function advanceSequence() {
    var seq = state.seq;
    if (!seq) {
      return;
    }
    seq.idx += 1;
    if (seq.idx < seq.rec.players.length) {
      playPlayer(seq.rec.players[seq.idx], true);
    } else {
      stopSequence(false);
      pauseAll(null);
    }
  }

  function stopSequence(pause) {
    if (!state.seq) {
      return;
    }
    var rec = state.seq.rec;
    state.seq = null;
    rec.seqBtn.classList.remove("is-active");
    updateSeqLabels();
    if (pause) {
      pauseAll(null);
    }
  }

  function updateSeqLabels() {
    caseRecords.forEach(function (rec) {
      var active = !!(state.seq && state.seq.rec === rec);
      rec.seqIcon.innerHTML = active ? ICON_STOP : ICON_PLAY;
      rec.seqLabel.textContent = active ? t("stopSeq") : t("playAll");
      rec.seqBtn.setAttribute(
        "aria-label",
        fmt(t("seqAria"), { dialect: dialectName(rec.data.dialect, state.lang) })
      );
    });
  }

  /* ------------------------------------------------------------- i18n glue */

  function collectStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      staticNodes.push({ node: node, key: node.getAttribute("data-i18n"), html: false });
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (node) {
      staticNodes.push({ node: node, key: node.getAttribute("data-i18n-html"), html: true });
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      ariaNodes.push({ node: node, key: node.getAttribute("data-i18n-aria") });
    });
  }

  function applyLanguage(lang, persist) {
    state.lang = lang === "zh" ? "zh" : "en";
    root.setAttribute("data-lang", state.lang);
    root.setAttribute("lang", state.lang === "zh" ? "zh-CN" : "en");
    document.title = t("pageTitle");

    staticNodes.forEach(function (entry) {
      if (entry.html) {
        entry.node.innerHTML = t(entry.key);
      } else {
        entry.node.textContent = t(entry.key);
      }
    });
    ariaNodes.forEach(function (entry) {
      entry.node.setAttribute("aria-label", t(entry.key));
    });

    dynamicUpdaters.forEach(function (fn) {
      fn();
    });
    players.forEach(updatePlayerAria);
    updateSeqLabels();

    var langBtn = document.getElementById("lang-toggle");
    langBtn.textContent = state.lang === "zh" ? "EN" : "中文";
    langBtn.setAttribute("aria-label", t("langToggleAria"));
    document
      .getElementById("theme-toggle")
      .setAttribute("aria-label", t("themeToggleAria"));

    if (persist) {
      savePref("cdd-lang", state.lang);
    }
  }

  function applyTheme(theme, persist) {
    state.theme = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", state.theme);
    refreshPalette();
    players.forEach(drawPlayer);
    document
      .getElementById("theme-toggle")
      .setAttribute("aria-label", t("themeToggleAria"));
    if (persist) {
      savePref("cdd-theme", state.theme);
    }
  }

  /* ------------------------------------------------------------------ build */

  function buildNav() {
    var track = document.getElementById("case-nav-track");
    DATA.cases.forEach(function (c, index) {
      var anchor = make("a", "nav-chip");
      anchor.href = "#case-" + c.id;
      anchor.dataset.index = String(index);
      var name = make("span");
      dynamicUpdaters.push(function () {
        name.textContent = dialectName(c.dialect, state.lang);
      });
      anchor.appendChild(name);
      track.appendChild(anchor);
      chips.push(anchor);
    });
    track.addEventListener("click", function (event) {
      var chip = event.target.closest ? event.target.closest(".nav-chip") : null;
      if (chip) {
        setActiveChip(Number(chip.dataset.index));
      }
    });
  }

  function setActiveChip(index) {
    if (index === activeChip) {
      return;
    }
    activeChip = index;
    chips.forEach(function (chip, i) {
      chip.classList.toggle("is-active", i === index);
    });
    var chip = chips[index];
    var track = document.getElementById("case-nav-track");
    if (chip && track) {
      var target = chip.offsetLeft - track.clientWidth / 2 + chip.offsetWidth / 2;
      if (typeof track.scrollTo === "function") {
        track.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      } else {
        track.scrollLeft = Math.max(0, target);
      }
    }
  }

  function buildCase(c, index) {
    var rec = { index: index, data: c, players: [], seqBtn: null, seqIcon: null, seqLabel: null };

    var section = make("article", "case");
    section.id = "case-" + c.id;
    section.dataset.caseIndex = String(index);

    var head = make("header", "case-head");

    var info = make("div", "case-info");
    var topline = make("div", "case-topline");

    var indexEl = make("span", "case-index");
    indexEl.textContent = pad2(index + 1);

    var title = make("h2", "case-title");
    var nativeEl = make("span", "native");
    var romanEl = make("span", "roman");
    dynamicUpdaters.push(function () {
      nativeEl.textContent = dialectName(c.dialect, "zh");
      romanEl.textContent = dialectName(c.dialect, "en");
    });
    title.append(nativeEl, romanEl);

    var flow = make("span", "pill pill--flow");
    var sourceSpan = make("span");
    var arrowSpan = make("span", "flow-arrow");
    arrowSpan.textContent = "→";
    var targetSpan = make("span");
    dynamicUpdaters.push(function () {
      sourceSpan.textContent = dialectName(c.sourceDialect, state.lang);
      targetSpan.textContent = dialectName(c.dialect, state.lang);
    });
    flow.append(sourceSpan, arrowSpan, targetSpan);

    var ghost = make("span", "pill pill--ghost");
    ghost.textContent = "#" + c.sample;

    var actions = make("div", "case-actions");
    var seqBtn = make("button", "seq-btn");
    seqBtn.type = "button";
    var seqIcon = make("span", "seq-ic");
    seqIcon.innerHTML = ICON_PLAY;
    var seqLabel = make("span");
    seqBtn.append(seqIcon, seqLabel);
    actions.appendChild(seqBtn);

    topline.append(indexEl, title, flow, ghost, actions);

    var targetLabelEl = make("p", "target-label");
    dynamicUpdaters.push(function () {
      targetLabelEl.textContent =
        t("targetLabel") + " · " + dialectName(c.dialect, state.lang);
    });

    var quote = make("blockquote", "target-text");
    quote.lang = "zh";
    quote.textContent = c.text;

    info.append(topline, targetLabelEl, quote);

    var refBox = make("div", "ref-box");
    var refHead = make("div", "ref-head");
    var refLabel = make("span", "ref-label");
    var refRegion = make("span", "ref-region");
    dynamicUpdaters.push(function () {
      refLabel.textContent =
        t("refLabel") + " · " + dialectName(c.sourceDialect, state.lang);
      refRegion.textContent = c.region[state.lang === "zh" ? "zh" : "en"];
    });
    refHead.append(refLabel, refRegion);

    var refPlayer = createPlayer({
      kind: "ref",
      src: c.ref,
      caseData: c,
      caseIndex: index,
      clipIndex: -1,
      getLabel: function (lang) {
        return t("refLabel", lang) + " · " + dialectName(c.sourceDialect, lang);
      }
    });
    refPlayer.durEl = null;

    refBox.append(refHead, refPlayer.wrap);

    head.append(info, refBox);

    var grid = make("div", "players");
    DATA.modelOrder.forEach(function (key, clipIndex) {
      var model = DATA.models[key];
      var clipEl = make("div", "clip" + (model.ours ? " is-ours" : ""));

      var clipHead = make("div", "clip-head");
      var nameEl = make("span", "clip-name");
      var noteEl = make("span", "clip-note");
      var tagEl = null;
      if (model.ours) {
        tagEl = make("span", "clip-tag");
      }
      var durEl = make("span", "clip-dur");

      dynamicUpdaters.push(function () {
        nameEl.textContent = modelLabel(key, state.lang);
        noteEl.textContent = modelNote(key, state.lang);
        noteEl.title = noteEl.textContent;
        if (tagEl) {
          tagEl.textContent = t("oursTag");
        }
      });

      clipHead.append(nameEl, noteEl);
      if (tagEl) {
        clipHead.appendChild(tagEl);
      }
      clipHead.appendChild(durEl);

      var player = createPlayer({
        kind: "model",
        src: c.clips[key],
        caseData: c,
        caseIndex: index,
        clipIndex: clipIndex,
        getLabel: function (lang) {
          return modelLabel(key, lang);
        },
        durEl: durEl
      });
      if (player.duration) {
        durEl.textContent = formatDuration(player.duration);
      }

      clipEl.append(clipHead, player.wrap);
      grid.appendChild(clipEl);
      rec.players.push(player);
    });

    rec.el = section;
    rec.seqBtn = seqBtn;
    rec.seqIcon = seqIcon;
    rec.seqLabel = seqLabel;

    seqBtn.addEventListener("click", function () {
      if (state.seq && state.seq.rec === rec) {
        stopSequence(true);
      } else {
        startSequence(rec);
      }
    });

    section.append(head, grid);
    caseRecords.push(rec);
    document.getElementById("demo").appendChild(section);
  }

  function updateActiveChipFromScroll() {
    var header = document.querySelector(".site-header");
    var headerH = header ? header.getBoundingClientRect().height : 0;
    var probe = headerH + Math.min(240, window.innerHeight * 0.28);
    var active = -1;
    for (var i = 0; i < caseRecords.length; i++) {
      var r = caseRecords[i].el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        active = i;
        break;
      }
    }
    if (active === -1) {
      for (var j = 0; j < caseRecords.length; j++) {
        if (caseRecords[j].el.getBoundingClientRect().top <= probe) {
          active = j;
        }
      }
    }
    setActiveChip(active);
  }

  /* -------------------------------------------------------------- keyboard */

  function playerInView() {
    var vh = window.innerHeight;
    for (var i = 0; i < caseRecords.length; i++) {
      var rect = caseRecords[i].el.getBoundingClientRect();
      if (rect.top < vh * 0.7 && rect.bottom > vh * 0.3) {
        return caseRecords[i].players[0];
      }
    }
    return null;
  }

  function onKeyDown(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      stopSequence(true);
      pauseAll(null);
      return;
    }
    if (tag === "button" || tag === "a" || tag === "summary") {
      return;
    }
    if (event.key === " " || event.code === "Space") {
      var p = state.current || playerInView();
      if (!p) {
        return;
      }
      event.preventDefault();
      togglePlayer(p);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      var current = state.current;
      if (!current) {
        return;
      }
      event.preventDefault();
      var delta = event.key === "ArrowLeft" ? -5 : 5;
      var audio = ensureAudio(current);
      var duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : current.duration;
      if (!duration) {
        return;
      }
      var next = Math.max(0, Math.min(duration - 0.05, (current.progress * duration) + delta));
      seekToRatio(current, next / duration);
    }
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    collectStaticI18n();
    refreshPalette();
    buildNav();
    DATA.cases.forEach(buildCase);

    document.getElementById("lang-toggle").addEventListener("click", function () {
      applyLanguage(state.lang === "zh" ? "en" : "zh", true);
    });
    document.getElementById("theme-toggle").addEventListener("click", function () {
      applyTheme(state.theme === "dark" ? "light" : "dark", true);
    });

    applyLanguage(state.lang, false);
    applyTheme(state.theme, false);

    dynamicUpdaters.push(function () {
      var meta = document.getElementById("footer-meta");
      if (meta) {
        meta.textContent = t("footerMeta");
      }
    });
    dynamicUpdaters.forEach(function (fn) {
      fn();
    });

    sizeAll();
    window.requestAnimationFrame(function () {
      sizeAll();
      window.requestAnimationFrame(sizeAll);
    });

    updateActiveChipFromScroll();
    window.addEventListener("scroll", updateActiveChipFromScroll, { passive: true });

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          var p = wrapToPlayer.get(entry.target);
          if (p) {
            sizeCanvas(p);
          }
        });
      });
      players.forEach(function (p) {
        observer.observe(p.waveWrap);
      });
    }
    window.addEventListener("resize", function () {
      window.requestAnimationFrame(sizeAll);
      window.requestAnimationFrame(updateActiveChipFromScroll);
    });

    document.addEventListener("keydown", onKeyDown);

    /* Deep links: the case sections are built by JS, so the browser's own
       fragment scroll at parse time may find no target. Retry once we exist. */
    function scrollToHash() {
      var hash = location.hash;
      if (!hash || hash.length < 2) {
        return;
      }
      var target = document.getElementById(hash.slice(1));
      if (!target) {
        return;
      }
      var html = document.documentElement;
      var previous = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      target.scrollIntoView();
      html.style.scrollBehavior = previous;
    }
    if (location.hash) {
      scrollToHash();
      window.requestAnimationFrame(scrollToHash);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

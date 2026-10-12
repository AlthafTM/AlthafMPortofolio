(function () {
  "use strict";
  var stage = document.getElementById("prototype-stage");
  if (!stage) return;
  var status = document.getElementById("prototype-status");
  var progress = document.getElementById("prototype-progress");
  var play = document.getElementById("prototype-play");
  var stopButton = document.getElementById("prototype-stop");
  var fullscreen = document.getElementById("prototype-fullscreen");
  var frame = null, state = "idle", message = "Checking your device…";
  var visible = false, supported = false, checking = false, retryOnView = false;
  var autoBlocked = false, readyAt = 0, stalls = [], lastTick = 0;
  var offscreenTimer = 0, loadTimer = 0, generation = 0;
  try { autoBlocked = sessionStorage.getItem("prototype-auto-stop") === "true"; } catch (error) {}

  function translate(text) {
    return window.PortfolioLanguage ? window.PortfolioLanguage.translate(text) : text;
  }
  function show(text) {
    message = text;
    status.textContent = translate(text);
  }
  function controls() {
    var active = state === "loading" || state === "prepared" || state === "running";
    play.hidden = active;
    play.disabled = checking || !supported;
    stopButton.hidden = !active;
    fullscreen.hidden = state !== "running";
    stage.dataset.state = state;
  }
  function stop(reason, remember) {
    generation++;
    clearTimeout(loadTimer);
    clearTimeout(offscreenTimer);
    // Removing the entire browsing context stops Unity, downloads, and its timers,
    // even if a partially initialized player cannot complete Quit().
    if (frame) { frame.remove(); frame = null; }
    state = "idle";
    progress.hidden = true;
    progress.value = 0;
    stalls = [];
    if (remember) {
      autoBlocked = true;
      retryOnView = false;
      try { sessionStorage.setItem("prototype-auto-stop", "true"); } catch (error) {}
    }
    controls();
    show(reason);
  }
  function sendVisibility() {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ source: "portfolio", type: "visibility", visible: visible && !document.hidden }, location.origin);
    }
  }
  function fitFrame() {
    if (!frame) return;
    // Keep Unity's settings/HUD in a usable logical viewport on narrow phones.
    // Scale the entire browsing context, so pointer/touch coordinates and the
    // game's 16:9 scene stay aligned rather than squeezing its camera image.
    if (stage.clientWidth < 640) {
      var scale = Math.min(stage.clientWidth / 640, stage.clientHeight / 360);
      frame.style.width = "640px";
      frame.style.height = "360px";
      frame.style.transformOrigin = "top left";
      frame.style.transform = "scale(" + scale + ")";
      frame.style.left = (stage.clientWidth - 640 * scale) / 2 + "px";
      frame.style.top = (stage.clientHeight - 360 * scale) / 2 + "px";
    } else {
      frame.style.width = frame.style.height = "100%";
      frame.style.transform = "none";
      frame.style.left = frame.style.top = "0";
    }
  }
  new ResizeObserver(fitFrame).observe(stage);
  function start() {
    if (frame || checking || !supported || document.hidden) return;
    retryOnView = false;
    state = "loading";
    show("Loading demo…");
    progress.hidden = false;
    frame = document.createElement("iframe");
    frame.className = "current__frame";
    frame.title = "PixelScenePrototype playable demo";
    frame.allow = "fullscreen; autoplay; gamepad";
    frame.allowFullscreen = true;
    frame.src = "public/pixel-scene/player.html?v=20261012";
    frame.addEventListener("load", sendVisibility);
    stage.appendChild(frame);
    fitFrame();
    controls();
    loadTimer = setTimeout(function () {
      stop("Loading took too long. You can try again.", true);
    }, 120000);
  }
  window.addEventListener("message", function (event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    var data = event.data;
    if (!data || data.source !== "pixel-scene") return;
    if (data.type === "progress" && Number.isFinite(data.value)) {
      progress.value = Math.max(0, Math.min(1, data.value));
    } else if (data.type === "prepared") {
      clearTimeout(loadTimer);
      state = "prepared";
      progress.hidden = true;
      show("Demo ready. Scroll here to play.");
      controls();
      sendVisibility();
    } else if (data.type === "starting") {
      state = "loading";
      show("Starting demo…");
      loadTimer = setTimeout(function () { stop("Loading took too long. You can try again.", true); }, 90000);
    } else if (data.type === "ready") {
      clearTimeout(loadTimer);
      state = "running";
      readyAt = performance.now();
      lastTick = readyAt;
      progress.hidden = true;
      show("Demo running");
      controls();
      updateVisibility();
    } else if (data.type === "slow") {
      stop("Demo stopped to keep your device responsive. You can try again.", true);
    } else if (data.type === "error") {
      stop("The demo could not run in this browser. You can try again.", true);
    }
  });
  function updateVisibility() {
    sendVisibility();
    clearTimeout(offscreenTimer);
    if (visible && !document.hidden) {
      stalls = [];
      lastTick = performance.now();
      readyAt = lastTick;
      if (!frame && retryOnView && !autoBlocked) start();
    } else if (frame) {
      offscreenTimer = setTimeout(function () {
        retryOnView = !autoBlocked;
        stop("Demo paused while out of view.", false);
      }, document.hidden ? 0 : 5000);
    }
  }
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    updateVisibility();
  }, { threshold: 0.15 }).observe(stage);
  document.addEventListener("visibilitychange", updateVisibility);
  // Also watch the portfolio's own responsiveness, not just the player's FPS.
  setInterval(function () {
    var now = performance.now();
    if (state === "running" && visible && !document.hidden && now - readyAt > 12000) {
      if (lastTick && now - lastTick > 1500) stalls.push(now);
      stalls = stalls.filter(function (time) { return now - time < 15000; });
      if (stalls.length >= 3) stop("Demo stopped to keep your device responsive. You can try again.", true);
    }
    lastTick = now;
  }, 1000);

  async function deviceCheck() {
    checking = true;
    controls();
    var current = generation;
    try {
      if (!navigator.gpu || !window.WebAssembly || !window.DecompressionStream) {
        show("Your browser cannot run this demo. The preview is still available.");
        return;
      }
      var adapter = await Promise.race([
        navigator.gpu.requestAdapter(),
        new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); })
      ]);
      if (generation !== current) return;
      if (!adapter || adapter.isFallbackAdapter) {
        show("Your browser cannot run this demo. The preview is still available.");
        return;
      }
      supported = true;
      var connection = navigator.connection || {};
      var constrained = connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "") ||
        (navigator.deviceMemory && navigator.deviceMemory < 4) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
      if (autoBlocked || constrained || document.hidden) {
        show("Automatic loading is paused. Load the demo when you're ready.");
        return;
      }
      // Sample only a foreground page; hidden tabs throttle animation frames.
      var slow = await new Promise(function (resolve) {
        var frames = 0, startTime = performance.now(), last = startTime, gaps = [];
        function tick(now) {
          if (document.hidden) { resolve(true); return; }
          gaps.push(now - last); last = now; frames++;
          if (now - startTime >= 900) {
            gaps.sort(function (a, b) { return a - b; });
            resolve(frames < 24 || gaps[Math.floor(gaps.length / 2)] > 35);
          } else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      if (generation !== current) return;
      if (slow) show("Automatic loading is paused. Load the demo when you're ready.");
      else { checking = false; start(); }
    } catch (error) {
      show("Your browser cannot run this demo. The preview is still available.");
    } finally { checking = false; controls(); }
  }
  play.addEventListener("click", function () { if (supported) start(); });
  stopButton.addEventListener("click", function () { stop("Demo stopped. Load it again whenever you're ready.", true); });
  fullscreen.addEventListener("click", function () {
    if (frame && stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
    else if (frame) frame.contentWindow.postMessage({ source: "portfolio", type: "fullscreen" }, location.origin);
  });
  document.addEventListener("languagechange", function () { status.textContent = translate(message); });
  window.addEventListener("pagehide", function () { stop("Demo stopped.", false); });
  controls();
  if ("requestIdleCallback" in window) requestIdleCallback(deviceCheck, { timeout: 1500 });
  else setTimeout(deviceCheck, 400);
})();

(function () {
  "use strict";
  var stage = document.getElementById("prototype-stage");
  if (!stage) return;
  var playerURL = new URL("../public/pixel-scene/player.html?v=manual-20261012", document.currentScript.src).href;
  var status = document.getElementById("prototype-status");
  var progress = document.getElementById("prototype-progress");
  var play = document.getElementById("prototype-play");
  var stopButton = document.getElementById("prototype-stop");
  var fullscreen = document.getElementById("prototype-fullscreen");
  var frame = null, state = "idle", message = "Press Play to explore the demo.";
  var checking = false, loadTimer = 0, generation = 0;
  function translate(text) {
    return window.PortfolioLanguage ? window.PortfolioLanguage.translate(text) : text;
  }
  function show(text) { message = text; status.textContent = translate(text); }
  function controls() {
    play.hidden = Boolean(frame);
    play.disabled = checking;
    stopButton.hidden = !frame;
    fullscreen.disabled = state !== "running";
    stage.dataset.state = state;
    stage.setAttribute("aria-busy", String(checking || state === "loading"));
  }
  function stop(reason) {
    generation++;
    clearTimeout(loadTimer);
    // Destroy the complete Unity browsing context, including downloads and timers.
    if (frame) { frame.remove(); frame = null; }
    state = "idle";
    checking = false;
    progress.hidden = true;
    progress.value = 0;
    controls();
    show(reason);
  }
  function fitFrame() {
    if (!frame) return;
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
  if (window.ResizeObserver) new ResizeObserver(fitFrame).observe(stage);
  else window.addEventListener("resize", fitFrame, { passive: true });
  async function start() {
    if (frame || checking) return;
    checking = true;
    controls();
    show("Checking your device…");
    var current = generation;
    try {
      if (!navigator.gpu || !window.WebAssembly || !window.DecompressionStream) throw Error("Unsupported browser");
      var adapter = await Promise.race([
        navigator.gpu.requestAdapter(),
        new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 4000); })
      ]);
      if (generation !== current) return;
      if (!adapter || adapter.isFallbackAdapter) throw Error("No compatible graphics adapter");
      state = "loading";
      show("Loading demo…");
      progress.hidden = false;
      frame = document.createElement("iframe");
      frame.className = "current__frame";
      frame.title = "Playable 3D pixel game demo";
      frame.allow = "fullscreen; autoplay; gamepad";
      frame.allowFullscreen = true;
      frame.src = playerURL;
      frame.addEventListener("load", function () {
        if (frame) frame.contentWindow.postMessage({ source: "portfolio", type: "visibility", visible: true }, location.origin);
      });
      stage.appendChild(frame);
      fitFrame();
      loadTimer = setTimeout(function () { stop("Loading took too long. You can try again."); }, 180000);
    } catch (error) {
      show("Your browser cannot run this demo. The preview is still available.");
    } finally { checking = false; controls(); }
  }
  window.addEventListener("message", function (event) {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    var data = event.data;
    if (!data || data.source !== "pixel-scene") return;
    if (data.type === "progress" && Number.isFinite(data.value)) {
      progress.value = Math.max(0, Math.min(1, data.value));
    } else if (data.type === "prepared") {
      frame.contentWindow.postMessage({ source: "portfolio", type: "visibility", visible: true }, location.origin);
    } else if (data.type === "starting") {
      show("Starting demo…");
    } else if (data.type === "ready") {
      clearTimeout(loadTimer);
      state = "running";
      progress.hidden = true;
      show("Demo running");
      controls();
    } else if (data.type === "error") {
      stop("The demo could not run in this browser. You can try again.");
    }
  });
  play.addEventListener("click", start);
  stopButton.addEventListener("click", function () { stop("Demo stopped. Press Play to start again."); });
  fullscreen.addEventListener("click", function () {
    if (!frame || state !== "running") return;
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {
      frame.contentWindow.postMessage({ source: "portfolio", type: "fullscreen" }, location.origin);
    });
    else frame.contentWindow.postMessage({ source: "portfolio", type: "fullscreen" }, location.origin);
  });
  document.addEventListener("languagechange", function () { status.textContent = translate(message); });
  window.addEventListener("pagehide", function () { stop("Demo stopped. Press Play to start again."); });
  controls();
  show(message);
  // Only the dedicated /play page opts into starting on arrival.
  if (stage.dataset.autoplay === "true") start();
})();

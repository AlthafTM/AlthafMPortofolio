(function () {
  "use strict";
  var canvas = document.getElementById("unity-canvas");
  var prepared = null, instance = null, starting = false, active = false;
  var objectURLs = [], startedAt = 0, slowSamples = 0, lastSample = 0;
  function notify(type, extra) {
    parent.postMessage(Object.assign({ source: "pixel-scene", type: type }, extra), location.origin);
  }
  function fail(error) { console.error("PixelScenePrototype:", error); notify("error"); }
  function preventGesture(event) { if (event.cancelable) event.preventDefault(); }
  canvas.addEventListener("touchstart", preventGesture, { passive: false });
  canvas.addEventListener("touchmove", preventGesture, { passive: false });
  canvas.addEventListener("gesturestart", preventGesture, { passive: false });
  canvas.addEventListener("gesturechange", preventGesture, { passive: false });
  canvas.addEventListener("pointerdown", function () { canvas.focus(); });
  async function download(asset, onProgress) {
    var url = new URL(asset.url, location.href).href;
    var cache = null, response = null;
    try { cache = await caches.open("pixel-scene-v1"); response = await cache.match(url); } catch (error) {}
    if (!response) {
      response = await fetch(url);
      if (!response.ok) throw Error("Download failed: " + response.status);
      if (cache) cache.put(url, response.clone()).catch(function () {});
    }
    // GitHub Pages cannot set Brotli/gzip headers for Unity files. Ship gzip and
    // decompress explicitly with the browser's native streaming implementation.
    // A gzip magic check also handles hosts that already decode Content-Encoding.
    var reader = response.body.getReader(), chunks = [], received = 0;
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      chunks.push(chunk.value); received += chunk.value.byteLength;
      onProgress(received);
    }
    return new Blob(chunks, { type: asset.type });
  }
  async function unpack(blob, type) {
    var head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    var result = head[0] === 0x1f && head[1] === 0x8b ?
      await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob() : blob;
    var url = URL.createObjectURL(new Blob([result], { type: type }));
    objectURLs.push(url);
    return url;
  }
  async function start() {
    if (!active || !prepared || starting || instance) return;
    starting = true;
    notify("starting");
    try {
      var manifest = prepared.manifest;
      var urls = await Promise.all(["scene.data", "scene.framework.js", "scene.wasm"].map(function (name) {
        return unpack(prepared.blobs[name], manifest[name].type);
      }));
      prepared = null;
      instance = await createUnityInstance(canvas, {
        arguments: [], dataUrl: urls[0], frameworkUrl: urls[1], codeUrl: urls[2],
        streamingAssetsUrl: "StreamingAssets", companyName: "althafm",
        productName: "PixelScenePrototype", productVersion: "0.1",
        devicePixelRatio: navigator.maxTouchPoints > 0 ? 1 : Math.min(devicePixelRatio || 1, 1.5),
        dataCaching: false,
        showBanner: function (message, type) { if (type === "error") fail(message); },
        errorHandler: function (message) { fail(message); return true; }
      }, function (value) { notify("progress", { value: 0.8 + value * 0.2 }); });
      objectURLs.forEach(URL.revokeObjectURL); objectURLs = [];
      startedAt = performance.now();
      lastSample = startedAt;
      notify("ready");
    } catch (error) { fail(error); }
  }
  window.addEventListener("message", function (event) {
    if (event.source !== parent || event.origin !== location.origin || !event.data || event.data.source !== "portfolio") return;
    if (event.data.type === "visibility") {
      active = Boolean(event.data.visible);
      slowSamples = 0;
      lastSample = performance.now();
      start();
    } else if (event.data.type === "fullscreen" && instance) {
      instance.SetFullscreen(1);
    }
  });
  setInterval(function () {
    var now = performance.now();
    if (!instance || !active || document.hidden || now - startedAt < 12000) { lastSample = now; return; }
    try {
      var metrics = instance.GetMetricsInfo();
      var fps = metrics.movingAverageFps || metrics.fps;
      // Ignore startup and brief hitches. Unload after three poor two-second windows.
      slowSamples = (Number.isFinite(fps) && fps < 25) || now - lastSample > 3500 ? slowSamples + 1 : 0;
      if (slowSamples >= 3) notify("slow");
    } catch (error) { /* Metrics can be unavailable briefly during scene startup. */ }
    lastSample = now;
  }, 2000);
  (async function () {
    if (!navigator.gpu || !window.DecompressionStream) throw Error("Required browser features unavailable");
    var response = await fetch("build.json", { cache: "no-cache" });
    if (!response.ok) throw Error("Build manifest unavailable");
    var manifest = await response.json(), blobs = {}, loaded = {};
    var total = Object.values(manifest).reduce(function (sum, asset) { return sum + asset.size; }, 0);
    await Promise.all(Object.keys(manifest).map(async function (name) {
      blobs[name] = await download(manifest[name], function (bytes) {
        loaded[name] = bytes;
        notify("progress", { value: Math.min(0.8, Object.values(loaded).reduce(function (sum, n) { return sum + n; }, 0) / total * 0.8) });
      });
    }));
    prepared = { manifest: manifest, blobs: blobs };
    notify("prepared");
    start();
  })().catch(fail);
})();

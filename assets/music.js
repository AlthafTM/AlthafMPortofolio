(function () {
  "use strict";
  var mount = document.getElementById("soundtracks");
  if (!mount) return;
  var players = [], active = null, carried = false, errorText = "", frame = 0;
  var notice = document.getElementById("music-status");
  var home = document.getElementById("main"), homeTitle = document.title, homeScroll = 0;
  var homeURL = new URL(location.href), base = new URL("./", homeURL);
  var headerLinks = Array.from(document.querySelectorAll(".site-header a")).map(function (a) { return { node: a, href: a.getAttribute("href") }; });
  function tr(text) { return window.PortfolioLanguage ? window.PortfolioLanguage.translate(text) : text; }
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function time(seconds) { seconds = Math.max(0, Math.floor(seconds || 0)); return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0"); }
  function duration(player) { return Number.isFinite(player.audio.duration) ? player.audio.duration : player.track.duration; }
  function button() { var b = node("button", "soundtrack__toggle"); b.type = "button"; return b; }
  function waveform(player) {
    var wave = node("div", "soundtrack__waveform");
    var bars = node("div", "soundtrack__bars"), fill = node("div", "soundtrack__bars soundtrack__bars--fill");
    bars.setAttribute("aria-hidden", "true"); fill.setAttribute("aria-hidden", "true");
    player.track.peaks.forEach(function (peak) { [bars, fill].forEach(function (layer) { var bar = node("i"); bar.style.setProperty("--peak", peak + "%"); layer.appendChild(bar); }); });
    var seek = node("input", "soundtrack__seek"), preview = node("span", "soundtrack__preview");
    preview.setAttribute("aria-hidden", "true");
    seek.type = "range"; seek.min = "0"; seek.max = String(player.track.duration); seek.step = "0.1"; seek.value = "0"; seek.disabled = !Number.isFinite(player.audio.duration);
    wave.append(bars, fill, seek, preview);
    seek.addEventListener("input", function () { if (!seek.disabled) { player.audio.currentTime = Number(seek.value); update(player); } });
    function showPreview(event) {
      var rect = wave.getBoundingClientRect(), fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      preview.textContent = time(fraction * duration(player));
      preview.style.setProperty("--preview-x", fraction * rect.width + "px");
      wave.classList.add("is-previewing");
    }
    wave.addEventListener("pointermove", showPreview);
    wave.addEventListener("pointerleave", function () { wave.classList.remove("is-previewing"); });
    seek.addEventListener("keydown", function () { preview.textContent = time(Number(seek.value)); });
    player.views.push({wave: wave, seek: seek}); return wave;
  }
  var dock = node("aside", "music-dock"), dockInfo = node("div", "music-dock__info");
  dock.setAttribute("aria-label", "Music player"); dock.setAttribute("inert", "");
  var dockTitle = node("strong", "music-dock__title"), dockTime = node("span", "soundtrack__time");
  var dockToggle = button(), close = node("button", "music-dock__close", "×"); close.type = "button";
  var dockWave = node("div", "music-dock__wave");
  dockInfo.append(dockTitle, dockTime); dock.append(dockToggle, dockInfo, close, dockWave); document.body.appendChild(dock);
  // Keep the media element outside replaceable page content.
  var media = node("div"); media.hidden = true; document.body.appendChild(media);
  function icon(toggle, playing, title) {
    toggle.setAttribute("aria-label", tr(playing ? "Pause" : "Play") + " " + title);
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">' + (playing ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>' : '<path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5z"/>') + '</svg>';
  }
  function dockVisibility() {
    var visible = false;
    if (active) { var rect = active.row.getBoundingClientRect(); visible = carried && document.body.dataset.page === "game" || rect.top < 90 || rect.bottom > innerHeight || !active.row.isConnected; }
    dock.classList.toggle("is-visible", visible); dock.toggleAttribute("inert", !visible);
  }
  function labels(player) {
    var playing = !player.audio.paused && !player.audio.ended;
    player.row.classList.toggle("is-playing", playing); icon(player.toggle, playing, player.track.title);
    player.volume.setAttribute("aria-label", tr("Volume") + ": " + player.track.title);
    player.views.forEach(function (view) { view.seek.setAttribute("aria-label", tr("Seek in track") + ": " + player.track.title); });
    if (active === player) { icon(dockToggle, playing, player.track.title); dock.classList.toggle("is-playing", playing); }
    close.setAttribute("aria-label", tr("Close music player")); dock.setAttribute("aria-label", tr("Music player")); dockVisibility();
  }
  function update(player) {
    var d = duration(player), current = player.audio.currentTime || 0;
    player.views.forEach(function (view) {
      view.wave.style.setProperty("--progress", Math.min(100, current / d * 100) + "%");
      view.seek.max = String(d); view.seek.value = String(current); view.seek.disabled = !Number.isFinite(player.audio.duration);
      view.seek.setAttribute("aria-valuetext", time(current) + " / " + time(d));
    });
    player.elapsed.textContent = time(current) + " / " + time(d);
    if (active === player) dockTime.textContent = player.elapsed.textContent;
  }
  function tick() { frame = 0; if (active && !active.audio.paused) { update(active); frame = requestAnimationFrame(tick); } }
  function choose(player) {
    if (active !== player) {
      if (active) active.views = active.views.slice(0, 1);
      active = player; dockTitle.textContent = player.track.title; dockWave.replaceChildren(waveform(player));
    }
    dockVisibility();
  }
  function toggle(player) {
    choose(player); errorText = ""; notice.textContent = "";
    if (!player.audio.paused) { player.audio.pause(); return; }
    players.forEach(function (other) { if (other !== player) other.audio.pause(); });
    if (player.audio.ended) player.audio.currentTime = 0;
    player.audio.play().catch(function (error) { if (error.name !== "AbortError") { errorText = "This track couldn't play. Please try again."; notice.textContent = tr(errorText); } labels(player); });
  }
  (window.PORTFOLIO_MUSIC || []).forEach(function (track, index) {
    var audio = node("audio"); audio.preload = "none"; audio.src = track.src; audio.volume = .8; media.appendChild(audio);
    var row = node("article", "soundtrack"); row.setAttribute("aria-labelledby", "track-" + index);
    var main = node("div", "soundtrack__main"), heading = node("div", "soundtrack__heading"), titles = node("div", "soundtrack__titles");
    var title = node("h3", "soundtrack__title", track.title); title.id = "track-" + index;
    titles.append(title, node("p", "soundtrack__credit", "Original soundtrack"));
    var equalizer = node("span", "soundtrack__equalizer"); equalizer.setAttribute("aria-hidden", "true");
    for (var n = 0; n < 4; n++) equalizer.appendChild(node("i")); heading.append(titles, equalizer);
    var control = button(), elapsed = node("span", "soundtrack__time", "0:00 / " + time(track.duration));
    var volumeWrap = node("label", "soundtrack__volume"), volume = node("input"); volume.type = "range"; volume.min = "0"; volume.max = "1"; volume.step = ".01"; volume.value = ".8";
    var note = node("span", "", "♪"); note.setAttribute("aria-hidden", "true"); volumeWrap.append(note, volume);
    var player = {row: row, audio: audio, toggle: control, elapsed: elapsed, volume: volume, track: track, views: []}; players.push(player);
    var controls = node("div", "soundtrack__controls"), bottom = node("div", "soundtrack__bottom");
    controls.append(control, waveform(player)); bottom.append(elapsed, volumeWrap); main.append(heading, controls, bottom);
    var game = node("a", "soundtrack__game"); game.href = "game.html?id=exsilva";
    var image = node("img"); image.src = "public/exsilva-logo.webp"; image.alt = ""; image.width = 56; image.height = 56; image.loading = "lazy";
    var gameText = node("span", "soundtrack__game-text"); gameText.append(node("span", "soundtrack__credit", "Created for"), node("strong", "", "Exsilva Project"));
    game.append(image, gameText, node("span", "soundtrack__arrow", "→")); row.append(main, game); mount.appendChild(row);
    control.addEventListener("click", function () { toggle(player); });
    volume.addEventListener("input", function () { audio.volume = Number(volume.value); });
    audio.addEventListener("loadedmetadata", function () { update(player); }); audio.addEventListener("timeupdate", function () { update(player); });
    ["play", "pause", "ended"].forEach(function (event) { audio.addEventListener(event, function () { labels(player); update(player); if (!frame && active && !active.audio.paused) frame = requestAnimationFrame(tick); }); });
    audio.addEventListener("error", function () { errorText = "This track couldn't play. Please try again."; notice.textContent = tr(errorText); labels(player); }); labels(player);
  });
  dockToggle.addEventListener("click", function () { if (active) toggle(active); });
  close.addEventListener("click", function () {
    if (!active) return;
    var previous = active; active = null; previous.audio.pause(); previous.audio.currentTime = 0; previous.views = previous.views.slice(0, 1); update(previous);
    dock.classList.remove("is-playing"); dockVisibility();
    if (previous.toggle.isConnected) previous.toggle.focus({preventScroll: true});
  });
  function navigate(url, push) {
    var isGame = url.pathname === new URL("game.html", base).pathname;
    if (!carried) { carried = true; history.replaceState({musicRoute: true}, "", location.href); }
    if (push) history.pushState({musicRoute: true}, "", url.href);
    var current = document.getElementById("main");
    if (isGame) {
      if (current === home) homeScroll = scrollY;
      var detail = node("main"); detail.id = "main"; var root = node("div"); root.id = "game-root"; detail.appendChild(root); current.replaceWith(detail);
      document.body.dataset.page = "game"; window.PortfolioGames.renderDetail(url.searchParams.get("id") || "");
      headerLinks.forEach(function (item) { if (item.href.charAt(0) === "#") item.node.href = "index.html" + item.href; });
      window.scrollTo({top: 0, behavior: "instant"});
    } else {
      if (current !== home) current.replaceWith(home);
      document.body.dataset.page = "home"; document.title = homeTitle;
      headerLinks.forEach(function (item) { item.node.setAttribute("href", item.href); });
      var target = url.hash && document.getElementById(url.hash.slice(1));
      if (push && target) target.scrollIntoView({behavior: "instant"}); else window.scrollTo({top: homeScroll, behavior: "instant"});
    }
    if (window.PortfolioLanguage) window.PortfolioLanguage.apply(); dockVisibility();
    document.getElementById("main").setAttribute("tabindex", "-1"); document.getElementById("main").focus({preventScroll: true});
  }
  document.addEventListener("click", function (event) {
    var a = event.target.closest && event.target.closest("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!carried && !(active && a.classList.contains("soundtrack__game"))) return;
    var url = new URL(a.href);
    if (url.origin !== location.origin || ![new URL("game.html", base).pathname, new URL("index.html", base).pathname, base.pathname].includes(url.pathname)) return;
    if (url.href === location.href || (url.pathname === location.pathname && url.hash && document.getElementById(url.hash.slice(1)))) return;
    event.preventDefault(); event.stopImmediatePropagation(); navigate(url, true);
  }, true);
  window.addEventListener("popstate", function () { if (carried) navigate(new URL(location.href), false); });
  window.addEventListener("scroll", dockVisibility, {passive: true}); window.addEventListener("resize", dockVisibility);
  document.addEventListener("languagechange", function () { players.forEach(labels); notice.textContent = tr(errorText); });
  window.addEventListener("pagehide", function () { players.forEach(function (p) { p.audio.pause(); }); });
  if (window.PortfolioLanguage) window.PortfolioLanguage.apply();
})();

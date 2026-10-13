(function () {
  "use strict";
  var mount = document.getElementById("soundtracks");
  if (!mount) return;
  var players = [], notice = document.getElementById("music-status");
  var errorText = "";
  function tr(text) { return window.PortfolioLanguage ? window.PortfolioLanguage.translate(text) : text; }
  function node(tag, className, text) {
    var item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
  }
  function time(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }
  function labels(player) {
    var playing = !player.audio.paused && !player.audio.ended;
    player.row.classList.toggle("is-playing", playing);
    player.toggle.setAttribute("aria-label", tr(playing ? "Pause" : "Play") + " " + player.track.title);
    player.toggle.setAttribute("aria-pressed", String(playing));
    player.toggle.innerHTML = playing ? '<span aria-hidden="true">Ⅱ</span>' : '<span aria-hidden="true">▶</span>';
    player.seek.setAttribute("aria-label", tr("Seek in track") + ": " + player.track.title);
    player.volume.setAttribute("aria-label", tr("Volume") + ": " + player.track.title);
  }
  (window.PORTFOLIO_MUSIC || []).forEach(function (track, index) {
    var row = node("article", "soundtrack");
    row.setAttribute("aria-labelledby", "track-" + index);
    var main = node("div", "soundtrack__main");
    var heading = node("div", "soundtrack__heading");
    var disc = node("div", "soundtrack__disc");
    disc.setAttribute("aria-hidden", "true");
    disc.innerHTML = '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="37"/><circle cx="40" cy="40" r="29"/><circle cx="40" cy="40" r="24"/><circle cx="40" cy="40" r="13"/><path d="M18 18 27 27M53 53 62 62"/></svg><span></span>';
    var titles = node("div", "soundtrack__titles");
    var title = node("h3", "soundtrack__title", track.title);
    title.id = "track-" + index;
    var credit = node("p", "soundtrack__credit", "Original soundtrack");
    var equalizer = node("span", "soundtrack__equalizer");
    equalizer.setAttribute("aria-hidden", "true");
    for (var n = 0; n < 4; n++) equalizer.appendChild(node("i"));
    titles.append(title, credit);
    heading.append(disc, titles, equalizer);

    var controls = node("div", "soundtrack__controls");
    var toggle = node("button", "soundtrack__toggle");
    toggle.type = "button";
    var wave = node("div", "soundtrack__waveform");
    var bars = node("div", "soundtrack__bars");
    bars.setAttribute("aria-hidden", "true");
    track.peaks.forEach(function (peak) {
      var bar = node("i"); bar.style.setProperty("--peak", peak + "%"); bars.appendChild(bar);
    });
    var seek = node("input", "soundtrack__seek");
    seek.type = "range"; seek.min = "0"; seek.max = String(track.duration); seek.step = "0.1"; seek.value = "0"; seek.disabled = true;
    wave.append(bars, seek);
    controls.append(toggle, wave);
    var bottom = node("div", "soundtrack__bottom");
    var elapsed = node("span", "soundtrack__time", "0:00 / " + time(track.duration));
    var volumeWrap = node("label", "soundtrack__volume");
    var volumeIcon = node("span", "", "♪"); volumeIcon.setAttribute("aria-hidden", "true");
    var volume = node("input"); volume.type = "range"; volume.min = "0"; volume.max = "1"; volume.step = "0.01"; volume.value = "0.8";
    volumeWrap.append(volumeIcon, volume); bottom.append(elapsed, volumeWrap);
    main.append(heading, controls, bottom);
    var game = node("a", "soundtrack__game");
    game.href = "game.html?id=exsilva";
    var image = node("img"); image.src = "public/exsilva-logo.webp"; image.alt = ""; image.width = 56; image.height = 56; image.loading = "lazy";
    var gameText = node("span", "soundtrack__game-text");
    gameText.append(node("span", "soundtrack__credit", "Created for"), node("strong", "", "Exsilva Project"));
    game.append(image, gameText, node("span", "soundtrack__arrow", "↗"));
    var audio = node("audio"); audio.preload = "none"; audio.src = track.src; audio.volume = 0.8;
    row.append(main, game, audio); mount.appendChild(row);
    var player = { row: row, audio: audio, toggle: toggle, seek: seek, volume: volume, track: track };
    players.push(player);
    function update() {
      var duration = Number.isFinite(audio.duration) ? audio.duration : track.duration;
      var fraction = duration ? audio.currentTime / duration : 0;
      seek.max = String(duration); seek.value = String(audio.currentTime || 0);
      bars.style.setProperty("--progress", (fraction * 100) + "%");
      elapsed.textContent = time(audio.currentTime) + " / " + time(duration);
      seek.setAttribute("aria-valuetext", time(audio.currentTime) + " / " + time(duration));
      Array.from(bars.children).forEach(function (bar, i) { bar.classList.toggle("is-played", i / track.peaks.length < fraction); });
    }
    toggle.addEventListener("click", function () {
      errorText = ""; notice.textContent = "";
      if (!audio.paused) { audio.pause(); return; }
      players.forEach(function (other) { if (other !== player) other.audio.pause(); });
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(function (error) {
        if (error.name === "AbortError") { labels(player); return; }
        errorText = "This track couldn't play. Please try again.";
        notice.textContent = tr(errorText); labels(player);
      });
    });
    audio.addEventListener("loadedmetadata", function () { seek.disabled = false; update(); });
    audio.addEventListener("timeupdate", update);
    ["play", "pause", "ended"].forEach(function (event) { audio.addEventListener(event, function () { labels(player); update(); }); });
    audio.addEventListener("error", function () { errorText = "This track couldn't play. Please try again."; notice.textContent = tr(errorText); labels(player); });
    seek.addEventListener("input", function () { if (Number.isFinite(audio.duration)) { audio.currentTime = Number(seek.value); update(); } });
    volume.addEventListener("input", function () { audio.volume = Number(volume.value); });
    labels(player);
  });
  document.addEventListener("languagechange", function () { players.forEach(labels); notice.textContent = tr(errorText); });
  window.addEventListener("pagehide", function () { players.forEach(function (player) { player.audio.pause(); }); });
  if (window.PortfolioLanguage) window.PortfolioLanguage.apply();
})();

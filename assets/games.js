(function () {
  "use strict";

  var DATA_URL = "data/games.js";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function img(src, alt, className) {
    var node = document.createElement("img");
    if (src) node.src = src;
    node.alt = alt || "";
    node.loading = "lazy";
    node.decoding = "async";
    if (className) node.className = className;
    return node;
  }

  function link(href, text, className) {
    var node = el("a", className, text);
    node.href = href;
    if (/^https?:/.test(href)) {
      node.target = "_blank";
      node.rel = "noreferrer noopener";
    }
    return node;
  }

  function badgesFor(game) {
    var wrap = el("div", "badges");
    var links = game.links || {};
    var badges = game.badges || {};
    if (links.itch && badges.itch) {
      var itch = link(links.itch, "", "badge");
      itch.appendChild(img(badges.itch, "Play " + game.title + " on itch.io"));
      wrap.appendChild(itch);
    }
    if (links.playstore && badges.playstore) {
      var play = link(links.playstore, "", "badge badge--store");
      play.appendChild(
        img(badges.playstore, "Get " + game.title + " on Google Play")
      );
      wrap.appendChild(play);
    }
    if (!wrap.childNodes.length) wrap.style.display = "none";
    return wrap;
  }

  function classifyRatio(im) {
    if (!im.naturalWidth || !im.naturalHeight) return;
    var ratio = im.naturalWidth / im.naturalHeight;
    var wide = Math.abs(ratio - 16 / 9);
    var tall = Math.abs(ratio - 9 / 19);
    var isWide = wide <= tall;
    im.style.aspectRatio = isWide ? "16 / 9" : "9 / 19";
    im.setAttribute("data-shape", isWide ? "wide" : "tall");
  }

  function rail(game, options) {
    options = options || {};
    var wrap = el("div", "rail");
    wrap.setAttribute("data-rail", "");

    var prev = el("button", "rail__nav rail__nav--prev");
    prev.type = "button";
    prev.setAttribute("aria-label", "Scroll images left");
    prev.innerHTML = "&#8249;";

    var next = el("button", "rail__nav rail__nav--next");
    next.type = "button";
    next.setAttribute("aria-label", "Scroll images right");
    next.innerHTML = "&#8250;";

    var track = el("div", "rail__track");
    track.setAttribute("tabindex", "0");
    var navFrame = 0;

    (game.images || []).forEach(function (src, i) {
      var figure = el("figure", "rail__item");
      var picture = img(src, game.title + " screenshot " + (i + 1));
      picture.setAttribute("data-zoom", src);
      picture.style.aspectRatio = "16 / 9";
      if (picture.complete) {
        classifyRatio(picture);
      } else {
        picture.addEventListener("load", function () {
          classifyRatio(picture);
          updateNav();
        });
      }
      figure.appendChild(picture);
      track.appendChild(figure);
    });
    wrap.appendChild(prev);
    wrap.appendChild(track);
    wrap.appendChild(next);

    function step() {
      return Math.max(220, Math.round(track.clientWidth * 0.8));
    }
    prev.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });

    function updateNav() {
      var max = track.scrollWidth - track.clientWidth - 2;
      wrap.classList.toggle("is-start", track.scrollLeft <= 2);
      wrap.classList.toggle("is-end", track.scrollLeft >= max);
      wrap.classList.toggle("is-static", track.scrollWidth <= track.clientWidth + 4);
    }
    function scheduleNavUpdate() {
      if (navFrame) return;
      navFrame = requestAnimationFrame(function () {
        navFrame = 0;
        updateNav();
      });
    }
    track.addEventListener("scroll", scheduleNavUpdate, { passive: true });
    window.addEventListener("resize", scheduleNavUpdate, { passive: true });

    // Pointer drag-to-scroll (mouse, pen, touch)
    var dragging = false;
    var dragMoved = false;
    var startX = 0;
    var startScroll = 0;
    var activeId = null;

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      activeId = e.pointerId;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== activeId) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        dragMoved = true;
        if (track.setPointerCapture) {
          try {
            track.setPointerCapture(e.pointerId);
          } catch (err) {}
        }
      }
      track.scrollLeft = startScroll - dx;
    }

    function onUp(e) {
      if (e.pointerId !== activeId) return;
      dragging = false;
      activeId = null;
      track.classList.remove("is-dragging");
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("pointerleave", function (e) {
      if (dragging && e.pointerId === activeId) onUp(e);
    });
    track.addEventListener("click", function (e) {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      }
    }, true);

    if (options.onReady) options.onReady(updateNav);
    requestAnimationFrame(updateNav);
    Array.prototype.forEach.call(track.querySelectorAll("img"), function (im) {
      if (!im.complete) im.addEventListener("load", updateNav);
    });

    return wrap;
  }

  function achievementList(game) {
    if (!game.achievements || !game.achievements.length) return null;
    var wrap = el("div", "achievements");
    game.achievements.forEach(function (item) {
      var card = el("button", "achievement");
      card.type = "button";
      if (item.certificate) {
        card.setAttribute("data-cert", item.certificate);
        card.setAttribute("data-cert-title", item.title || "");
      } else {
        card.disabled = true;
      }

      var body = el("span", "achievement__body");
      body.appendChild(el("span", "achievement__title", item.title || ""));
      if (item.event) body.appendChild(el("span", "achievement__event", item.event));
      if (item.certificate) {
        body.appendChild(img(item.certificate, (item.title || "Certificate") + " certificate", "achievement__certificate"));
      }

      var main = el("span", "achievement__main");
      main.appendChild(img("public/bxltrophy.svg", "", "achievement__trophy"));
      main.appendChild(body);
      card.appendChild(main);

      if (item.certificate) {
        var cta = el("span", "achievement__cta");
        cta.appendChild(el("span", "", "View certificate"));
        cta.appendChild(el("span", "achievement__arrow", "\u2192"));
        card.appendChild(cta);
      }

      wrap.appendChild(card);
    });
    return wrap;
  }

  function gameCard(game) {
    var article = el("article", "game reveal");
    article.id = "game-" + game.id;

    var info = el("div", "game__info");
    var head = el("div", "game__head");

    var icon = el("div", "game__icon");
    icon.appendChild(img(game.icon, game.title + " icon"));
    head.appendChild(icon);

    var titles = el("div", "game__titles");
    var meta = el("div", "game__meta");
    meta.appendChild(el("span", "game__order", game.order));
    titles.appendChild(meta);
    titles.appendChild(el("h3", "game__title", game.title));
    head.appendChild(titles);
    info.appendChild(head);

    info.appendChild(el("p", "game__desc", game.description));

    var actions = el("div", "game__actions");
    actions.appendChild(link("game.html?id=" + encodeURIComponent(game.id), "Learn more", "btn btn--solid"));
    actions.appendChild(badgesFor(game));
    info.appendChild(actions);

    article.appendChild(info);
    article.appendChild(rail(game));

    var achievements = achievementList(game);
    if (achievements) article.appendChild(achievements);

    return article;
  }

  function renderHome(data) {
    var mount = document.getElementById("games");
    if (mount) {
      data.games.forEach(function (game, i) {
        var card = gameCard(game);
        if (i % 2 === 1) card.classList.add("game--flip");
        mount.appendChild(card);
      });
    }

    var stackMount = document.getElementById("skills");
    if (stackMount) {
      var skills = (data.stack || []).slice().sort(function (a, b) {
        return (b.level || 0) - (a.level || 0);
      });
      skills.forEach(function (item) {
        var li = el("li", "skill reveal");
        var top = el("div", "skill__top");
        top.appendChild(img(item.icon, "", "skill__icon"));
        top.appendChild(el("span", "skill__name", item.name));
        li.appendChild(top);

        var level = Math.max(0, Math.min(5, item.level || 0));
        var meter = el("div", "skill__meter");
        meter.setAttribute("role", "img");
        meter.setAttribute("aria-label", level + " out of 5");
        for (var i = 0; i < 5; i++) {
          var seg = el("span", "skill__seg");
          if (i < level) seg.classList.add("is-on");
          meter.appendChild(seg);
        }
        li.appendChild(meter);
        stackMount.appendChild(li);
      });
    }

    var socialMount = document.getElementById("socials");
    if (socialMount) {
      data.socials.forEach(function (item) {
        var a = el("a", "social reveal");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noreferrer noopener";
        a.appendChild(img(item.icon, ""));
        a.appendChild(el("span", "", item.name));
        socialMount.appendChild(a);
      });
    }

    document.title = data.site.name + " — " + data.site.role;
  }

  function detailPanel(label, value) {
    var box = el("div", "panel");
    box.appendChild(el("span", "panel__label", label));
    box.appendChild(el("p", "panel__value", value));
    return box;
  }

  function renderGame(data, id) {
    var game = data.games.filter(function (g) {
      return g.id === id;
    })[0];
    var root = document.getElementById("game-root");

    if (!game) {
      if (root) {
        root.innerHTML = "";
        var missing = el("div", "detail__missing");
        missing.appendChild(el("h1", "", "Game not found"));
        missing.appendChild(
          el("p", "", "That project doesn't exist. Head back to the full list.")
        );
        missing.appendChild(link("index.html#work", "Back to work", "btn btn--solid"));
        root.appendChild(missing);
      }
      return;
    }

    document.title = game.title + " — " + data.site.name;

    var wrap = el("div", "wrap");

    var backWrap = el("div", "wrap");
    var back = link("index.html#work", "", "back-link");
    back.appendChild(el("span", "back-link__arrow", "\u2190"));
    back.appendChild(el("span", "back-link__text", "All games"));
    backWrap.appendChild(back);

    var hero = el("header", "detail__hero reveal");
    var heroMain = el("div", "detail__intro");

    var meta = el("div", "detail__meta");
    meta.appendChild(el("span", "game__order", game.order));
    heroMain.appendChild(meta);

    heroMain.appendChild(el("h1", "detail__title", game.title));
    heroMain.appendChild(el("p", "detail__desc", game.description));

    var heroActions = el("div", "game__actions");
    heroActions.appendChild(badgesFor(game));
    heroMain.appendChild(heroActions);

    var heroIcon = el("div", "detail__icon");
    heroIcon.appendChild(img(game.icon, game.title + " icon"));

    hero.appendChild(heroMain);
    hero.appendChild(heroIcon);
    wrap.appendChild(hero);

    var shots = el("section", "detail__section reveal");
    shots.appendChild(el("h2", "detail__section-title", "Screenshots"));
    shots.appendChild(rail(game));
    wrap.appendChild(shots);

    var details = el("section", "detail__section reveal");
    details.appendChild(el("h2", "detail__section-title", "Behind the game"));
    var grid = el("div", "panels");
    var d = game.details || {};
    if (d.devTime) grid.appendChild(detailPanel("Dev time", d.devTime));
    if (d.budget) grid.appendChild(detailPanel("Budget", d.budget));
    if (d.tools) grid.appendChild(detailPanel("Tools", d.tools));
    if (d.role) grid.appendChild(detailPanel("Role", d.role));
    details.appendChild(grid);
    wrap.appendChild(details);

    function pointList(title, items, modifier) {
      if (!items || !items.length) return null;
      var section = el("section", "detail__section reveal");
      section.appendChild(el("h2", "detail__section-title", title));
      var ul = el("ul", "points" + (modifier ? " points--" + modifier : ""));
      items.forEach(function (point) {
        var li = el("li", "point");
        li.appendChild(el("span", "point__mark", ""));
        li.appendChild(el("span", "point__text", point));
        ul.appendChild(li);
      });
      section.appendChild(ul);
      return section;
    }

    var difficulties = pointList("Difficulties faced", game.difficulties, "difficulty");
    if (difficulties) wrap.appendChild(difficulties);

    var learnings = pointList("What I learned", game.learnings, "learning");
    if (learnings) wrap.appendChild(learnings);

    var achievements = achievementList(game);
    if (achievements) {
      var achSection = el("section", "detail__section reveal");
      achSection.appendChild(el("h2", "detail__section-title", "Achievements"));
      achSection.appendChild(achievements);
      wrap.appendChild(achSection);
    }

    var idx = data.games.indexOf(game);
    var prevGame = data.games[idx - 1];
    var nextGame = data.games[idx + 1];
    if (prevGame || nextGame) {
      var nav = el("nav", "detail__nav reveal");
      if (prevGame) {
        var p = link("game.html?id=" + prevGame.id, "", "detail__nav-link detail__nav-link--prev");
        p.appendChild(el("span", "detail__nav-arrow", "\u2190"));
        var pIcon = el("span", "detail__nav-icon");
        pIcon.appendChild(img(prevGame.icon, ""));
        p.appendChild(pIcon);
        var pText = el("span", "detail__nav-text");
        pText.appendChild(el("span", "detail__nav-label", "Previous"));
        pText.appendChild(el("span", "detail__nav-title", prevGame.title));
        p.appendChild(pText);
        nav.appendChild(p);
      }
      if (nextGame) {
        var n = link("game.html?id=" + nextGame.id, "", "detail__nav-link detail__nav-link--next");
        var nText = el("span", "detail__nav-text");
        nText.appendChild(el("span", "detail__nav-label", "Next"));
        nText.appendChild(el("span", "detail__nav-title", nextGame.title));
        n.appendChild(nText);
        var nIcon = el("span", "detail__nav-icon");
        nIcon.appendChild(img(nextGame.icon, ""));
        n.appendChild(nIcon);
        n.appendChild(el("span", "detail__nav-arrow", "\u2192"));
        nav.appendChild(n);
      }
      wrap.appendChild(nav);
    }

    root.appendChild(backWrap);
    root.appendChild(wrap);
  }

  function initLightbox() {
    var box = el("div", "lightbox");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.appendChild(el("button", "lightbox__close", "\u00d7"));
    var image = img("", "");
    var frame = document.createElement("iframe");
    frame.className = "lightbox__frame";
    frame.setAttribute("title", "Certificate");
    box.appendChild(image);
    box.appendChild(frame);
    var hint = el("p", "lightbox__hint", "Press any button to close");
    box.appendChild(hint);
    document.body.appendChild(box);

    function isPdf(src) {
      return /\.pdf(\?|#|$)/i.test(src);
    }

    function close() {
      if (!box.classList.contains("is-open")) return;
      box.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
      image.removeAttribute("src");
      frame.removeAttribute("src");
      box.classList.remove("is-pdf");
    }

    function open(src, alt) {
      if (isPdf(src)) {
        box.classList.add("is-pdf");
        image.removeAttribute("src");
        frame.src = src;
      } else {
        box.classList.remove("is-pdf");
        frame.removeAttribute("src");
        image.src = src;
        image.alt = alt || "";
      }
      box.classList.add("is-open");
      document.body.classList.add("no-scroll");
    }

    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target === image) close();
    });

    document.addEventListener("keydown", function (e) {
      if (box.classList.contains("is-open")) {
        e.preventDefault();
        close();
      } else if (e.key === "Escape") {
        close();
      }
    });

    document.addEventListener("click", function (e) {
      var target = e.target;
      if (target && target.closest) {
        var cert = target.closest(".achievement[data-cert]");
        if (cert) {
          e.preventDefault();
          open(
            cert.getAttribute("data-cert"),
            cert.getAttribute("data-cert-title") || "Certificate"
          );
          return;
        }
      }
      if (target && target.matches && target.matches("img[data-zoom]")) {
        open(target.getAttribute("data-zoom"), target.alt || "");
      }
    });
  }

  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function initTheme() {
    var root = document.documentElement;
    var buttons = document.querySelectorAll(".theme-toggle");
    if (!buttons.length) return;

    function sync() {
      var isLight = root.getAttribute("data-theme") === "light";
      Array.prototype.forEach.call(buttons, function (btn) {
        btn.setAttribute(
          "aria-label",
          isLight ? "Switch to dark mode" : "Switch to light mode"
        );
      });
    }

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        var isLight = root.getAttribute("data-theme") === "light";
        function changeTheme() {
          if (isLight) {
            root.removeAttribute("data-theme");
          } else {
            root.setAttribute("data-theme", "light");
          }
          try {
            localStorage.setItem("theme", isLight ? "dark" : "light");
          } catch (e) {}
          sync();
        }

        document.body.classList.add("theme-changing");
        changeTheme();
        window.setTimeout(function () {
          document.body.classList.remove("theme-changing");
        }, 520);
      });
    });

    sync();
  }

  function initParallax() {
    var visual = document.querySelector("[data-parallax]");
    if (!visual || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    var image = visual.querySelector("img");
    if (!image) return;

    var frame = 0;
    var pointerX = 0;
    var pointerY = 0;
    visual.addEventListener("pointermove", function (event) {
      var rect = visual.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        image.style.setProperty("--visual-x", (pointerX * 10).toFixed(2) + "px");
        image.style.setProperty("--visual-y", (pointerY * 10).toFixed(2) + "px");
        image.style.setProperty("--visual-rx", (-pointerY * 4).toFixed(2) + "deg");
        image.style.setProperty("--visual-ry", (pointerX * 4).toFixed(2) + "deg");
      });
    });
    visual.addEventListener("pointerleave", function () {
      image.style.setProperty("--visual-x", "0px");
      image.style.setProperty("--visual-y", "0px");
      image.style.setProperty("--visual-rx", "0deg");
      image.style.setProperty("--visual-ry", "0deg");
    });
  }

  function initPageTransitions() {
    window.addEventListener("pageshow", function () { document.body.classList.remove("page-fade-out"); });
    document.body.classList.add("page-ready");
    document.addEventListener("click", function (event) {
      var anchor = event.target.closest && event.target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      var href = anchor.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || /^(https?:|mailto:|tel:)/i.test(href)) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      document.body.classList.add("page-fade-out");
      window.setTimeout(function () { window.location.href = href; }, 220);
    });
  }

  function initPdfDownload() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-download-pdf]"));
    var busy = false;
    function prepareImages() {
      return Promise.all(Array.prototype.map.call(document.images, function (image) {
        if (!image.getAttribute("src")) return Promise.resolve();
        image.loading = "eager";
        return new Promise(function (resolve) {
          if (image.complete) { resolve(); return; }
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }).then(function () {
          if (!image.naturalWidth) throw new Error("Image failed to load");
          return image.decode ? image.decode().catch(function () {}) : undefined;
        });
      }));
    }
    window.addEventListener("beforeprint", prepareImages);
    buttons.forEach(function (button) {
      button.addEventListener("click", async function () {
        if (busy) return;
        busy = true;
        var label = button.innerHTML;
        buttons.forEach(function (item) { item.disabled = true; });
        button.textContent = "Preparing PDF…";
        var timeout;
        try {
          await Promise.race([
            Promise.all([prepareImages(), document.fonts ? document.fonts.ready : Promise.resolve()]),
            new Promise(function (_, reject) {
              timeout = window.setTimeout(function () { reject(new Error("Loading timed out")); }, 20000);
            })
          ]);
          await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
          window.print();
        } catch (error) {
          window.alert("Some images or fonts could not finish loading. Please check your connection and try downloading the PDF again.");
        } finally {
          window.clearTimeout(timeout);
          button.innerHTML = label;
          buttons.forEach(function (item) { item.disabled = false; });
          busy = false;
        }
      });
    });
  }

  function fail(message) {
    var mount = document.getElementById("games") || document.getElementById("game-root");
    if (!mount) return;
    mount.innerHTML = "";
    var box = el("div", "load-error");
    box.appendChild(el("h3", "", "Couldn't load game data"));
    box.appendChild(el("p", "", message));
    mount.appendChild(box);
  }

  function start(data) {
    var page = document.body.getAttribute("data-page");
    if (page === "game") {
      var id = new URLSearchParams(window.location.search).get("id") || "";
      renderGame(data, id);
    } else {
      renderHome(data);
    }
    initLightbox();
    initHeader();
    initTheme();
    initParallax();
    initPageTransitions();
    initPdfDownload();
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.GAMES_DATA) {
      start(window.GAMES_DATA);
      return;
    }
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(start)
      .catch(function (err) {
        fail(
          "Couldn't load game data. Make sure data/games.js is present. (" +
            err.message +
            ")"
        );
      });
  });
})();

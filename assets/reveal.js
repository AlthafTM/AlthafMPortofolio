(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var targets = new Set();
  var selector = ".hero__intro > *, .section__head > *, .about__lead, .engine, .current__intro > *, .current__stage, .current__toolbar, .current__note, .game__head, .game__desc, .game__actions, .rail, .achievement, .soundtrack, .skill, .social, .detail__intro > *, .detail__section-title, .panel, .point, .detail__nav";
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle("is-in-view", entry.isIntersecting || motion.matches);
    });
  }, { rootMargin: "-60px 0px -24px 0px", threshold: 0 });
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    var items = Array.from(root.querySelectorAll(selector));
    if (root.matches(selector)) items.unshift(root);
    items.forEach(function (item) {
      if (targets.has(item) || !item.closest("main")) return;
      targets.add(item);
      item.classList.add("scroll-pop");
      if (motion.matches) item.classList.add("is-in-view");
      observer.observe(item);
    });
  }
  scan(document.querySelector("main"));
  // Also cover game details opened without interrupting the music player.
  new MutationObserver(function (mutations) {
    targets.forEach(function (item) {
      if (!item.isConnected) { observer.unobserve(item); targets.delete(item); }
    });
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (item) {
        if (item.nodeType === 1 && (item.matches("main") || item.closest("main"))) scan(item);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
  motion.addEventListener("change", function () {
    targets.forEach(function (item) {
      if (motion.matches) item.classList.add("is-in-view");
      else { observer.unobserve(item); observer.observe(item); }
    });
  });
})();

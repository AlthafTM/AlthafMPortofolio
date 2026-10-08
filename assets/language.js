(function () {
  "use strict";
  var language = "en";
  try { if (localStorage.getItem("language") === "id") language = "id"; } catch (error) {}
  var originals = new WeakMap();
  var attributes = new WeakMap();
  // Translate controls and descriptive copy; preserve all headings and project names.
  var copySelector = ".skip-link, .not-found-link, .site-nav, .btn, .back-link, .detail__nav-label, .achievement__cta, .about__lead, .engine__text, .game__desc, .detail__desc, .panel__value, .point__text, .lightbox__hint, .detail__missing p, .load-error p, .not-found-text3";
  function translate(text) {
    if (language === "en") return text;
    var key = text.trim().replace(/\s+/g, " ");
    var value = window.PORTFOLIO_ID[key];
    if (!value) value = key.replace(/ screenshot (\d+)/g, " tangkapan layar $1").replace(/ icon$/g, " ikon").replace(/ certificate$/g, " sertifikat").replace(/^(\d+) out of 5$/, "$1 dari 5");
    return text.replace(text.trim(), value);
  }
  function apply() {
    document.documentElement.lang = language;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest("script, style, .language-switch") || !node.parentElement.closest(copySelector)) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      node.nodeValue = translate(originals.get(node));
    }
    document.querySelectorAll("button[aria-label], button[title], a[aria-label], nav[aria-label]").forEach(function (element) {
      if (element.matches(".language-switch, .theme-toggle")) return;
      if (!attributes.has(element)) {
        var values = {};
        ["aria-label", "title"].forEach(function (name) { if (element.hasAttribute(name)) values[name] = element.getAttribute(name); });
        attributes.set(element, values);
      }
      Object.entries(attributes.get(element)).forEach(function (pair) { element.setAttribute(pair[0], translate(pair[1])); });
    });
    document.querySelectorAll(".language-switch").forEach(function (button) {
      button.setAttribute("aria-checked", String(language === "id"));
      button.setAttribute("aria-label", language === "en" ? "Language: English. Switch to Bahasa Indonesia" : "Bahasa: Indonesia. Beralih ke English");
      button.title = language === "en" ? "Switch to Bahasa Indonesia" : "Beralih ke English";
    });
    document.dispatchEvent(new Event("languagechange"));
  }
  window.PortfolioLanguage = { apply: apply, translate: translate };
  document.querySelectorAll(".language-slot").forEach(function (slot) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "language-switch";
    button.setAttribute("role", "switch");
    ["en", "id"].forEach(function (code) {
      var flagWrap = document.createElement("span");
      flagWrap.className = "language-flag language-flag--" + code;
      flagWrap.setAttribute("aria-hidden", "true");
      var flag = document.createElement("img");
      flag.src = "public/flag-" + code + ".svg?v=uk-20261009";
      flag.alt = "";
      flagWrap.appendChild(flag);
      button.appendChild(flagWrap);
    });
    button.addEventListener("click", function () {
      language = language === "en" ? "id" : "en";
      try { localStorage.setItem("language", language); } catch (error) {}
      apply();
    });
    slot.appendChild(button);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();

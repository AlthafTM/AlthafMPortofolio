(function () {
  "use strict";
  var language = "en";
  try { if (localStorage.getItem("language") === "id") language = "id"; } catch (error) {}
  var originals = new WeakMap();
  var attributes = new WeakMap();
  var title = document.title;
  var animation;
  function translate(text) {
    if (language === "en") return text;
    var key = text.trim().replace(/\s+/g, " ");
    var value = window.PORTFOLIO_ID[key];
    if (!value) value = key.replace(/ screenshot (\d+)/g, " tangkapan layar $1").replace(/ icon$/g, " ikon").replace(/ certificate$/g, " sertifikat").replace(/^(\d+) out of 5$/, "$1 dari 5").replace(/Game Developer/g, "Pengembang Game");
    return text.replace(text.trim(), value);
  }
  function apply() {
    document.documentElement.lang = language;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest("script, style, .language-switch")) continue;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      node.nodeValue = translate(originals.get(node));
    }
    document.querySelectorAll("[aria-label], [title], img[alt]").forEach(function (element) {
      if (element.closest(".language-switch") || element.matches(".theme-toggle")) return;
      if (!attributes.has(element)) {
        var values = {};
        ["aria-label", "title", "alt"].forEach(function (name) { if (element.hasAttribute(name)) values[name] = element.getAttribute(name); });
        attributes.set(element, values);
      }
      Object.entries(attributes.get(element)).forEach(function (pair) { element.setAttribute(pair[0], translate(pair[1])); });
    });
    // Capture the rendered project title on the first pass.
    if (!window.PortfolioLanguage.applied) title = document.title;
    document.title = translate(title);
    window.PortfolioLanguage.applied = true;
    document.querySelectorAll(".language-option").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
    document.dispatchEvent(new Event("languagechange"));
  }
  window.PortfolioLanguage = { apply: apply, translate: translate };
  document.querySelectorAll(".language-slot").forEach(function (slot) {
    var group = document.createElement("div");
    group.className = "language-switch";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Language / Bahasa");
    ["en", "id"].forEach(function (code) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "language-option";
      button.dataset.language = code;
      button.setAttribute("aria-label", code === "en" ? "English" : "Bahasa Indonesia");
      button.title = code === "en" ? "English" : "Bahasa Indonesia";
      var flag = document.createElement("img");
      flag.src = "public/flag-" + code + ".svg";
      flag.alt = "";
      button.appendChild(flag);
      button.addEventListener("click", function () {
        if (language === code) return;
        language = code;
        try { localStorage.setItem("language", code); } catch (error) {}
        apply();
        group.classList.remove("is-switching");
        void group.offsetWidth;
        group.classList.add("is-switching");
        clearTimeout(animation);
        animation = setTimeout(function () { group.classList.remove("is-switching"); }, 350);
      });
      group.appendChild(button);
    });
    slot.appendChild(group);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();

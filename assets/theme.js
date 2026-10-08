(function () {
  "use strict";
  var root = document.documentElement;
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".theme-toggle"));
  var changing = false;
  function sync() {
    var light = root.getAttribute("data-theme") === "light";
    buttons.forEach(function (button) {
      button.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      button.setAttribute("aria-pressed", String(light));
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (changing) return;
      changing = true;
      function update() {
        root.classList.add("theme-changing");
        var light = root.getAttribute("data-theme") === "light";
        if (light) root.removeAttribute("data-theme");
        else root.setAttribute("data-theme", "light");
        try { localStorage.setItem("theme", light ? "dark" : "light"); } catch (error) {}
        sync();
      }
      function finish() {
        root.classList.remove("theme-changing");
        changing = false;
      }
      if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        var transition = document.startViewTransition(update);
        transition.finished.then(finish, finish);
      } else {
        update();
        requestAnimationFrame(finish);
      }
    });
  });
  sync();
})();

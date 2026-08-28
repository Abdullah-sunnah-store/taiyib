/**
 * TAIYIB — the two pieces of behaviour on the page.
 *
 *  1. Scroll reveal: IntersectionObserver at threshold 0.12, fired once.
 *     The transition itself (1.9s, 26px) lives in taiyib.css so that
 *     prefers-reduced-motion can collapse it to its end state.
 *
 *  2. Scroll rail: an --osso fill whose scaleY tracks scroll progress,
 *     smoothed by a spring. Replaces framer-motion useScroll + useSpring
 *     (stiffness 62, damping 26, restDelta 0.0005).
 */
(function () {
  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- reveal */

  function initReveal(root) {
    var nodes = (root || document).querySelectorAll('.reveal:not(.is-in)');
    if (!nodes.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-in');
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('is-in');
            observer.unobserve(entries[i].target);
          }
        }
      },
      { threshold: 0.12 }
    );

    for (var j = 0; j < nodes.length; j++) observer.observe(nodes[j]);
  }

  /* ------------------------------------------------------------ scroll rail */

  function initRail() {
    var fill = document.querySelector('.scroll-rail__fill');
    if (!fill) return;

    if (reduced) {
      fill.style.transform = 'scaleY(1)';
      return;
    }

    // Critically-ish damped spring, matching the framer-motion feel.
    var STIFFNESS = 62;
    var DAMPING = 26;
    var REST = 0.0005;

    var current = 0;
    var velocity = 0;
    var target = 0;
    var running = false;

    function progress() {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 0;
      var y = window.scrollY || window.pageYOffset || 0;
      return Math.min(1, Math.max(0, y / scrollable));
    }

    function step() {
      // Fixed 1/60s integration step keeps the spring frame-rate independent.
      var dt = 1 / 60;
      var force = -STIFFNESS * (current - target);
      var damper = -DAMPING * velocity;
      velocity += (force + damper) * dt;
      current += velocity * dt;

      fill.style.transform = 'scaleY(' + current + ')';

      if (Math.abs(current - target) < REST && Math.abs(velocity) < REST) {
        current = target;
        velocity = 0;
        fill.style.transform = 'scaleY(' + current + ')';
        running = false;
        return;
      }

      window.requestAnimationFrame(step);
    }

    function kick() {
      target = progress();
      if (!running) {
        running = true;
        window.requestAnimationFrame(step);
      }
    }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick, { passive: true });
    kick();
  }

  function init() {
    initReveal(document);
    initRail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* The theme editor swaps section markup in without a reload, so any
     freshly injected .reveal has to be picked up again. */
  document.addEventListener('shopify:section:load', function (event) {
    initReveal(event.target);
  });
})();

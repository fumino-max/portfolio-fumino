/* スクロールでの登場・数字のカウント・追いかける相談ボタン */
(() => {
  const fixed = new URLSearchParams(location.search).has('t');
  const items = document.querySelectorAll('.io');
  const fmt = (n) => n.toLocaleString('en-US');

  function count(el) {
    const to = parseInt(el.dataset.count, 10);
    if (fixed || to < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
    const dur = to > 100 ? 1500 : 700, t0 = performance.now();
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(Math.max(1, Math.round(to * e)));
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (fixed || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(count);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    items.forEach((el) => io.observe(el));
  }

  const float = document.getElementById('float');
  const contact = document.getElementById('contact');
  const onScroll = () => {
    const y = window.scrollY, h = window.innerHeight;
    const nearEnd = contact.getBoundingClientRect().top < h * 0.9;
    float.classList.toggle('show', y > h * 0.9 && !nearEnd);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

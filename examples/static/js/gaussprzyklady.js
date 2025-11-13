document.addEventListener('DOMContentLoaded', () => {
  const sekcje = document.querySelectorAll(
    '.przyklad-sekcja, .sekcja-naglowek.anim-wejscie, .przyklady-toolbar.anim-wejscie'
  );
  const ioSekcje = new IntersectionObserver((entries, o) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('aktywna');
      const t = e.target.querySelector?.('.przyklad-title, .sch-naglowek');
      if (t) t.classList.add('aktywne-underline');
      o.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '250px 0px' });
  sekcje.forEach(s => ioSekcje.observe(s));

  document.querySelectorAll('.btn-rozwiaz').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('klik');
      setTimeout(() => btn.classList.remove('klik'), 200);
    });
  });

  const contentWidth = (el) => {
    const cs = getComputedStyle(el);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    return Math.max(0, el.clientWidth - pl - pr);
  };

  const MAX_UPSCALE = 1.18;
  const MIN_DOWNSCALE = 0.55;
  const SAFETY = 12;

  const dopasujJeden = (box) => {
    const math = box.querySelector('.katex-display, .katex, .tex-src');
    if (!math) return;

    math.style.transform = 'none';
    math.style.transformOrigin = 'center top';
    box.style.minHeight = '156px';

    const availContent = contentWidth(box);
    const target = Math.max(0, availContent - SAFETY);

    const r0 = math.getBoundingClientRect();
    if (!r0.width) return;

    let scale = target / r0.width;
    scale = Math.max(MIN_DOWNSCALE, Math.min(scale, MAX_UPSCALE)) * 0.985;

    if (Math.abs(scale - 1) < 0.02) {
      math.style.transform = 'none';
    } else {
      math.style.transform = `scale(${scale})`;
    }

    const r1 = math.getBoundingClientRect();
    box.style.minHeight = `${Math.max(156, Math.ceil(r1.height) + 10)}px`;
  };

  const dopasujWszystkie = () => {
    document.querySelectorAll('.gauss-strona .przyklad-math').forEach(dopasujJeden);
  };

  window.dopasujWszystkieRownania = dopasujWszystkie;

  let rAF;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(dopasujWszystkie);
  });

  const kontenerListy = document.querySelector('.lista-przykladow');

  const initKatex = () => {
    if (typeof window.renderMathInElement !== 'function') {
      setTimeout(initKatex, 50);
      return;
    }
    if (initKatex._done) return;

    window.renderMathInElement(kontenerListy, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "$",   right: "$",   display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });

    initKatex._done = true;

    requestAnimationFrame(dopasujWszystkie);
  };

  initKatex();
});

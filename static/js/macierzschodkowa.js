document.addEventListener('DOMContentLoaded', () => {
  const sekcje = document.querySelectorAll('.sch-sekcja');

  const obserwator = new IntersectionObserver((wpisy, obserwatorInstancja) => {
    wpisy.forEach(wpis => {
      if (wpis.isIntersecting) {
        wpis.target.classList.add('aktywna');

        const naglowek = wpis.target.querySelector('.sch-naglowek');
        if (naglowek) naglowek.classList.add('aktywne-underline');

        obserwatorInstancja.unobserve(wpis.target);
      }
    });
  }, { threshold: 0.1 });

  sekcje.forEach(sekcja => obserwator.observe(sekcja));

  document.querySelectorAll('.macierz tr').forEach((wiersz) => {
    const opoznienie = wiersz.dataset.opoznienie;
    if (opoznienie) wiersz.style.animationDelay = `${opoznienie}s`;
  });

  const linkOperacje = document.getElementById('pokaz-operacje');
  const kontenerOperacje = document.getElementById('kontener-operacje');
  const btnZamknij = document.getElementById('zamknij-operacje');

  if (linkOperacje && kontenerOperacje && btnZamknij) {
    const setTargetHeight = () => {
      kontenerOperacje.style.setProperty('--operacje-h', 'auto');
      const h = kontenerOperacje.scrollHeight;
      kontenerOperacje.style.setProperty('--operacje-h', `${h}px`);
    };

    const showPanel = () => {
      setTargetHeight();
      kontenerOperacje.classList.add('widoczny');
      kontenerOperacje.setAttribute('aria-hidden', 'false');
    };

    const hidePanel = () => {
      kontenerOperacje.style.setProperty('--operacje-h', '0px');
      kontenerOperacje.classList.remove('widoczny');
      kontenerOperacje.setAttribute('aria-hidden', 'true');
    };

    const toggleOperacje = (pokaz = null) => {
      const wid = kontenerOperacje.classList.contains('widoczny');
      if (pokaz === true || (!wid && pokaz === null)) {
        showPanel();
      } else if (pokaz === false || (wid && pokaz === null)) {
        hidePanel();
      }
    };

    linkOperacje.addEventListener('click', (e) => {
      e.preventDefault();
      linkOperacje.classList.add('klik');
      setTimeout(() => linkOperacje.classList.remove('klik'), 300);
      toggleOperacje();
    });

    btnZamknij.addEventListener('click', () => toggleOperacje(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleOperacje(false);
    });

    document.addEventListener('click', (e) => {
      if (!kontenerOperacje.classList.contains('widoczny')) return;
      const klikWewnatrz = kontenerOperacje.contains(e.target) || e.target === linkOperacje;
      if (!klikWewnatrz) toggleOperacje(false);
    });

    window.addEventListener('resize', () => {
      if (kontenerOperacje.classList.contains('widoczny')) setTargetHeight();
    });
  }
});

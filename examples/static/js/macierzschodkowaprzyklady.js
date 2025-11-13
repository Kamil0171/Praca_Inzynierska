document.addEventListener('DOMContentLoaded', () => {
  const sekcje = document.querySelectorAll(
    '.przyklad-sekcja, .sekcja-naglowek.anim-wejscie, .przyklady-toolbar.anim-wejscie'
  );

  const obserwator = new IntersectionObserver((wpisy, obserwatorInstancja) => {
    wpisy.forEach(wpis => {
      if (!wpis.isIntersecting) return;

      wpis.target.classList.add('aktywna');

      const tytul = wpis.target.querySelector?.('.przyklad-title, .sch-naglowek');
      if (tytul) tytul.classList.add('aktywne-underline');

      const tabele = wpis.target.querySelectorAll?.('table.macierz');
      if (tabele?.length) {
        tabele.forEach(tab => {
          const wiersze = tab.querySelectorAll('tr');
          wiersze.forEach((wiersz, idx) => {
            if (!wiersz.dataset.opoznienie) {
              wiersz.dataset.opoznienie = (idx * 0.08).toFixed(2);
            }
            wiersz.style.animationDelay = `${wiersz.dataset.opoznienie}s`;
          });
        });
      }

      obserwatorInstancja.unobserve(wpis.target);
    });
  }, {
    threshold: 0.1,
    rootMargin: '250px 0px'
  });

  sekcje.forEach(sekcja => obserwator.observe(sekcja));

  document.querySelectorAll('.przyklad-sekcja table.macierz').forEach(tab => {
    const wiersze = tab.querySelectorAll('tr');
    wiersze.forEach((wiersz, idx) => {
      const opoznienie = wiersz.dataset.opoznienie ?? (idx * 0.08).toFixed(2);
      wiersz.dataset.opoznienie = opoznienie;
      wiersz.style.animationDelay = `${opoznienie}s`;
    });
  });

  document.querySelectorAll('.przyklad-sekcja').forEach(sekcja => {
    let kroki;
    try {
      kroki = JSON.parse(sekcja.dataset.kroki || '[]');
    } catch {
      kroki = [];
    }
    if (!kroki.length) return;

    const tabela = sekcja.querySelector('table.macierz');
    const nr = sekcja.querySelector('.numer-kroku');
    const max = sekcja.querySelector('.liczba-krokow');
    const komentarz = sekcja.querySelector('.komentarz');

    const render = () => {
      const stan = kroki[i];
      if (!stan) return;

      if (Array.isArray(stan.macierz) && tabela) {
        tabela.innerHTML = stan.macierz
          .map(w => `<tr>${w.map(el => `<td>${el}</td>`).join('')}</tr>`)
          .join('');
      }

      if (nr) nr.textContent = i + 1;
      if (max) max.textContent = kroki.length;
      if (komentarz) komentarz.textContent = stan.komentarz || '';
    };

    let i = 0;
    render();

    const btnReset = sekcja.querySelector('[data-akcja="reset"]');
    const btnPrev  = sekcja.querySelector('[data-akcja="prev"]');
    const btnNext  = sekcja.querySelector('[data-akcja="next"]');

    btnReset?.addEventListener('click', () => { i = 0; render(); });
    btnPrev ?.addEventListener('click', () => { if (i > 0) { i--; render(); } });
    btnNext ?.addEventListener('click', () => { if (i < kroki.length - 1) { i++; render(); } });
  });
});

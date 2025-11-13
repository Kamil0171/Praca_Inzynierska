document.addEventListener('DOMContentLoaded', () => {
  const sekcje = document.querySelectorAll('.gauss-sekcja');

  const obserwator = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aktywna');

        const h = entry.target.querySelector('.gauss-naglowek');
        if (h) h.classList.add('aktywne-underline');

        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sekcje.forEach(sekcja => obserwator.observe(sekcja));

  document.querySelectorAll('.link-wewnetrzny, .btn-przyklady').forEach(link => {
    link.addEventListener('click', () => {
      link.classList.add('klik');
      setTimeout(() => link.classList.remove('klik'), 300);
    });
  });
});

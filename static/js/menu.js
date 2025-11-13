(function () {
  const pasek = document.querySelector('.pasek-zadan');
  if (!pasek) return;

  let ostatniaPozycja = window.scrollY;
  const prog = 8;
  const minY = 80;
  const progPokazania = 100;

  pasek.classList.add('preload');
  if (ostatniaPozycja > minY) {
    pasek.classList.add('ukryty');
  } else {
    pasek.classList.remove('ukryty');
  }

  requestAnimationFrame(() => pasek.classList.remove('preload'));

  window.addEventListener('scroll', () => {
    const y = window.scrollY;

    if (Math.abs(y - ostatniaPozycja) < prog) return;

    if (y > ostatniaPozycja && y > minY) {
      pasek.classList.add('ukryty');
    } else if (y < ostatniaPozycja && y < progPokazania) {
      pasek.classList.remove('ukryty');
    }

    ostatniaPozycja = y;
  }, { passive: true });
})();

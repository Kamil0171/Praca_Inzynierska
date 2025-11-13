(function () {
  function stworzElement(tag, klasa, html) {
    const element = document.createElement(tag);
    if (klasa) element.className = klasa;
    if (html != null) element.innerHTML = html;
    return element;
  }

  function przetworzMatematykę(korzen) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      return window.MathJax.typesetPromise([korzen]).catch(() => {});
    }
    return Promise.resolve();
  }

  function doLatexJesliUlamek(tekst) {
    if (tekst == null) return "";
    const ciag = String(tekst).trim();
    const dopasowanie = ciag.match(/^(-?)(\d+)\s*\/\s*(\d+)$/);
    if (!dopasowanie) return `\\(${ciag}\\)`;
    const znak = dopasowanie[1] === "-" ? "-" : "";
    const licznik = dopasowanie[2];
    const mianownik = dopasowanie[3];
    return `\\(${znak}\\tfrac{${licznik}}{${mianownik}}\\)`;
  }

  function rysujMacierz(kontener, krok) {
    kontener.innerHTML = "";

    const macierzRozszerzona = krok.aug || [];
    const liczbaWierszy = macierzRozszerzona.length;
    const liczbaKolumn = liczbaWierszy ? macierzRozszerzona[0].length : 0;
    const kolumnaSeparatora = liczbaKolumn > 0 ? liczbaKolumn - 1 : 0;

    const owijka = stworzElement("div", "gk-macierz gk-elev anim-matrix");
    owijka.style.gridTemplateColumns = `repeat(${liczbaKolumn + 1}, auto)`;

    if(liczbaKolumn > 6) {
      owijka.style.padding = "10px 14px";
      owijka.style.gap = "4px";
    }

    const cieniowaneWiersze = Array.isArray(krok.shade_rows) ? krok.shade_rows.slice(0, 2) : [];
    const wiersZielony = cieniowaneWiersze[0];
    const wiersZolty = cieniowaneWiersze[1];

    const elementyWierszy = [];

    for (let i = 0; i < liczbaWierszy; i++) {
      const wiersz = [];
      for (let j = 0; j < liczbaKolumn; j++) {
        if (j === kolumnaSeparatora) owijka.appendChild(stworzElement("div", "gk-sep"));
        const wartosc = macierzRozszerzona[i][j];
        const komorka = stworzElement("div", "gk-komorka", doLatexJesliUlamek(wartosc));

        if(liczbaKolumn > 6) {
          komorka.style.minWidth = "46px";
          komorka.style.padding = "6px 7px";
          komorka.style.fontSize = ".88rem";
        }

        const czyPodstawienieWstecz = krok.type === "back_substitute";
        if (!czyPodstawienieWstecz) {
          if (typeof wiersZielony === "number" && wiersZielony === i) komorka.classList.add("gk-row-green");
          if (typeof wiersZolty === "number" && wiersZolty === i) komorka.classList.add("gk-row-yellow");
        }

        if (krok.highlight && krok.highlight.row === i && krok.highlight.col === j) {
          const czyPodstawienieWsteczPivot = krok.type === "back_substitute";
          komorka.classList.add(czyPodstawienieWsteczPivot ? "gk-pivot--wstecz" : "gk-pivot");
        }

        wiersz.push(komorka);
        owijka.appendChild(komorka);
      }
      elementyWierszy.push(wiersz);
    }

    kontener.appendChild(owijka);

    return elementyWierszy;
  }

  function podzielDymekOperacjiNaDwie(opTex) {
    if (!opTex) return [opTex];

    const m = opTex.match(/^\\\(([\s\S]*)\\\)$/);
    const zNawiasami = !!m;
    let srodek = m ? m[1] : opTex;

    let prefiks = "";
    const mPref = srodek.match(/^(K_\{[^}]+\}:\s*\\?;?\s*)/);
    if (mPref) {
      prefiks = mPref[0];
      srodek = srodek.slice(prefiks.length);
    }

    let czesci = srodek.split(/\\;,\s*\\;/g).map(t => t.trim()).filter(Boolean);

    if (czesci.length <= 1) {
      return [opTex];
    }

    if (czesci.length > 2) {
      const polowa = Math.ceil(czesci.length / 2);
      czesci = [czesci.slice(0, polowa).join("\\;,\\; "), czesci.slice(polowa).join("\\;,\\; ")];
    }

    const LIMIT = 140;
    if (czesci.length === 2 && (czesci[0].length > LIMIT || czesci[1].length > LIMIT)) {
      const pol = Math.floor(czesci[0].length / 2);
      let idx = czesci[0].slice(pol).search(/\)\\,|W_/);
      idx = idx > -1 ? pol + idx : pol;
      czesci = [czesci[0].slice(0, idx).trim(), (czesci[0].slice(idx) + " \\;,\\; " + czesci[1]).trim()];
    }

    return czesci.map(t => {
      const tresc = `${prefiks}${t}`;
      return zNawiasami ? `\\(${tresc}\\)` : tresc;
    });
  }

  function rozlokujKotwiczoneDymki(lewaKolumna, elementyWierszy, rekordy) {
    const skumulowane = Object.create(null);
    rekordy.forEach(({ el, wiersz }) => {
      const pierwszaKomorka = elementyWierszy[wiersz] && elementyWierszy[wiersz][0];
      if (!pierwszaKomorka) return;
      const komorkaRect = pierwszaKomorka.getBoundingClientRect();
      const lewaRect = lewaKolumna.getBoundingClientRect();
      const baza = komorkaRect.top - lewaRect.top + (komorkaRect.height - el.offsetHeight) / 2;
      const dodatek = skumulowane[wiersz] || 0;
      const top = baza + dodatek;
      el.style.top = `${top}px`;
      skumulowane[wiersz] = dodatek + el.offsetHeight + 8;
    });
  }

  function stworzPanel(korzen, kroki) {
    const panel = stworzElement("div", "gk-panel anim-in");

    const gora = stworzElement("div", "gk-top");
    const pudelkoTytulu = stworzElement("div", "gk-titlebox");
    pudelkoTytulu.append(
      stworzElement("div", "gk-badge", "Gauss"),
      stworzElement("div", "gk-title", "Rozwiązanie krok po kroku")
    );
    const infoKroku = stworzElement("div", "gk-step-info", "");
    const nawigacja = stworzElement("div", "gk-nav");
    const przyciskPoprzedni = stworzElement("button", "gk-btn gk-btn--ghost", "Poprzedni");
    const przyciskNastepny = stworzElement("button", "gk-btn gk-btn--primary", "Następny");
    const przyciskReset = stworzElement("button", "gk-btn gk-btn--dark", "Zresetuj");
    nawigacja.append(przyciskPoprzedni, przyciskNastepny, przyciskReset);
    gora.append(pudelkoTytulu, infoKroku, nawigacja);

    const zawartosc = stworzElement("div", "gk-content");
    const lewaKolumna = stworzElement("div", "gk-left");
    const owijkaMacierzy = stworzElement("div", "gk-matrix-wrap");

    zawartosc.append(lewaKolumna, owijkaMacierzy);

    const opis = stworzElement("div", "gk-desc");
    const legenda = stworzElement("div", "gk-legend", "<b>K<sub>i</sub></b> — kolumna &nbsp;&nbsp; <b>W<sub>j</sub></b> — wiersz");

    panel.append(gora, zawartosc, opis, legenda);
    korzen.innerHTML = "";
    korzen.appendChild(panel);

    let indeks = 0;
    const liczbaKrokow = kroki.length;

    function usunDuplikaty(dymki) {
      const unikalneTeksty = new Set();
      return dymki.filter(dymek => {
        if (unikalneTeksty.has(dymek.tekst)) {
          return false;
        }
        unikalneTeksty.add(dymek.tekst);
        return true;
      });
    }

    function aktualizuj() {
      indeks = Math.max(0, Math.min(indeks, liczbaKrokow - 1));
      const krok = kroki[indeks];

      infoKroku.textContent = `Krok ${indeks + 1}/${liczbaKrokow}`;

      const elementyWierszy = rysujMacierz(owijkaMacierzy, krok);

      lewaKolumna.innerHTML = "";

      const dymki = [];

      if (krok.op_chip_tex) {
        const czesci = podzielDymekOperacjiNaDwie(krok.op_chip_tex);
        czesci.forEach(tresc => {
          dymki.push({
            tekst: tresc,
            klasa: "gk-chip gk-chip--op anim-bubble",
            wiersz: krok.target_row
          });
        });
      }

      if (krok.side_eq_tex) {
        dymki.push({
          tekst: krok.side_eq_tex,
          klasa: "gk-chip gk-chip--eq anim-bubble",
          wiersz: krok.target_row
        });
      }

      if (krok.note_tex) {
        dymki.push({
          tekst: krok.note_tex,
          klasa: "gk-chip gk-chip--note anim-bubble",
          wiersz: krok.target_row
        });
      }

      const unikalneDymki = usunDuplikaty(dymki);

      const kotwiczone = [];
      unikalneDymki.forEach((dymek, idx) => {
        const element = stworzElement("div", dymek.klasa, dymek.tekst);

        if (typeof dymek.wiersz === "number" && elementyWierszy[dymek.wiersz]) {
          lewaKolumna.appendChild(element);

          requestAnimationFrame(() => {
            kotwiczone.push({ el: element, wiersz: dymek.wiersz });
            rozlokujKotwiczoneDymki(lewaKolumna, elementyWierszy, kotwiczone);
          });
        } else {
          element.style.position = "relative";
          element.style.top = `${idx * 50}px`;
          lewaKolumna.appendChild(element);
        }
      });

      if (krok.type === "result" && krok.solution_tex) {
        opis.innerHTML = `${krok.desc_tex || "Rozwiązanie:"}<br/>${krok.solution_tex}`;
      } else {
        opis.innerHTML = krok.desc_tex || "";
      }

      przyciskPoprzedni.disabled = indeks === 0;
      przyciskNastepny.disabled = indeks === liczbaKrokow - 1;
      legenda.style.display = indeks === 0 ? "block" : "none";
      
      przetworzMatematykę(panel).then(() => {
        rozlokujKotwiczoneDymki(lewaKolumna, elementyWierszy, kotwiczone);
      });
    }

    przyciskPoprzedni.addEventListener("click", () => { indeks--; aktualizuj(); });
    przyciskNastepny.addEventListener("click", () => { indeks++; aktualizuj(); });
    przyciskReset.addEventListener("click", () => { indeks = 0; aktualizuj(); });

    aktualizuj();

    return () => {};
  }

  let ostatnieSprzatanie = null;

  window.GaussKroki = {
    init: function (selektorKorzenia, kroki) {
      const korzen = typeof selektorKorzenia === "string"
        ? document.querySelector(selektorKorzenia)
        : selektorKorzenia;
      if (!korzen) return;
      if (!Array.isArray(kroki) || kroki.length === 0) {
        korzen.innerHTML = "";
        return;
      }
      if (typeof ostatnieSprzatanie === "function") {
        try { ostatnieSprzatanie(); } catch(_) {}
        ostatnieSprzatanie = null;
      }
      ostatnieSprzatanie = stworzPanel(korzen, kroki);
    },
    destroy: function (selektorKorzenia) {
      if (typeof ostatnieSprzatanie === "function") {
        try { ostatnieSprzatanie(); } catch(_) {}
        ostatnieSprzatanie = null;
      }
      const korzen = typeof selektorKorzenia === "string"
        ? document.querySelector(selektorKorzenia)
        : selektorKorzenia;
      if (korzen) korzen.innerHTML = "";
    }
  };
})();

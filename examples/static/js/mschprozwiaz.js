(function(){
  'use strict';

  const ZNAK_GAP = 24;

  const SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
  const toSub = (n) => String(n).split('').map(ch => SUB[ch] || ch).join('');
  const fmtK  = (k) => `K${toSub(k)}`;
  const fmtW  = (w) => `W${toSub(w)}`;

  function znajdzKontenerOkna(){
    return document.querySelector('#prawa-kolumna')
        || document.querySelector('.prawy-obszar')
        || document.querySelector('.prawy-panel')
        || document.querySelector('.sekcja-przyklady')
        || document.body;
  }
  function oknoWidoczne(okno){ return okno.classList.contains('okno-visible'); }

  function czekajAnimacji(el){
    return new Promise(resolve => el.addEventListener('animationend', resolve, { once:true }));
  }

  const SCROLL_DUR_MS = 900;
  const easeOutSine = (t) => Math.sin((Math.PI/2)*t);
  function przewinNaGoreBezPauzy(){
    const startY = window.scrollY || window.pageYOffset || 0;
    if (startY <= 10) return Promise.resolve();
    const html = document.documentElement;
    const prevInline = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    return new Promise(resolve=>{
      const t0 = performance.now();
      window.scrollTo({ top: Math.max(0, startY - 1), left: 0, behavior: 'auto' });
      function klatka(t){
        const u = Math.min(1, (t - t0) / SCROLL_DUR_MS);
        const y = Math.round(startY * (1 - easeOutSine(u)));
        window.scrollTo({ top: y, left: 0, behavior: 'auto' });
        if (u < 1) requestAnimationFrame(klatka);
        else { html.style.scrollBehavior = prevInline; resolve(); }
      }
      requestAnimationFrame(klatka);
    });
  }

  let flagaWejscia = false;
  let blokadaAnim = false;

  async function animujWejscie(okno){
    okno.classList.remove('okno-anim-in-a','okno-anim-in-b','okno-anim-out','okno-hidden');
    okno.classList.add('okno-visible');
    const kl = (flagaWejscia = !flagaWejscia) ? 'okno-anim-in-a' : 'okno-anim-in-b';
    void okno.offsetWidth;
    okno.classList.add(kl);
    await czekajAnimacji(okno);
    okno.classList.remove(kl);
  }
  async function animujWyjscie(okno){
    okno.classList.remove('okno-anim-in-a','okno-anim-in-b');
    okno.classList.add('okno-anim-out');
    await czekajAnimacji(okno);
    okno.classList.remove('okno-anim-out','okno-visible');
    okno.classList.add('okno-hidden');
  }

  function znajdzNumerPrzykladu(sekcja){
    const el = sekcja.querySelector('[data-tytul], .tytul, .naglowek, .card-title, .label, h1, h2, h3, h4, h5');
    let nr = null;
    if (el){
      const m1 = /Przykład\s*(\d+)/i.exec(el.textContent || '');
      if (m1) nr = m1[1];
      else{
        const m2 = /\b(\d+)\b/.exec(el.textContent || '');
        if (m2) nr = m2[1];
      }
    }
    if (!nr){
      const m = /Przykład\s*(\d+)/i.exec(sekcja.textContent || '');
      if (m) nr = m[1];
    }
    if (!nr){
      const all = Array.from(document.querySelectorAll('[data-przyklad], .przyklad, .kafelek, .card'))
        .filter(x => x.querySelector('table.macierz'));
      const idx = all.indexOf(sekcja);
      if (idx >= 0) nr = String(idx + 1);
    }
    return nr;
  }

  function zapewnijOkno(){
    const kontener = znajdzKontenerOkna();
    if (getComputedStyle(kontener).position === 'static'){
      kontener.style.position = 'relative';
    }
    let okno = document.querySelector('.okno-rozwiazania');
    if (!okno){
      okno = document.createElement('div');
      okno.className = 'okno-rozwiazania okno-hidden';
      okno.innerHTML = `
        <div class="okno-head" role="heading" aria-level="3">
          <h3 class="okno-tytul">Rozwiązanie przykładu</h3>
          <button type="button" class="okno-zamknij" aria-label="Zamknij">✕</button>
        </div>
        <div class="okno-tresc" role="document"></div>
      `;
      kontener.appendChild(okno);
      okno.querySelector('.okno-zamknij').addEventListener('click', async ()=>{
        if (blokadaAnim) return;
        blokadaAnim = true;
        await animujWyjscie(okno);
        blokadaAnim = false;
      });
    } else if (okno.parentElement !== kontener){
      kontener.appendChild(okno);
    }
    return okno;
  }

  async function otworzOknoDlaSekcji(sekcjaPrzykladu){
    const okno = zapewnijOkno();
    if (blokadaAnim) return;
    blokadaAnim = true;

    if (oknoWidoczne(okno)){
      await animujWyjscie(okno);
    }

    const tytul = okno.querySelector('.okno-tytul');
    const tresc = okno.querySelector('.okno-tresc');

    const nr = znajdzNumerPrzykladu(sekcjaPrzykladu);
    tytul.innerHTML = nr
      ? `Rozwiązanie przykładu <span class="okno-tytul-nr">#${nr}</span>`
      : 'Rozwiązanie przykładu';

    tytul.classList.remove('okno-tytul-anim'); void tytul.offsetWidth; tytul.classList.add('okno-tytul-anim');

    tresc.innerHTML = '<div class="mx-loading">Ładowanie kroków…</div>';
    await animujWejscie(okno);
    blokadaAnim = false;

    try{
      const kroki = await pobierzKrokiDlaSekcji(sekcjaPrzykladu);
      if (!Array.isArray(kroki) || kroki.length === 0){
        tresc.innerHTML = '<p>Brak kroków do wyświetlenia.</p>';
      } else {
        uruchomPrezentacjeKrokow(kroki, tresc);
      }
    } catch (err){
      if (err && err.message) {
        tresc.innerHTML = `<p>Wystąpił błąd:</p><pre style="white-space:pre-wrap">${err.message}</pre>`;
      } else {
        tresc.innerHTML = '<p>Wystąpił błąd podczas pobierania kroków.</p>';
      }
    }
  }

  function odczytajKrokiZDataAttr(sekcja){
    try{
      const surowe = sekcja?.dataset?.kroki;
      if (surowe){
        const dane = JSON.parse(surowe);
        // pusta tablica NIE blokuje API
        if (Array.isArray(dane) && dane.length > 0) return dane;
      }
    }catch{}
    return null;
  }

  function odczytajKrokiZeSkryptu(sekcja){
    const skrypt = sekcja.querySelector('script[type="application/json"][data-rozwiazanie="kroki"], script[type="application/json"].kroki');
    if (!skrypt) return null;
    try{
      const txt = skrypt.textContent || '';
      const dane = JSON.parse(txt);
      return (Array.isArray(dane) && dane.length > 0) ? dane : null;
    }catch{}
    return null;
  }

  function odczytajMacierzZSekcji(sekcja){
    const tabela = sekcja.querySelector('table.macierz');
    if (!tabela) return null;
    const M = [];
    tabela.querySelectorAll('tr').forEach(tr=>{
      const w = [];
      tr.querySelectorAll('td,th').forEach(td=> w.push(Number((td.textContent||'').trim().replace(',', '.'))));
      if (w.length) M.push(w);
    });
    return M;
  }

  function zgadnijSciezkiAPI(sekcja){
    const zSekcji = sekcja?.dataset?.apiKroki;
    const zMeta = document.querySelector('meta[name="msch-api"]')?.content;
    const kandydaci = [];
    if (zSekcji) kandydaci.push(zSekcji);
    if (zMeta) kandydaci.push(zMeta);
    kandydaci.push('/przyklady/api/msch/kroki');
    kandydaci.push('/api/msch/kroki');
    return [...new Set(kandydaci)];
  }

  async function pobierzKrokiZAPI(sekcja){
    const macierz = odczytajMacierzZSekcji(sekcja);
    if (!macierz) throw new Error('Nie udało się odczytać macierzy wejściowej.');

    const urlKandydaci = zgadnijSciezkiAPI(sekcja);
    let ostatniBlad = null;

    for (const url of urlKandydaci){
      try{
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ macierz })
        });
        if (!res.ok){
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const dane = await res.json();
        if (Array.isArray(dane)) return dane;
        if (Array.isArray(dane?.kroki)) return dane.kroki;
        throw new Error('Niepoprawny format odpowiedzi API.');
      }catch(err){
        ostatniBlad = err;
      }
    }
    throw (ostatniBlad || new Error('Nie udało się pobrać kroków z API.'));
  }

  async function pobierzKrokiDlaSekcji(sekcja){
    const zData = odczytajKrokiZDataAttr(sekcja);
    if (zData) return zData;

    const zeSkryptu = odczytajKrokiZeSkryptu(sekcja);
    if (zeSkryptu) return zeSkryptu;

    return await pobierzKrokiZAPI(sekcja);
  }

  function zbudujTabele(macierz){
    const tabela = document.createElement('table');
    tabela.className = 'macierz macierz--okno';
    const tbody = document.createElement('tbody');
    macierz.forEach(w=>{
      const tr = document.createElement('tr');
      w.forEach(v=>{
        const td = document.createElement('td');
        td.textContent = (v != null ? String(v) : '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tabela.appendChild(tbody);
    return tabela;
  }

  function normalizujCzynnikDoNapisu(f){
    let s = String(f == null ? '' : f).trim();
    s = s.replace(',', '.');
    const neg = s.startsWith('-') || s.startsWith('−');
    if (neg) s = s.slice(1);
    if (/^\d+(?:\.\d+)?$/.test(s)){
      s = s.replace(/\.?0+$/,'');
      if (s === '') s = '0';
    }
    return { neg, abs: s };
  }

  function formatujZnakOperacji(krok){
    if ((krok.typ !== 'elim' && krok.typ !== 'plan') || !krok.operacje?.length) return '';
    const op = krok.operacje[0];
    const k = krok.kolumna;
    const t = op.target, s = op.src;

    const { neg, abs } = normalizujCzynnikDoNapisu(op.factor);
    const znak = (neg ? '−' : '+');
    const mnoz = (abs === '1' ? '' : abs + '·');

    return `${fmtK(k)}:  ${fmtW(t)}  ←  ${fmtW(t)}  ${znak}  ${mnoz}${fmtW(s)}`;
  }

  function pokazBlokZmiany(blokEl, tabela, zmienione){
    if (!blokEl || !Array.isArray(zmienione) || zmienione.length === 0){
      if (blokEl) blokEl.classList.add('mx-blok--ukryty');
      return;
    }

    const rowIdx = zmienione[0][0];
    const rowEl  = tabela.rows[rowIdx - 1];
    if (!rowEl){
      blokEl.classList.add('mx-blok--ukryty');
      return;
    }

    let minK = Infinity, maxK = -Infinity;
    zmienione.forEach(([_, k]) => { minK = Math.min(minK, k); maxK = Math.max(maxK, k); });

    const leftCell  = tabela.rows[rowIdx-1]?.cells[minK-1];
    const rightCell = tabela.rows[rowIdx-1]?.cells[maxK-1];
    if (!leftCell || !rightCell){
      blokEl.classList.add('mx-blok--ukryty');
      return;
    }

    const wrapBox  = tabela.parentElement.getBoundingClientRect();
    const rowBox   = rowEl.getBoundingClientRect();
    const leftBox  = leftCell.getBoundingClientRect();
    const rightBox = rightCell.getBoundingClientRect();

    const PAD_X = 4, PAD_Y = 0;

    const left = leftBox.left - wrapBox.left - PAD_X;
    const top  = rowBox.top   - wrapBox.top  - PAD_Y;
    const width  = (rightBox.right - leftBox.left) + 2*PAD_X;
    const height = rowBox.height + 2*PAD_Y;

    blokEl.style.left   = `${left}px`;
    blokEl.style.top    = `${top}px`;
    blokEl.style.width  = `${width}px`;
    blokEl.style.height = `${height}px`;
    blokEl.classList.remove('mx-blok--ukryty');
  }

  function formatujOpisDlaWyswietlenia(tekst){
    if (!tekst) return '';
    let wynik = String(tekst);
    wynik = wynik.replace(/([KW])([₀₁₂₃₄₅₆₇₈₉]+)/g, '<strong>$1$2</strong>');
    return wynik;
  }

  function narysujKrok(krok, kontenerMacierzy, opisEl, znakEl, blokEl){
    kontenerMacierzy.innerHTML = '';
    const tabela = zbudujTabele(krok.macierz);

    kontenerMacierzy.appendChild(tabela);

    if (blokEl && blokEl.parentElement !== kontenerMacierzy){
      kontenerMacierzy.insertBefore(blokEl, kontenerMacierzy.firstChild);
    }

    if (krok.pivot){
      const pr = krok.pivot.row, pk = krok.pivot.col;
      const kom = tabela.rows[pr-1]?.cells[pk-1];
      if (kom) kom.classList.add('mx-pivot');
    }
    if ((krok.typ === 'elim' || krok.typ === 'plan') && krok.operacje?.length){
      const op = krok.operacje[0];
      tabela.rows[op.src-1]?.classList.add('mx-wiersz-zrodlo');
      tabela.rows[op.target-1]?.classList.add('mx-wiersz-cel');
      (krok.zmienione||[]).forEach(([w,k])=>{
        const el = tabela.rows[w-1]?.cells[k-1];
        if (el) el.classList.add('mx-komorka-zmieniona');
      });
    }

    opisEl.innerHTML = formatujOpisDlaWyswietlenia(krok.opis || '');

    if ((krok.typ === 'elim' || krok.typ === 'plan') && krok.operacje?.length){
      znakEl.textContent = formatujZnakOperacji(krok);
      znakEl.classList.remove('mx-znak--ukryty');
      requestAnimationFrame(()=>{
        ustawZnakPrzyWierszu(znakEl, tabela, krok.operacje[0].target);
        pokazBlokZmiany(blokEl, tabela, krok.zmienione);
      });
    } else {
      znakEl.classList.add('mx-znak--ukryty');
      znakEl.textContent = '';
      if (blokEl) blokEl.classList.add('mx-blok--ukryty');
    }
  }

  function ustawZnakPrzyWierszu(znakEl, tabela, targetRowIndex){
    if (!znakEl) return;

    if (!tabela || targetRowIndex == null){
      znakEl.classList.add('mx-znak--ukryty');
      return;
    }

    const oknoMac = znakEl.closest('.okno-macierz');
    if (!oknoMac){
      znakEl.classList.add('mx-znak--ukryty');
      return;
    }

    const boxOkno = oknoMac.getBoundingClientRect();
    const boxTab  = tabela.getBoundingClientRect();
    const rowEl   = tabela.rows[targetRowIndex-1];
    if (!rowEl){
      znakEl.classList.add('mx-znak--ukryty');
      return;
    }
    const boxRow  = rowEl.getBoundingClientRect();

    const prevVis = znakEl.style.visibility;
    znakEl.style.visibility = 'hidden';
    znakEl.classList.remove('mx-znak--ukryty');
    const w = znakEl.offsetWidth || 0;
    znakEl.style.visibility = prevVis || 'visible';

    const left = (boxTab.left - boxOkno.left) - w - ZNAK_GAP;
    const top  = (boxRow.top + boxRow.height / 2) - boxOkno.top;

    znakEl.style.left = `${left}px`;
    znakEl.style.top  = `${top}px`;
    znakEl.classList.remove('mx-znak--ukryty');
  }

  function uruchomPrezentacjeKrokow(kroki, trescOkna){
    trescOkna.innerHTML = `
      <div class="mx-belka">
        <div class="mx-licznik">Krok <span class="mx-licznik-biezacy">1</span>/<span class="mx-licznik-max">${kroki.length}</span></div>
        <div class="mx-sterowanie">
          <button type="button" class="mx-przycisk" data-akcja="poprzedni">Poprzedni</button>
          <button type="button" class="mx-przycisk" data-akcja="nastepny">Następny</button>
          <button type="button" class="mx-przycisk mx-przycisk--reset" data-akcja="zresetuj">Zresetuj</button>
        </div>
      </div>
      <div class="okno-macierz">
        <div class="mx-znak mx-znak--ukryty" aria-hidden="true"></div>
        <div class="macierz-wrap">
          <div class="mx-blok mx-blok--ukryty" aria-hidden="true"></div>
        </div>
      </div>
      <div class="mx-opis" aria-live="polite"></div>
      <div class="mx-legenda mx-legenda--hidden">
        <div><strong>K</strong> — kolumna</div>
        <div><strong>W</strong> — wiersz</div>
      </div>
    `;

    const liczBiez = trescOkna.querySelector('.mx-licznik-biezacy');
    const wrap     = trescOkna.querySelector('.macierz-wrap');
    const kontener = wrap;
    const opis     = trescOkna.querySelector('.mx-opis');
    const znak     = trescOkna.querySelector('.mx-znak');
    const blok     = trescOkna.querySelector('.mx-blok');
    const legenda  = trescOkna.querySelector('.mx-legenda');

    const btnPrev = trescOkna.querySelector('[data-akcja="poprzedni"]');
    const btnNext = trescOkna.querySelector('[data-akcja="nastepny"]');
    const btnReset= trescOkna.querySelector('[data-akcja="zresetuj"]');

    let i = 0;

    function odswiez(){
      liczBiez.textContent = String(i+1);
      narysujKrok(kroki[i], kontener, opis, znak, blok);
      btnPrev.disabled = (i===0);
      btnNext.disabled = (i>=kroki.length-1);

      if (i === 0) legenda.classList.remove('mx-legenda--hidden');
      else legenda.classList.add('mx-legenda--hidden');
    }

    btnPrev.addEventListener('click', ()=>{ if(i>0){ i--; odswiez(); } });
    btnNext.addEventListener('click', ()=>{ if(i<kroki.length-1){ i++; odswiez(); } });
    btnReset.addEventListener('click', ()=>{ i=0; odswiez(); });

    odswiez();
  }

  document.addEventListener('pointerdown', (e)=>{
    if (e.button !== 0) return;
    const el = e.target.closest('[data-rozwiaz], .rozwiaz, .btn-rozwiaz, button, a');
    if (!el) return;
    const tekst = (el.textContent || '').trim().toLowerCase();
    const uznany = el.matches('[data-rozwiaz], .rozwiaz, .btn-rozwiaz') || tekst.includes('rozwiąż');
    if (!uznany) return;

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    const sekcja = el.closest('[data-przyklad], .przyklad, section, .kafelek, .card');
    if (!sekcja) return;

    przewinNaGoreBezPauzy().then(()=> otworzOknoDlaSekcji(sekcja));
  }, { capture: true });

  document.addEventListener('keydown', (e)=>{
    if (e.code === 'Space' || e.key === ' ') {
      const okno = document.querySelector('.okno-rozwiazania.okno-visible');
      if (okno && okno.contains(document.activeElement)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

})();

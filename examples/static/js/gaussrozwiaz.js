(function(){
  if (!window._mathjaxLadowany) {
    window._mathjaxLadowany = true;
    window.MathJax = {
      tex: { inlineMath: [['\\(','\\)'], ['$', '$']], processEscapes: true },
      svg: { fontCache: 'global' },
      options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] }
    };
    const skrypt = document.createElement('script');
    skrypt.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    skrypt.async = true;
    document.head.appendChild(skrypt);
  }

  window.latexujTekstKroku = function(tekst){
    if (!tekst || typeof tekst !== 'string') return tekst;
    let t = tekst;
    t = t.replace(/\s*←\s*/g, ' \\leftarrow ');
    t = t.replace(/\s*·\s*/g, ' \\cdot ');
    t = t.replace(/\b([WK])(\d+)\b/g, (_, lit, nr) => `${lit}_{${nr}}`);
    t = t.replace(/\bx(\d+)\b/g, (_, nr) => `x_{${nr}}`);
    t = t.replace(/(-?\d+|\([^)]+\))\s*\/\s*\(([^)]+)\)/g, (m, a, b) => `\\frac{${a.replace(/[()]/g,'')}}{${b}}`);
    t = t.replace(/\b(-?\d+)\s*\/\s*(-?\d+)\b/g, (m,a,b) => `\\frac{${a}}{${b}}`);
    t = t.replace(/\|/g, '\\,\\big|\\,');
    return `\\(${t}\\)`;
  };

  window.renderujLatex = function(kontener){
    if (window.MathJax && window.MathJax.typesetPromise) {
      return MathJax.typesetPromise([kontener]).catch(()=>{});
    }
    return new Promise(resolve=>{
      let proby = 0;
      const timer = setInterval(()=>{
        proby++;
        if (window.MathJax && window.MathJax.typesetPromise) {
          clearInterval(timer);
          MathJax.typesetPromise([kontener]).finally(resolve);
        } else if (proby>20) {
          clearInterval(timer); resolve();
        }
      }, 150);
    });
  };
})();

(function(){
  'use strict';

  const ZNAK_GAP = 24;

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

  function znormalizujKrok(krok){
    if (!krok || typeof krok !== 'object') return krok;
    const mapaTypow = {
      'eliminacja': 'elim', 'plan': 'plan',
      'zamiana': 'zamiana', 'skaluj': 'skaluj',
      'start': 'start', 'pivot': 'pivot',
      'trojkatna': 'trojkatna', 'wstecz': 'wstecz',
      'wynik': 'wynik'
    };
    if (krok.typ && mapaTypow[krok.typ]) krok.typ = mapaTypow[krok.typ];
    if (Array.isArray(krok.pivot) && krok.pivot.length >= 2){
      krok.pivot = { row: Number(krok.pivot[0]) + 1, col: Number(krok.pivot[1]) + 1 };
    }
    return krok;
  }

  function znajdzKontenerOkna(){
    return document.querySelector('#prawa-kolumna')
      || document.querySelector('.prawy-obszar')
      || document.querySelector('.prawy-panel')
      || document.querySelector('.sekcja-przyklady')
      || document.body;
  }
  const oknoWidoczne = (okno) => okno.classList.contains('okno-visible');
  const czekajAnimacji = (el) => new Promise(r => el.addEventListener('animationend', r, { once:true }));

  async function animujWejscie(okno){
    okno.classList.remove('okno-anim-out','okno-hidden');
    okno.classList.add('okno-visible','okno-anim-in');
    await czekajAnimacji(okno);
    okno.classList.remove('okno-anim-in');
  }
  async function animujWyjscie(okno){
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
      nr = m1 ? m1[1] : null;
    }
    if (!nr){
      const m = /Przykład\s*(\d+)/i.exec(sekcja.textContent || '');
      nr = m ? m[1] : null;
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
    if (getComputedStyle(kontener).position === 'static'){ kontener.style.position = 'relative'; }
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
      okno.querySelector('.okno-zamknij').addEventListener('click', ()=> animujWyjscie(okno));
    } else if (okno.parentElement !== kontener){
      kontener.appendChild(okno);
    }
    return okno;
  }

  async function otworzOknoDlaSekcji(sekcjaPrzykladu){
    const okno = zapewnijOkno();
    if (oknoWidoczne(okno)){ await animujWyjscie(okno); }

    const tytul = okno.querySelector('.okno-tytul');
    const tresc = okno.querySelector('.okno-tresc');
    const nr = znajdzNumerPrzykladu(sekcjaPrzykladu);
    try{ window._nrPrzykladuBiezacy = nr ? parseInt(nr,10) : null; }catch(e){}

    tytul.innerHTML = nr ? `Rozwiązanie przykładu <span class="okno-tytul-nr">#${nr}</span>` : 'Rozwiązanie przykładu';

    tresc.innerHTML = '<div class="mx-loading">Ładowanie kroków…</div>';
    await animujWejscie(okno);

    try{
      const kroki = await pobierzKrokiDlaSekcji(sekcjaPrzykladu);
      tresc.innerHTML = '';
      if (!Array.isArray(kroki) || kroki.length === 0){
        tresc.innerHTML = '<p>Brak kroków do wyświetlenia.</p>';
      } else {
        uruchomPrezentacjeKrokow(kroki, tresc);
      }
    } catch (err){
      tresc.innerHTML = `<p>Wystąpił błąd:</p><pre style="white-space:pre-wrap">${err && err.message ? err.message : 'Nie udało się pobrać kroków.'}</pre>`;
    }
  }

  function odczytajKrokiZDataAttr(sekcja){
    try{
      const surowe = sekcja?.dataset?.kroki;
      if (surowe){
        const dane = JSON.parse(surowe);
        if (Array.isArray(dane) && dane.length > 0) return dane;
      }
    }catch{}
    return null;
  }
  function odczytajKrokiZeSkryptu(sekcja){
    const skrypt = sekcja.querySelector('script[type="application/json"][data-rozwiazanie="kroki"], script[type="application/json"].kroki');
    if (!skrypt) return null;
    try{
      const dane = JSON.parse(skrypt.textContent || '');
      return (Array.isArray(dane) && dane.length > 0) ? dane : null;
    }catch{}
    return null;
  }
  function odczytajMacierzRozszerzona(sekcja){
    const ds = sekcja?.dataset || {};
    if (ds.rozszerzona){
      try{
        const MR = JSON.parse(ds.rozszerzona);
        if (Array.isArray(MR) && MR.length && Array.isArray(MR[0])) return MR;
      }catch{}
    }
    if (ds.a && ds.b){
      try{
        const A = JSON.parse(ds.a);
        const b = JSON.parse(ds.b);
        if (Array.isArray(A) && Array.isArray(b)){
          return A.map((wiersz, i) => [...wiersz, b[i]]);
        }
      }catch{}
    }
    const texNode = sekcja.querySelector('.tex-src, [data-tex], script[type="math/tex"]') ||
            sekcja.queryselector?.('.katex, .equation, .latex, figure, pre, code');
    const raw = (texNode?.textContent || '').trim();
    if (!raw) return null;

    let text = raw.replace(/\u2212/g, '-')
      .replace(/\\left\{|\\right\}/g, '')
      .replace(/\\begin\{cases\}|\\end\{cases\}/g, '')
      .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
      .replace(/\\;|\\,|\\:|\\!/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\\\[|\\\]/g, '')
      .replace(/\\\(|\\\)/g, '')
      .trim();
    text = text.replace(/\\\\/g, '\n');
    const linie = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!linie.length) return null;

    let n = 0;
    for (const ln of linie){
      for (const m of ln.matchAll(/x_?(\d+)/g)) n = Math.max(n, parseInt(m[1], 10));
    }
    if (n === 0) return null;

    const MR = [];
    for (const ln of linie){
      const eq = ln.replace(/\s+/g, '');
      const [lhs, rhs] = eq.split('=');
      if (rhs === undefined) return null;
      const rhsNorm = rhs.replace(',', '.');
      const w = new Array(n + 1).fill('0');
      const terms = lhs.match(/[+\-]?[^+\-]+/g) || [];
      for (const t of terms){
        const m = t.match(/^([+\-]?\d*\/?\\d*)?x_?(\d+)$/i);
        if (!m) continue;
        let a = m[1]; const idx = parseInt(m[2], 10) - 1;
        if (a === '' || a === '+' || a == null) a = '1';
        if (a === '-') a = '-1';
        a = a.replace(',', '.');
        w[idx] = a;
      }
      w[n] = rhsNorm;
      MR.push(w);
    }
    return MR;
  }

  function zgadnijSciezkiAPI(sekcja){
    const zSekcji = sekcja?.dataset?.apiKroki;
    const zMeta = document.querySelector('meta[name="gauss-api"]')?.content;
    const kandydaci = [];
    if (zSekcji) kandydaci.push(zSekcji);
    if (zMeta) kandydaci.push(zMeta);
    kandydaci.push('/przyklady/api/gauss/kroki', '/api/gauss/kroki');
    return [...new Set(kandydaci)];
  }
  async function pobierzKrokiZAPI(sekcja){
    const MR = odczytajMacierzRozszerzona(sekcja);
    if (!MR) throw new Error('Nie udało się odczytać macierzy rozszerzonej [A|b].');
    const urlKandydaci = zgadnijSciezkiAPI(sekcja);
    let ostatniBlad = null;
    for (const url of urlKandydaci){
      try{
        const res = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ macierz_rozszerzona: MR })
        });
        if (!res.ok){ throw new Error(await res.text() || `HTTP ${res.status}`); }
        const dane = await res.json();
        if (Array.isArray(dane)) return dane;
        if (Array.isArray(dane?.kroki)) return dane.kroki;
        throw new Error('Niepoprawny format odpowiedzi API.');
      }catch(err){ ostatniBlad = err; }
    }
    throw (ostatniBlad || new Error('Nie udało się pobrać kroków z API.'));
  }
  async function pobierzKrokiDlaSekcji(sekcja){
    return odczytajKrokiZDataAttr(sekcja)
      || odczytajKrokiZeSkryptu(sekcja)
      || await pobierzKrokiZAPI(sekcja);
  }

  const klonujMacierz = (M) => Array.isArray(M) ? M.map(r=> r.slice()) : [];
  function porownajMacierzePoprawki(prev, curr){
    const zm = [];
    if (!Array.isArray(prev) || !Array.isArray(curr)) return zm;
    const m = Math.min(prev.length, curr.length);
    for (let i=0;i<m;i++){
      const n = Math.min(prev[i].length, curr[i].length);
      for (let j=0;j<n;j++){
        if (String(prev[i][j]) != String(curr[i][j])) zm.push([i+1, j+1]);
      }
    }
    return zm;
  }

  function zbudujTabele(macierz){
    const tabela = document.createElement('table');
    tabela.className = 'macierz macierz--okno macierz--aug';
    const tbody = document.createElement('tbody');
    const lastCol = (Array.isArray(macierz) && macierz[0]) ? macierz[0].length - 1 : -1;
    macierz.forEach((w)=>{
      const tr = document.createElement('tr');
      w.forEach((v,ki)=>{
        const td = document.createElement('td');
        td.textContent = (v != null ? String(v) : '');
        if (ki === lastCol) td.classList.add('mx-b');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tabela.appendChild(tbody);
    return tabela;
  }

  const TYPY_ZMIANY_WIERSZA = new Set(['row_add','eliminacja','elim','add','dodaj','zero','zeruj','row_op']);
  function wyciagnijWierszeCele(krok, wPivot){
    const cele = new Set();
    const ops = krok.operacje || krok.op || krok.operacja || [];
    if (Array.isArray(ops)){
      for (const op of ops){
        const typ = (op.typ || op.type || '').toString().toLowerCase();
        if (!TYPY_ZMIANY_WIERSZA.has(typ)) continue;
        const kandydaty = [op.cel, op.target, op.na, op.row, op.wiersz_docelowy, op.wiersz];
        for (const v of kandydaty){
          let n = null;
          if (typeof v === 'number' && !Number.isNaN(v)) n = v;
          if (typeof v === 'string' && /^\d+$/.test(v)) n = parseInt(v,10) - 1;
          if (n != null){
            const oneBased = (n >= 0 && n <= 100) ? (n+1) : n;
            if (oneBased !== wPivot) cele.add(oneBased);
          }
        }
      }
    }
    const txt = (krok.opis || krok.komentarz || '').toLowerCase();
    if (!/normalizujemy\s+wiersz\s+pivota/.test(txt)){
      const wzorce = [
        /zerujemy[^w]*w\s*w\s*([0-9]+)/g,
        /do\s*w\s*([0-9]+)\s*dodajemy/ig,
        /w\s*([0-9]+)\s*←\s*w\s*\1\s*[+\-]/ig
      ];
      for (const re of wzorce){
        let m; while ((m = re.exec(txt))) {
          const n = parseInt(m[1],10);
          if (!Number.isNaN(n) && n !== wPivot) cele.add(n);
        }
      }
    }
    return [...cele];
  }

  function narysujPasyWierszy(wrap, tabela, wPivot, wCele){
    let overlay = wrap.querySelector('.mx-pasy-wierszy');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.className = 'mx-pasy-wierszy';
      wrap.prepend(overlay);
    } else overlay.innerHTML = '';

    const rows = tabela.tBodies[0]?.rows || [];
    const rectWrap = wrap.getBoundingClientRect();

    function zakres(idx){
      const r = rows[idx-1];
      if (!r) return null;
      const cells = r.cells; if (!cells.length) return null;
      const rectL = cells[0].getBoundingClientRect();
      const rectR = cells[cells.length-1].getBoundingClientRect();
      const padX = 10, padY = 4;
      const left = rectL.left - rectWrap.left - padX;
      const right= rectR.right - rectWrap.left + padX;
      const top  = rectL.top - rectWrap.top - padY;
      const bottom = rectL.bottom - rectWrap.top + padY;
      return { left, top, width: right-left, height: bottom-top };
    }

    if (typeof wPivot === 'number'){
      const z = zakres(wPivot);
      if (z){
        const pas = document.createElement('div');
        pas.className = 'mx-pas mx-pas--pivot';
        Object.assign(pas.style, { left: z.left+'px', top: z.top+'px', width: z.width+'px', height: z.height+'px' });
        overlay.appendChild(pas);
      }
    }
    (wCele||[]).forEach(nr=>{
      if (nr === wPivot) return;
      const z = zakres(nr);
      if (z){
        const pas = document.createElement('div');
        pas.className = 'mx-pas mx-pas--cel';
        Object.assign(pas.style, { left: z.left+'px', top: z.top+'px', width: z.width+'px', height: z.height+'px' });
        overlay.appendChild(pas);
      }
    });
  }

  function _fmtLiczbaGauss(x){
    const n = Number(x);
    if (Number.isNaN(n)) return String(x);
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(+n.toFixed(6)).replace(/0+$/,'').replace(/\.$/,'');
  }

  function _parseNumberLike(c){
    if (typeof c === 'number' && !Number.isNaN(c)) return c;
    if (c == null) return null;
    const s = String(c).trim().replace(',', '.').replace(/^\((.*)\)$/, '$1');
    const m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)+?$/);
    if (m){
      const a = parseFloat(m[1]);
      const b = parseFloat(m[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b) && Math.abs(b) > 1e-12) return a / b;
      return null;
    }
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }
  function _formatCzynnikDoTekstu(c){
    if (c == null) return '';
    if (typeof c === 'number' && !Number.isNaN(c)) return _fmtLiczbaGauss(c);
    return String(c).trim().replace(',', '.').replace(/^\((.*)\)$/, '$1');
  }
  function _bezZnakuMinus(s){
    return String(s).replace(/^\s*[-−]/, '').trim();
  }

  function _pickInt1Based(...vals){
    for (const v of vals){
      if (v == null) continue;
      if (typeof v === 'number' && !Number.isNaN(v)){ return v >= 1 ? v : (v + 1); }
      if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v,10);
    }
    return null;
  }

  function zbudujZapisOperacji(krok){
    const ops = krok?.operacje || krok?.op || krok?.operacja || [];
    if (!Array.isArray(ops) || !ops.length) return null;
    let op0 = null;
    for (const o of ops){
      const typ = (o.op || o.typ || o.type || '').toString().toLowerCase();
      if (!typ || /row_add|add|dodaj|elim/.test(typ)) { op0 = {typ:'add', ...o}; break; }
      if (/row_scale|scale|skala|skaluj|skalowanie|norm|normal/.test(typ)) { op0 = {typ:'scale', ...o}; break; }
    }
    if (!op0) return null;
    const kol = (krok.pivot && (krok.pivot.col || krok.pivot.kolumna)) || (Array.isArray(krok.pivot) ? krok.pivot[1]+1 : null);
    const prefix = kol ? `K${kol}: ` : '';
    if (op0.typ === 'scale'){
      const W  = _pickInt1Based(op0.row, op0.na, op0.docelowy, op0.cel, op0.target, op0.wiersz_docelowy, op0.wiersz);
      let c  = op0.czynnik; if (c == null) c = op0.factor ?? op0.wspolczynnik ?? op0.krotność ?? op0.k;
      if (!W || c == null) return null;
      const wsp = _formatCzynnikDoTekstu(c);
      return { tekst: `${prefix}W${W} ← W${W} · ${wsp}`, wierszDocelowy1: W };
    }
    const Wt = _pickInt1Based(op0.docelowy, op0.cel, op0.target, op0.na, op0.row, op0.wiersz_docelowy, op0.wiersz);
    const Ws = _pickInt1Based(op0.zrodlo, op0.zrodło, op0.source, op0.zrodlo_wiersz, op0.from);
    let c  = op0.czynnik; if (c == null) c = op0.factor ?? op0.wspolczynnik;
    if (!Wt || !Ws || c == null) return null;
    const num = _parseNumberLike(c);
    const znak = (num != null) ? (num < 0 ? '−' : '+') : (String(c).trim().startsWith('-') ? '−' : '+');
    const wspStr = _bezZnakuMinus(_formatCzynnikDoTekstu(c));
    const isOne = (num != null) ? (Math.abs(Math.abs(num) - 1) < 1e-9) : (/^\s*1(?:\.0+)?\s*$/.test(wspStr));
    const wsp = isOne ? '' : _formatCzynnikDoTekstu(wspStr) + '·';
    return { tekst: `${prefix}W${Wt} ← W${Wt}${znak}${wsp}W${Ws}`, wierszDocelowy1: Wt };
  }

  function _normalizujFormule(s){
    if(!s) return '';
    return String(s)
      .toLowerCase()
      .replace(/^[\s]*k\d+\s*:/,'')
      .replace(/[().]/g,'')
      .replace(/[−–—]/g,'-')
      .replace(/·/g,'*')
      .replace(/←/g,'<-')
      .replace(/\s+/g,'');
  }

  function _czyKrokDuplikat(k){
    if (!k) return false;
    const opis = (k.opis || k.komentarz || '');
    if (!opis) return false;
    const tylkoFormulka = /^[\sKk\d:Ww0-9xX←+\-·().*]+$/.test(opis);
    if (!tylkoFormulka) return false;
    const dymek = (k._tekstDymku || '');
    if (!dymek) return false;
    return _normalizujFormule(opis) === _normalizujFormule(dymek);
  }

  function ustawDymekPrzyWierszuGauss(znakEl, tabela, wiersz1){
    if (!znakEl) return;

    if (!tabela || wiersz1 == null){
      znakEl.classList.remove('aktywny');
      return;
    }

    const oknoMac = znakEl.closest('.okno-macierz');
    if (!oknoMac){
      znakEl.classList.remove('aktywny');
      return;
    }

    const boxOkno = oknoMac.getBoundingClientRect();
    const boxTab  = tabela.getBoundingClientRect();
    const rowEl   = tabela.tBodies[0]?.rows[wiersz1-1];
    if (!rowEl){
      znakEl.classList.remove('aktywny');
      return;
    }
    const boxRow  = rowEl.getBoundingClientRect();
    const prevVis = znakEl.style.visibility;
    const prevDisp = znakEl.style.display;
    znakEl.style.visibility = 'hidden';
    znakEl.style.display = 'block';
    const szer = znakEl.offsetWidth || 0;
    znakEl.style.visibility = prevVis || 'visible';
    if (prevDisp) znakEl.style.display = prevDisp;

    const left = (boxTab.left - boxOkno.left) - szer - ZNAK_GAP;
    const top  = (boxRow.top + boxRow.height / 2) - boxOkno.top;

    znakEl.style.left = left + 'px';
    znakEl.style.top  = top + 'px';
    znakEl.classList.add('aktywny');
  }

  function pokazBlokZmianyGauss(blokEl, tabela, wiersz1, jMin1, jMax1){
    if (!blokEl || !tabela || !wiersz1 || jMin1 == null || jMax1 == null) return;
    const tr = tabela.tBodies[0]?.rows[wiersz1-1];
    if (!tr) return;
    const wrap = tabela.parentElement;
    const tdL = tr.cells[jMin1-1];
    const tdR = tr.cells[jMax1-1];
    if (!tdL || !tdR) return;
    const r1 = tdL.getBoundingClientRect(), r2 = tdR.getBoundingClientRect(), rw = wrap.getBoundingClientRect();
    const x = r1.left - rw.left; const y = r1.top - rw.top + 2;
    const w = (r2.right - rw.left) - (r1.left - rw.left); const h = Math.max(r1.height, r2.height) - 4;
    Object.assign(blokEl.style, { left: x+'px', top: y+'px', width: w+'px', height: h+'px' });
    blokEl.classList.add('aktywny');
  }

  function ukryjDodatkiGauss(znakEl, blokEl){
    if (znakEl) znakEl.classList.remove('aktywny');
    if (blokEl) blokEl.classList.remove('aktywny');
  }

  function _cloneMatrix(M){ return Array.isArray(M) ? M.map(r=> r.slice()) : []; }

  function _czyMacierzeRozne(A, B){
    if (!Array.isArray(A) || !Array.isArray(B)) return false;
    if (A.length !== B.length) return true;
    for (let i=0;i<A.length;i++){
      if (!Array.isArray(A[i]) || !Array.isArray(B[i]) || A[i].length !== B[i].length) return true;
      for (let j=0;j<A[i].length;j++){
        if (String(A[i][j]) !== String(B[i][j])) return true;
      }
    }
    return false;
  }

  function _czyOperacjaWierszowa(k){
    const t = (k.typ||'').toString().toLowerCase();
    if (t === 'elim' || t === 'plan' || t === 'skaluj' || t === 'zamiana' || t === 'pivot') return true;
    const txt = (k.opis || k.komentarz || '').toLowerCase();
    if (/zerujem|dodajem|odejmujem|normalizujem|skaluj/.test(txt)) return true;
    const ops = k.operacje || k.op || k.operacja || [];
    return Array.isArray(ops) && ops.length > 0;
  }

  function _wyciagnijSkalowanieZKroku(k, prev){
    const pivotRow1 = (k.pivot && (k.pivot.row || (Array.isArray(k.pivot) ? k.pivot[0]+1 : null))) || null;
    const pivotCol1 = (k.pivot && (k.pivot.col || (Array.isArray(k.pivot) ? k.pivot[1]+1 : null))) || null;
    if (pivotRow1 && pivotCol1 && prev && prev[pivotRow1-1]){
      const val = Number(prev[pivotRow1-1][pivotCol1-1]);
      if (!Number.isNaN(val) && Math.abs(val) > 1e-12 && !(Math.abs(val - 1) < 1e-9)){
        const factor = 1/val;
        return { typ:'row_scale', wiersz1: pivotRow1, czynnik: factor, kolumna1: pivotCol1 };
      }
    }
    const m = (k.opis||k.komentarz||'').match(/w\s*([0-9]+)\s*←\s*w\s*\1\s*·\s*([^\s.]+)/i);
    if (m){
      const w = parseInt(m[1],10);
      let f = m[2].replace(',', '.').replace(/^\(|\)$/g,'');
      return { typ:'row_scale', wiersz1: w, czynnik: f };
    }
    const ops = k.operacje || [];
    for (const o of ops){
      const typ = (o.op || o.typ || '').toString().toLowerCase();
      if (/row_scale|scale|skaluj/.test(typ)){
        const w = _pickInt1Based(o.row, o.wiersz, o.docelowy, o.cel);
        const f = o.factor ?? o.czynnik ?? o.wspolczynnik;
        if (w && f != null) return { typ:'row_scale', wiersz1: w, czynnik: f };
      }
    }
    return null;
  }

  function rozbijNaPlanyJesliBrakuje(kroki){
    const wynik = [];
    for (let i=0; i<kroki.length; i++){
      const k = kroki[i];
      const prev = wynik.length ? wynik[wynik.length-1] : null;
      const prevMatrix = prev ? prev.macierz : null;

      if (k.typ === 'plan') { wynik.push(k); continue; }
      if (prevMatrix && _czyOperacjaWierszowa(k) && _czyMacierzeRozne(prevMatrix, k.macierz)){
        let planOp = null;
        const ops = k.operacje || k.op || k.operacja || [];
        if (Array.isArray(ops) && ops.length){
          const o = ops[0];
          const typ = (o.op || o.typ || o.type || '').toString().toLowerCase();
          if (/row_add|add|dodaj|elim/.test(typ)){
            planOp = { typ:'row_add', docelowy: _pickInt1Based(o.docelowy,o.cel,o.target,o.na,o.row,o.wiersz_docelowy,o.wiersz), zrodlo: _pickInt1Based(o.zrodlo,o.zrodło,o.source,o.from), czynnik: o.czynnik ?? o.factor ?? o.wspolczynnik };
          }
        }
        if (!planOp){
          const skal = _wyciagnijSkalowanieZKroku(k, prevMatrix);
          if (skal){
            planOp = { typ:'row_scale', wiersz: skal.wiersz1, czynnik: skal.czynnik, kolumna1: skal.kolumna1 || (k.pivot && (k.pivot.col || k.pivot.kolumna)) };
          }
        }

        if (planOp){
          const plan = {
            typ: 'plan',
            opis: k.opis || k.komentarz || '',
            pivot: k.pivot,
            macierz: _cloneMatrix(prevMatrix),
            operacje: [ (planOp.typ==='row_add') ?
              { op:'row_add', docelowy: planOp.docelowy-1, zrodlo: planOp.zrodlo-1, czynnik: planOp.czynnik } :
              { op:'row_scale', row: (planOp.wiersz-1), czynnik: planOp.czynnik }
            ],
            syntetyczny: true
          };
          wynik.push(plan);
        }
      }
      wynik.push(k);
    }
    return wynik;
  }

  function czyRownoOpis(a, b){
    const ta = (a?.opis || a?.komentarz || '').trim();
    const tb = (b?.opis || b?.komentarz || '').trim();
    return ta === tb && ta !== '';
  }
  function czyRownePivoty(a, b){
    const pa = a?.pivot, pb = b?.pivot;
    if (!pa && !pb) return true;
    const ra = Array.isArray(pa) ? pa[0] : pa?.row;
    const ca = Array.isArray(pa) ? pa[1] : pa?.col;
    const rb = Array.isArray(pb) ? pb[0] : pb?.row;
    const cb = Array.isArray(pb) ? pb[1] : pb?.col;
    return String(ra) === String(rb) && String(ca) === String(cb);
  }
  function czyTrojkatna(macierz){
    if (!Array.isArray(macierz) || !macierz.length) return false;
    const m = macierz.length, n = macierz[0].length - 1;
    for (let i=1;i<m;i++){
      for (let j=0;j<Math.min(i, n);j++){
        if (Math.abs(Number(macierz[i][j])) > 1e-12) return false;
      }
    }
    return true;
  }
  function scalenPlanZKrokiem(kroki){
    const out = [];
    for (let i=0;i<kroki.length;i++){
      const k = kroki[i];
      const next = kroki[i+1];
      if (k?.typ === 'plan' && next && _czyMacierzeRozne(k.macierz, next.macierz)){
        out.push({
          typ: next.typ === 'plan' ? 'elim' : next.typ || 'elim',
          opis: k.opis || next.opis || next.komentarz || k.komentarz || '',
          pivot: next.pivot || k.pivot || null,
          macierz: _cloneMatrix(next.macierz),
          operacje: next.operacje || k.operacje || [],
          zmienione: next.zmienione || null,
          scalone: true
        });
        i++;
        continue;
      }
      out.push(k);
    }
    return out;
  }
  function odfiltrujDuplikatyKrokow(kroki){
    const out = [];
    for (let i=0;i<kroki.length;i++){
      const k = kroki[i];
      const prev = out[out.length-1];
      const typ = (k?.typ||'').toString();
      const milestone = (typ === 'trojkatna' || typ === 'wstecz' || typ === 'wynik' || k?.scalone);
      if (!prev){ out.push(k); continue; }
      const sameM = !_czyMacierzeRozne(prev.macierz, k.macierz);
      const sameOpis = czyRownoOpis(prev, k) || (!k.opis && !k.komentarz);
      const samePivot = czyRownePivoty(prev, k);
      if (!milestone && sameM && sameOpis && samePivot){
        continue;
      }
      out.push(k);
    }
    return out;
  }
  function dopiszTrojkatnaJesliBrak(kroki){
    const ma = kroki.some(k => String(k.typ) === 'trojkatna');
    if (ma) return kroki;
    for (let i=0;i<kroki.length;i++){
      const k = kroki[i];
      if (czyTrojkatna(k.macierz)){
        const wstaw = {
          typ: 'trojkatna',
          opis: 'Otrzymaliśmy postać trójkątną (REF).',
          macierz: _cloneMatrix(k.macierz),
          pivot: k.pivot || null
        };
        kroki.splice(i+1, 0, wstaw);
        break;
      }
    }
    return kroki;
  }
  function uruchomPrezentacjeKrokow(kroki, trescOkna){
    kroki = (kroki||[]).map(znormalizujKrok);
    kroki = rozbijNaPlanyJesliBrakuje(kroki);
    kroki = scalenPlanZKrokiem(kroki);
    kroki = odfiltrujDuplikatyKrokow(kroki);
    if (typeof wstawKrokiElementuWiodacegoDoTrojkatnej === 'function') {
      if (typeof wstawKrokiElementuWiodacegoDoTrojkatnej==='function'){ kroki = wstawKrokiElementuWiodacegoDoTrojkatnej(kroki); }
    } else {
      try { if (typeof wstawKrokiElementuWiodacegoDoTrojkatnej==='function'){ kroki = wstawKrokiElementuWiodacegoDoTrojkatnej(kroki); } } catch(e) {}
    }
    kroki = dopiszTrojkatnaJesliBrak(kroki);

    try{
      if (window._nrPrzykladuBiezacy === 2){
        const doUsuniecia = new Set([3,5,7,10,12]);
        kroki = kroki.filter((_, idx) => !doUsuniecia.has(idx+1));
      }
    }catch(e){}

    const idxTroj = kroki.findIndex(k => k.typ === 'trojkatna');

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
        <div class="mx-znak" aria-hidden="true"></div>
        <div class="macierz-wrap">
          <div class="mx-blok" aria-hidden="true"></div>
        </div>
        
      </div>
      <div class="mx-opis" aria-live="polite"></div>
      <div class="mx-legenda mx-legenda--hidden">
        <div><strong>Kᵢ</strong> — kolumna</div>
        <div><strong>Wⱼ</strong> — wiersz</div>
      </div>
    `;

    const liczBiez = trescOkna.querySelector('.mx-licznik-biezacy');
    const kontener = trescOkna.querySelector('.macierz-wrap');
    const opis     = trescOkna.querySelector('.mx-opis');
    const legenda  = trescOkna.querySelector('.mx-legenda');

    const elZnak = trescOkna.querySelector('.mx-znak');
    const elBlok = trescOkna.querySelector('.mx-blok');

    const btnPrev = trescOkna.querySelector('[data-akcja="poprzedni"]');
    const btnNext = trescOkna.querySelector('[data-akcja="nastepny"]');
    const btnReset= trescOkna.querySelector('[data-akcja="zresetuj"]');

    let i = 0;
    let prevMacierz = null;

    function narysujKrok(krok, indeks){
      let _tekstDymkuOperacji = null;

      kontener.innerHTML = '';

      const tabela = zbudujTabele(krok.macierz);
      kontener.appendChild(tabela);
      try{ window._latexujKomorkiTabeli(tabela); }catch(e){}

      const inElimination = (typeof idxTroj === 'number' && idxTroj >= 0)
        ? (indeks < idxTroj && krok.typ !== 'wstecz')
        : (krok.typ !== 'wstecz');

      let wPivot = null, kPivot = null;
      if (krok && krok.pivot){
        wPivot = Array.isArray(krok.pivot) ? (krok.pivot[0]+1) : (krok.pivot.row);
        kPivot = Array.isArray(krok.pivot) ? (krok.pivot[1]+1) : (krok.pivot.col);
      }

      const _infoCele = zbudujZapisOperacji(krok);
      let wCele = [];
      if (inElimination && krok.typ === 'elim' && _infoCele && _infoCele.wierszDocelowy1 && _infoCele.wierszDocelowy1 !== wPivot){
        wCele = [_infoCele.wierszDocelowy1];
      } else if (inElimination) {
        wCele = wyciagnijWierszeCele(krok, wPivot);
      }

      if (inElimination && krok.typ !== 'pivot'){ requestAnimationFrame(()=> narysujPasyWierszy(kontener, tabela, wPivot, wCele)); }

      if (wPivot && kPivot) {
        const kom = tabela.tBodies[0].rows[wPivot-1]?.cells[kPivot-1];
        if (kom) kom.classList.add(inElimination ? 'mx-pivot' : 'mx-pivot--wstecz');
      }

      (krok.zmienione||[]).forEach(([w,k])=>{
        const el = tabela.rows[w-1]?.cells[k-1];
        if (el) el.classList.add('mx-komorka-zmieniona');
      });

      try {
        ukryjDodatkiGauss(elZnak, elBlok);

        if (krok.typ === 'wstecz' && krok.dzialanie) {
          elZnak.textContent = krok.dzialanie;
          try{
            if(window.latexujTekstKroku && window.renderujLatex){
              elZnak.innerHTML = window.latexujTekstKroku(krok.dzialanie);
              window.renderujLatex(elZnak);
            }
          }catch(e){}

          if (wPivot) {
            ustawDymekPrzyWierszuGauss(elZnak, tabela, wPivot);
          }
        }
        else {
          const info = zbudujZapisOperacji(krok);
          _tekstDymkuOperacji = (info && info.tekst) ? info.tekst : _tekstDymkuOperacji;
          if (info) {
            elZnak.textContent = info.tekst;
            try{
              if(window.latexujTekstKroku && window.renderujLatex){
                elZnak.innerHTML = window.latexujTekstKroku(info.tekst);
                window.renderujLatex(elZnak);
              }
            }catch(e){}
            const celW = info.wierszDocelowy1 || (wCele && wCele[0]);
            if (celW) {
              ustawDymekPrzyWierszuGauss(elZnak, tabela, celW);
              if (krok.typ === 'elim') {
                const kolumny = (krok.zmienione || []).filter(([w,_]) => w === celW).map(([_,j]) => j);
                if (kolumny.length) {
                  const jMin = Math.min.apply(null, kolumny);
                  const jMax = Math.max.apply(null, kolumny);
                  pokazBlokZmianyGauss(elBlok, tabela, celW, jMin, jMax);
                }
              }
            }
          }
        }
      } catch(e){}

      let tekstOpisu = (krok.opis || krok.komentarz ||
                          (indeks===0 ? 'Macierz rozszerzona [A|b] na wejściu.' : ''));

      if (_tekstDymkuOperacji && tekstOpisu){
        const tylkoFormulka = /^[\sKk\d:Ww0-9xX←+\-·().*]+$/.test(tekstOpisu);
        if (tylkoFormulka && _normalizujFormule(tekstOpisu) === _normalizujFormule(_tekstDymkuOperacji)){
          tekstOpisu = '';
        }
      }
      if (tekstOpisu && tekstOpisu.trim()){
        ustaw_opis_kroku(tekstOpisu, opis);
      } else {
        opis.innerHTML = '';
      }
    }

    function odswiez(){
      if (i === 0) { prevMacierz = null; }
      let straznik = 0;
      while (i < kroki.length && straznik < 10){
        const kTmp = kroki[i];
        if (!kTmp._tekstDymku){
          const infoTmp = zbudujZapisOperacji(kTmp);
          kTmp._tekstDymku = infoTmp && infoTmp.tekst ? infoTmp.tekst : '';
        }
        if (_czyKrokDuplikat(kTmp)) { i++; straznik++; continue; }
        break;
      }
      liczBiez.textContent = String(i+1);
      const k = kroki[i];
      if (i === 0) { prevMacierz = null; }
      if (!k._tekstDymku){
        const infoNow = zbudujZapisOperacji(k);
        k._tekstDymku = infoNow && infoNow.tekst ? infoNow.tekst : '';
      }
      if (i===0) { k.zmienione = []; } else if ((!k.zmienione || !k.zmienione.length) && prevMacierz){
        k.zmienione = porownajMacierzePoprawki(prevMacierz, k.macierz);
      }
      narysujKrok(k, i);
      prevMacierz = klonujMacierz(k.macierz);
      btnPrev.disabled = (i===0);
      btnNext.disabled = (i>=kroki.length-1);
      if (i === 0) legenda.classList.remove('mx-legenda--hidden');
      else legenda.classList.add('mx-legenda--hidden');
    }

    btnPrev.addEventListener('click', ()=>{ if(i>0){ i--; odswiez(); } });
    btnNext.addEventListener('click', ()=>{ if(i<kroki.length-1){ i++; odswiez(); } });
    btnReset.addEventListener('click', ()=>{ i=0; prevMacierz=null; odswiez(); });

    odswiez();
  }

  document.addEventListener('pointerdown', (e)=>{
    if (e.button !== 0) return;
    const el = e.target.closest('[data-rozwiaz], .rozwiaz, .btn-rozwiaz, button, a');
    if (!el) return;
    const tekst = (el.textContent || '').trim().toLowerCase();
    const uznany = el.matches('[data-rozwiaz], .rozwiaz, .btn-rozwiaz') || tekst.includes('rozwiąż');
    if (!uznany) return;
    e.preventDefault(); e.stopPropagation();
    const sekcja = el.closest('[data-przyklad], .przyklad, section, .kafelek, .card');
    if (!sekcja) return;
    przewinNaGoreBezPauzy().then(()=> otworzOknoDlaSekcji(sekcja));
  }, { capture: true });

})();

function ustaw_opis_kroku(opis, el){
  try{
    const tekst = (typeof opis === 'string') ? opis : (opis?.toString?.() ?? '');

    let wynik = tekst;

    wynik = wynik.replace(/\bx(\d+)\b/g, (_, nr) => `\\(x_{${nr}}\\)`);
    wynik = wynik.replace(/\b([WK])(\d+)\b/g, (_, lit, nr) => `\\(${lit}_{${nr}}\\)`);
    wynik = wynik.replace(/(-?\d+|\([^)]+\))\s*\/\s*\(([^)]+)\)/g, (m, a, b) => {
      return `\\(\\frac{${a.replace(/[()]/g,'')}}{${b}}\\)`;
    });
    wynik = wynik.replace(/\b(-?\d+)\s*\/\s*(-?\d+)\b/g, (m,a,b) => {
      return `\\(\\frac{${a}}{${b}}\\)`;
    });

    el.innerHTML = wynik;

    if (wynik.includes('\\(')) {
      window.renderujLatex(el);
    }
  }catch(e){
    el.textContent = opis;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.mx-opis, .opis-kroku').forEach(el=>{
    const txt = el.textContent && el.textContent.trim();
    if (txt) { try { ustaw_opis_kroku(txt, el); } catch(e){} }
  });
});

window._latexujKomorkiTabeli = function(tabela){
  if (!tabela) return;
  const cele = tabela.querySelectorAll('td, th');
  cele.forEach(td => {
    const s = td.textContent;
    if (!s) return;
    if (s.includes('\\(')) return;

    let t = s;
    t = t.replace(/\u2212/g, '-');
    t = t.replace(/\bx(\d+)\b/g, (m, nr) => `\\(x_{${nr}}\\)`);
    t = t.replace(/([\-−]?)\s*(\-?\d+|[a-zA-Z]\d*|\([^)]+?\))\s*\/\s*\(([^)]+?)\)/g,
      (m, znak, a, b) => {
        const aClean = String(a).replace(/^\(|\)$/g,'');
        const neg = (znak || '').trim() === '-' || String(a).trim().startsWith('-');
        return `${neg?'-':''}\\(\\frac{${aClean.replace(/^-/, '')}}{${b}}\\)`;
      });
    t = t.replace(/([\-−]?)\s*(\-?\d+|[a-zA-Z]\d*)\s*\/\s*(\-?\d+|[a-zA-Z]\d*)\b/g,
      (m, znak, a, b) => {
        const neg = (znak || '').trim() === '-' || String(a).trim().startsWith('-');
        const aClean = String(a).replace(/^-/, '');
        return `${neg?'-':''}\\(\\frac{${aClean}}{${b}}\\)`;
      });

    if (t !== s) td.innerHTML = t;
  });
  try { window.renderujLatex(tabela); } catch(e) {}
};

function wstawKrokiElementuWiodacegoDoTrojkatnej(kroki){
  try{
    if (!Array.isArray(kroki) || kroki.length < 2) return kroki.slice();

    const wynik = [];
    const idxTroj = kroki.findIndex(k => String(k.typ) === 'trojkatna');
    const granica = (idxTroj >= 0 ? idxTroj : kroki.length);
    const n = Array.isArray(kroki[0].macierz) ? kroki[0].macierz.length : 0;

    function skopiujMac(M){
      return Array.isArray(M) ? M.map(r => Array.isArray(r) ? r.slice() : r) : M;
    }
    function pierwszyNiezerowyWiersz(mac, kol){
      if (!Array.isArray(mac)) return 1;
      const n = mac.length;
      for (let r = kol; r <= n; r++){
        const val = (Array.isArray(mac[r-1]) ? mac[r-1][kol-1] : null);
        if (val !== 0 && val !== null && val !== undefined){
          if (typeof val === 'number' && Math.abs(val) < 1e-12) continue;
          return r;
        }
      }
      return kol;
    }
    function opisZawieraKolumne(op, c){
      if (!op || typeof op !== 'string') return false;
      var re = new RegExp('(^|[^A-Za-z0-9_])K\\s*_?'+c+'([^A-Za-z0-9_]|$)');
      return re.test(op);
    }

    const pierwszyIndeksKolumny = new Map();
    for (let i=1; i<granica; i++){
      const k = kroki[i];
      const opis = (typeof k.opis === 'string') ? k.opis : ((k && k.opis && typeof k.opis.toString==='function') ? k.opis.toString() : '');
      for (let c=1; c<=n; c++){
        if (!pierwszyIndeksKolumny.has(c) && opisZawieraKolumne(opis, c)){
          pierwszyIndeksKolumny.set(c, i);
        }
      }
    }

    for (let i=1; i<granica; i++){
      const k = kroki[i];
      if (k && k.pivot){
        const c = Array.isArray(k.pivot) ? (k.pivot[1]+1) : (k.pivot.col || null);
        if (c && !pierwszyIndeksKolumny.has(c)){
          pierwszyIndeksKolumny.set(c, i);
        }
      }
    }

    const juzWstawionoDlaKol = new Set();
    for (let i=0; i<kroki.length; i++){
      const k = kroki[i];

      for (let c=1; c<=n; c++){
        if (i === (pierwszyIndeksKolumny.get(c)||-1) && !juzWstawionoDlaKol.has(c) && i < granica){
          const macPrev = (i>0 ? kroki[i-1].macierz : k.macierz);
          const w = pierwszyNiezerowyWiersz(macPrev, c);

          const pivotKrok = {
            typ: 'pivot',
            pivot: { row: w, col: c },
            macierz: skopiujMac(macPrev),
            opis: `Wybieramy element wiodący K${c}, znajduje się w W${w}.`
          };
          wynik.push(pivotKrok);
          juzWstawionoDlaKol.add(c);
        }
      }

      wynik.push(k);
    }

    return wynik;
  }catch(e){
    return kroki;
  }
}

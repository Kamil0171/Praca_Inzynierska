const MIN_N = 2;
const MAX_N = 9;
const MAX_ABS = 99;
const MAX_DEC_PLACES = 2;
const MAX_FRACTION_ABS = 99;
const MAX_INPUT_LEN = 12;
const ALLOW_CHARS_REGEX = /[^0-9\-\/\.,]/g;

let timerKafelekBlad = null;

function podswietlKafelekWpiszBlad() {
  try {
    const ikonaKroku2 = document.querySelector('.kafelki-instrukcja .kaf-ikona[data-step="2"]');
    if (!ikonaKroku2) return;
    const kafelek = ikonaKroku2.closest('.kafelek');
    if (!kafelek) return;
    kafelek.classList.add('kafelek-blad');
    if (timerKafelekBlad) clearTimeout(timerKafelekBlad);
    timerKafelekBlad = setTimeout(() => {
      kafelek.classList.remove('kafelek-blad');
    }, 1600);
  } catch (_) {}
}

function setFormMessage(text = "", type = "") {
  const box = document.getElementById("komunikat-form");
  if (!box) return;
  box.textContent = text;
  box.classList.remove("blad", "ok");
  if (type) box.classList.add(type);
}

function normalize(text) {
  return String(text ?? "").trim().replace(",", ".");
}

function clampLen(text) {
  return text.length > MAX_INPUT_LEN ? text.slice(0, MAX_INPUT_LEN) : text;
}

function anyFieldFilled() {
  const inputs = document.querySelectorAll("#kontener-siatki .pole");
  return Array.from(inputs).some(inp => inp.value.trim() !== "");
}

function softFilterInput(value) {
  const czyLitery = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(value);

  let v = value.replace(ALLOW_CHARS_REGEX, "");

  const firstSlash = v.indexOf("/");
  if (firstSlash !== -1) {
    v = v.slice(0, firstSlash + 1) + v.slice(firstSlash + 1).replace(/\//g, "");
  }
  v = v[0] === "-" ? "-" + v.slice(1).replace(/-/g, "") : v.replace(/-/g, "");

  const hasDot = v.includes(".");
  const hasComma = v.includes(",");
  if (hasDot && hasComma) {
    const first = Math.min(v.indexOf("."), v.indexOf(","));
    v = v.slice(0, first + 1) + v.slice(first + 1).replace(/[.,]/g, "");
  } else if (hasDot) {
    const first = v.indexOf(".");
    v = v.slice(0, first + 1) + v.slice(first + 1).replace(/\./g, "");
  } else if (hasComma) {
    const first = v.indexOf(",");
    v = v.slice(0, first + 1) + v.slice(first + 1).replace(/,/g, "");
  }

  if (czyLitery) {
    setFormMessage(
      "Litery są niedozwolone.",
      "blad"
    );
    podswietlKafelekWpiszBlad();
  }

  return clampLen(v);
}

function validateToken(raw) {
  const t = normalize(raw);
  if (t === "") return { ok: true, normalized: "0" };

  if (t.includes("/")) {
    if (t.includes("."))
      return { ok: false, msg: "Ułamek bez części dziesiętnej (a/b)." };
    const parts = t.split("/");
    if (parts.length !== 2 || parts[1] === "")
      return { ok: false, msg: "Niepełny zapis ułamka (a/b)." };
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (Number.isNaN(a) || Number.isNaN(b))
      return { ok: false, msg: "Ułamek a/b z liczb całkowitych." };
    if (b === 0) return { ok: false, msg: "Dzielenie przez zero niedozwolone." };
    if (Math.abs(a) > MAX_FRACTION_ABS || Math.abs(b) > MAX_FRACTION_ABS)
      return { ok: false, msg: `|a|,|b| ≤ ${MAX_FRACTION_ABS}.` };
    return { ok: true, normalized: `${a}/${b}` };
  }

  const m = t.match(/^-?\d+(?:\.\d+)?$/);
  if (!m) return { ok: false, msg: "Niepoprawna liczba." };

  const dot = t.indexOf(".");
  if (dot !== -1) {
    const decimals = t.length - dot - 1;
    if (decimals > MAX_DEC_PLACES)
      return { ok: false, msg: `Max ${MAX_DEC_PLACES} miejsca po przecinku.` };
  }

  const val = parseFloat(t);
  if (!Number.isFinite(val)) return { ok: false, msg: "Niepoprawna liczba." };
  if (Math.abs(val) > MAX_ABS) return { ok: false, msg: `|x| ≤ ${MAX_ABS}.` };

  return { ok: true, normalized: t };
}

function markField(wrapper, input, errorMsg) {
  if (!wrapper) return;
  if (errorMsg) {
    input.classList.add("pole-bledne");
  } else {
    input.classList.remove("pole-bledne");
  }
}

function validateAllFields() {
  const inputs = document.querySelectorAll("#kontener-siatki .pole");
  let firstError = null;

  inputs.forEach(inp => {
    const wrap = inp.closest(".pole-wrap");
    const { ok, msg } = validateToken(inp.value);
    markField(wrap, inp, ok ? "" : msg);
    if (!ok && !firstError) firstError = msg;
  });

  const btn = document.getElementById("przycisk-rozwiaz");
  if (firstError) {
    btn.disabled = true;
    setFormMessage(firstError, "blad");
  } else {
    btn.disabled = false;
    setFormMessage("");
  }

  return !firstError;
}

function createCell(name, i, j, typ) {
  const wrap = document.createElement("div");
  wrap.className = "pole-wrap";
  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "pole";
  inp.placeholder = "";
  inp.autocomplete = "off";
  inp.inputMode = "decimal";
  inp.name = name;
  inp.setAttribute("data-typ", typ);
  inp.setAttribute("data-i", String(i));
  if (j != null) inp.setAttribute("data-j", String(j));

  inp.addEventListener("input", (e) => {
    const cur = e.target.value;
    const filtered = softFilterInput(cur);

    if (/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(cur)) {
      e.target.classList.add("pole-bledne", "pole-flash-blad");
      setTimeout(() => e.target.classList.remove("pole-flash-blad"), 900);
    }

    if (filtered !== cur) {
      const pos = e.target.selectionStart;
      e.target.value = filtered;
      if (pos != null) {
        const delta = cur.length - filtered.length;
        const newPos = Math.max(0, pos - Math.max(0, delta));
        e.target.setSelectionRange(newPos, newPos);
      }
    }
  });

  inp.addEventListener("blur", () => {
    const { ok, msg } = validateToken(inp.value);
    markField(wrap, inp, ok ? "" : msg);
    validateAllFields();
  });

  inp.addEventListener("keydown", (e) => {
    const klawisz = e.key;
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Enter"].includes(klawisz)) return;
    if (klawisz === "Enter") e.preventDefault();

    const i = parseInt(inp.getAttribute("data-i"), 10);
    const j = parseInt(inp.getAttribute("data-j"), 10);

    const n = parseInt(document.getElementById("rozmiar-n").value, 10);
    const maxJ = n;

    let nextI = i;
    let nextJ = j;

    const idzWLewo = () => {
      if (nextJ > 0) nextJ -= 1;
      else if (nextI > 0) { nextI -= 1; nextJ = maxJ; }
    };
    const idzWPrawo = () => {
      if (nextJ < maxJ) nextJ += 1;
      else if (nextI < n - 1) { nextI += 1; nextJ = 0; }
    };
    const idzWGore = () => { if (nextI > 0) nextI -= 1; };
    const idzWDol = () => { if (nextI < n - 1) nextI += 1; };

    if (klawisz === "ArrowLeft" || (klawisz === "Enter" && e.shiftKey)) idzWLewo();
    else if (klawisz === "ArrowRight" || klawisz === "Enter") idzWPrawo();
    else if (klawisz === "ArrowUp") idzWGore();
    else if (klawisz === "ArrowDown") idzWDol();

    if (nextI !== i || nextJ !== j) {
      const cel = document.querySelector(`.pole[data-i="${nextI}"][data-j="${nextJ}"]`);
      if (cel) {
        cel.focus();
        try { cel.select(); } catch(_) {}
      }
    }
  });

  wrap.appendChild(inp);
  return wrap;
}

function stworzSiatke(n) {
  const siatka = document.createElement("div");
  siatka.className = "siatka-macierz pre-in";

  const kolumny = n + 1 + 1;
  siatka.style.gridTemplateColumns = `repeat(${kolumny}, auto)`;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cell = createCell(`A_${i}_${j}`, i, j, "A");
      siatka.appendChild(cell);
    }
    const sep = document.createElement("div");
    sep.className = "separator-b";
    siatka.appendChild(sep);

    const cellB = createCell(`b_${i}`, i, n, "b");
    siatka.appendChild(cellB);
  }
  return siatka;
}

function animujZmianeSiatki(n) {
  const kontener = document.getElementById("kontener-siatki");
  const oldH = kontener.offsetHeight;

  const nowa = stworzSiatke(n);

  kontener.innerHTML = "";
  kontener.appendChild(nowa);
  const newH = nowa.offsetHeight;

  kontener.style.height = oldH + "px";
  kontener.offsetHeight;
  kontener.style.transition = "height 600ms cubic-bezier(.22,1,.36,1)";
  kontener.style.height = newH + "px";

  const poWysokosci = () => {
    kontener.style.transition = "";
    kontener.style.height = "";
    kontener.removeEventListener("transitionend", poWysokosci);
  };
  kontener.addEventListener("transitionend", poWysokosci);

  requestAnimationFrame(() => {
    nowa.classList.remove("pre-in");
    nowa.classList.add("fade-in");
    const pola = nowa.querySelectorAll(".pole");
    pola.forEach((pole) => {
      const i = parseInt(pole.getAttribute("data-i"), 10) || 0;
      const j = parseInt(pole.getAttribute("data-j") || "0", 10) || 0;
      const delay = (i + j) * 28;
      pole.style.animationDelay = `${delay}ms`;
      pole.classList.add("anim-in");
    });
  });

  setTimeout(() => validateAllFields(), 0);
}

function zbierzDaneDoJSON() {
  const n = parseInt(document.getElementById("rozmiar-n").value, 10);

  const A = Array.from({ length: n }, () => Array(n).fill("0"));
  const b = Array(n).fill("0");

  const pola = document.querySelectorAll("#kontener-siatki .pole");
  pola.forEach((inp) => {
    const typ = inp.getAttribute("data-typ");
    const i = parseInt(inp.getAttribute("data-i"), 10);
    const jAttr = inp.getAttribute("data-j");
    const j = jAttr ? parseInt(jAttr, 10) : null;

    const raw = inp.value === "" ? "0" : inp.value;
    const val = normalize(raw);

    if (typ === "A" && j != null && j < n) A[i][j] = val;
    if (typ === "b" && j === n) b[i] = val;
  });

  const MR = A.map((w, i) => [...w, b[i]]);
  return { mode: "augmented", rows: n, cols: n, matrix: MR };
}

function zresetujStanUI(odtworzDomyslnyRozmiar = true) {
  const rootKroki = document.getElementById("gauss-kroki-root");
  if (window.GaussKroki && typeof GaussKroki.destroy === "function") {
    try { GaussKroki.destroy("#gauss-kroki-root"); } catch (_) {}
  }
  if (rootKroki) rootKroki.innerHTML = "";

  const formularz = document.getElementById("formularz-kalkulatora");
  if (formularz) {
    formularz.reset();
  }

  const selektorN = document.getElementById("rozmiar-n");
  const n = odtworzDomyslnyRozmiar
    ? parseInt(selektorN.value || "3", 10)
    : Math.min(Math.max(parseInt(selektorN.value, 10) || 3, MIN_N), MAX_N);

  animujZmianeSiatki(n);

  const btnRozwiaz = document.getElementById("przycisk-rozwiaz");
  if (btnRozwiaz) btnRozwiaz.disabled = true;

  document.querySelectorAll("#kontener-siatki .pole").forEach(inp => {
    const wrap = inp.closest(".pole-wrap");
    markField(wrap, inp, "");
  });

}

function podlaczZdarzeniaFormularza() {
  const selektorN = document.getElementById("rozmiar-n");
  const przyciskWyczysc = document.getElementById("przycisk-wyczysc");
  const formularz = document.getElementById("formularz-kalkulatora");
  const btnRozwiaz = document.getElementById("przycisk-rozwiaz");

  const odswiezSiatke = () => {
    const n = Math.min(Math.max(parseInt(selektorN.value, 10) || 3, MIN_N), MAX_N);
    selektorN.value = String(n);
    animujZmianeSiatki(n);
    setFormMessage("Wpisz: liczby całkowite, ułamki (a/b) lub liczby dziesiętne (max 2 miejsca). Puste pola liczymy jako 0.", "");
  };

  selektorN.addEventListener("change", odswiezSiatke);

  przyciskWyczysc.addEventListener("click", () => {
    zresetujStanUI(true);
  });

  formularz.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const aktywny = document.activeElement;
      if (!aktywny || !aktywny.classList || !aktywny.classList.contains("pole")) {
        e.preventDefault();
      }
    }
  });

  formularz.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = validateAllFields();
    if (!ok) return;

    if (!anyFieldFilled()) {
      setFormMessage("Wprowadź parametry.", "blad");
      return;
    }

    try {
      btnRozwiaz.disabled = true;
      const payload = zbierzDaneDoJSON();

      const odp = await fetch("/api/gauss/kroki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const dane = await odp.json();

      const root = document.querySelector("#gauss-kroki-root");
      root.innerHTML = "";

      if (Array.isArray(dane.steps)) {
        GaussKroki.init("#gauss-kroki-root", dane.steps);
        setFormMessage("Gotowe. Przechodź po krokach w panelu poniżej.", "ok");
      } else {
        setFormMessage("", "");
        root.innerHTML = "";
      }
    } catch (err) {
      console.error(err);
      setFormMessage("Wystąpił błąd po stronie klienta lub API.", "blad");
    } finally {
      btnRozwiaz.disabled = false;
    }
  });

  odswiezSiatke();
}

document.addEventListener("DOMContentLoaded", () => {
  podlaczZdarzeniaFormularza();
});

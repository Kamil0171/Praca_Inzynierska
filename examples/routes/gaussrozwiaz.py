from __future__ import annotations
from flask import Blueprint, request, jsonify
from fractions import Fraction
from typing import List, Tuple, Dict, Any, Optional

gauss_rozwiaz_bp = Blueprint(
    "gauss_rozwiaz_bp",
    __name__,
    url_prefix="/przyklady"
)

def _f(x: Any) -> Fraction:
    if isinstance(x, Fraction):
        return x
    if isinstance(x, int):
        return Fraction(x, 1)
    if isinstance(x, float):
        return Fraction(x).limit_denominator(10_000)
    if isinstance(x, str):
        x = x.strip()
        if "/" in x:
            num, den = x.split("/", 1)
            return Fraction(int(num), int(den))
        try:
            return Fraction(int(x), 1)
        except ValueError:
            return Fraction(float(x)).limit_denominator(10_000)
    return Fraction(x)

def _kopiuj(M: List[List[Fraction]]) -> List[List[Fraction]]:
    return [wiersz[:] for wiersz in M]

def _format_liczba(q: Fraction, nawiasy_dla_ujemnych: bool = False) -> str:
    if q.denominator == 1:
        return str(q.numerator)

    if q < 0:
        q_abs = abs(q)
        if nawiasy_dla_ujemnych:
            return f"-({q_abs.numerator}/{q_abs.denominator})"
        return f"-{q_abs.numerator}/{q_abs.denominator}"

    return f"{q.numerator}/{q.denominator}"

def _format_macierz(M: List[List[Fraction]]) -> List[List[str]]:
    return [[_format_liczba(x) for x in w] for w in M]

def _parsuj_wejscie(d: Dict[str, Any]) -> Tuple[List[List[Fraction]], int, int]:
    if "macierz_rozszerzona" in d:
        MR = [[_f(x) for x in w] for w in d["macierz_rozszerzona"]]
        if not MR or any(len(w) < 2 for w in MR):
            raise ValueError("Niepoprawna macierz rozszerzona.")
        m = len(MR)
        n = len(MR[0]) - 1
        return MR, m, n

    if "A" in d and "b" in d:
        A = [[_f(x) for x in w] for w in d["A"]]
        b = [_f(x) for x in d["b"]]
        if len(A) == 0 or len(A) != len(b):
            raise ValueError("A i b mają niezgodne wymiary.")
        m = len(A)
        n = len(A[0])
        MR = [A[i] + [b[i]] for i in range(m)]
        return MR, m, n

    if "uklad" in d:
        return _parsuj_wejscie(d["uklad"])

    raise ValueError("Oczekiwano kluczy 'macierz_rozszerzona' lub 'A' i 'b'.")

Wyrazenie = Dict[str, Fraction]

def expr_zero() -> Wyrazenie:
    return {"const": Fraction(0)}

def expr_const(c: Fraction) -> Wyrazenie:
    return {"const": c}

def expr_param(nazwa: str) -> Wyrazenie:
    return {"const": Fraction(0), nazwa: Fraction(1)}

def expr_add(a: Wyrazenie, b: Wyrazenie) -> Wyrazenie:
    klucze = set(a.keys()) | set(b.keys())
    res: Wyrazenie = {}
    for k in klucze:
        res[k] = a.get(k, Fraction(0)) + b.get(k, Fraction(0))
    res = {k: v for k, v in res.items() if v != 0 or k == "const"}
    if "const" not in res:
        res["const"] = Fraction(0)
    return res

def expr_sub(a: Wyrazenie, b: Wyrazenie) -> Wyrazenie:
    klucze = set(a.keys()) | set(b.keys())
    res: Wyrazenie = {}
    for k in klucze:
        res[k] = a.get(k, Fraction(0)) - b.get(k, Fraction(0))
    res = {k: v for k, v in res.items() if v != 0 or k == "const"}
    if "const" not in res:
        res["const"] = Fraction(0)
    return res

def expr_mul_skal(a: Wyrazenie, k: Fraction) -> Wyrazenie:
    return {kk: vv * k for kk, vv in a.items()}

def expr_div_skal(a: Wyrazenie, k: Fraction) -> Wyrazenie:
    return {kk: vv / k for kk, vv in a.items()}

def expr_to_str(a: Wyrazenie) -> str:
    const = a.get("const", Fraction(0))
    elementy: List[str] = []
    if const != 0 or (len(a) == 1 and "const" in a):
        elementy.append(_format_liczba(const))

    for k in sorted([x for x in a.keys() if x != "const"], key=lambda s: (len(s), s)):
        coeff = a[k]
        if coeff == 0:
            continue
        wsp = _format_liczba(coeff)
        if wsp == "1":
            elementy.append(k)
        elif wsp == "-1":
            elementy.append(f"-{k}")
        else:
            elementy.append(f"({wsp})·{k}")

    if not elementy:
        return "0"

    wynik = elementy[0]
    for s in elementy[1:]:
        if s.startswith("-"):
            wynik += " - " + s[1:]
        else:
            wynik += " + " + s
    return wynik

def wyznacz_kroki_gaussa(MR: List[List[Fraction]], m: int, n: int) -> Tuple[
    List[Dict[str, Any]], List[int], List[List[Fraction]]]:
    kroki: List[Dict[str, Any]] = []
    A = _kopiuj(MR)

    kroki.append({
        "typ": "start",
        "komentarz": "Macierz rozszerzona [A|b] na wejściu.",
        "macierz": _format_macierz(A)
    })

    w = 0
    pivoty: List[int] = []

    for k in range(n):
        r = None
        for i in range(w, m):
            if A[i][k] != 0:
                r = i
                break

        if r is None:
            kroki.append({
                "typ": "plan",
                "komentarz": f"Brak niezerowego elementu wiodącego — przechodzimy do następnej kolumny.",
                "macierz": _format_macierz(A)
            })
            continue

        if r != w:
            A[w], A[r] = A[r], A[w]
            zm = []
            for j in range(k, n + 1):
                zm.append((w + 1, j + 1))
                zm.append((r + 1, j + 1))
            kroki.append({
                "typ": "zamiana",
                "komentarz": f"Zamieniamy wiersze W{w + 1} ↔ W{r + 1}, aby uzyskać niezerowy element wiodący.",
                "pivot": [w, k],
                "operacje": [{"op": "swap", "w1": w + 1, "w2": r + 1}],
                "zmienione": zm,
                "macierz": _format_macierz(A)
            })

        pivot = A[w][k]
        pivoty.append(k)

        if pivot != 1:
            czynnik = Fraction(1) / pivot
            for j in range(k, n + 1):
                A[w][j] = A[w][j] * czynnik

            if pivot < 0:
                pivot_abs = abs(pivot)
                if pivot_abs.denominator == 1:
                    czynnik_txt = f"(-1/{pivot_abs.numerator})"
                else:
                    czynnik_txt = f"(-{pivot_abs.denominator}/{pivot_abs.numerator})"
            else:
                if pivot.denominator == 1:
                    czynnik_txt = f"(1/{pivot.numerator})"
                else:
                    czynnik_txt = f"({pivot.denominator}/{pivot.numerator})"

            kroki.append({
                "typ": "skaluj",
                "komentarz": f"Normalizujemy W{w + 1}, aby element wiodący był równy 1.",
                "pivot": [w, k],
                "operacje": [{"op": "scale", "wiersz": w + 1, "czynnik": czynnik_txt}],
                "zmienione": [(w + 1, j + 1) for j in range(k, n + 1)],
                "macierz": _format_macierz(A)
            })

        pivot = A[w][k]

        for i in range(w + 1, m):
            if A[i][k] == 0:
                continue

            czynnik = A[i][k] / pivot
            abs_czynnik = abs(czynnik)

            if czynnik > 0:
                czasownik = "odejmujemy"
                znak_operacji = "-"
            else:
                czasownik = "dodajemy"
                znak_operacji = "+"
                czynnik = abs(czynnik)

            if abs_czynnik == 1:
                czynn_txt = ""
                operacja_txt = f"W{w + 1}"
            else:
                czynn_txt = f"{_format_liczba(abs_czynnik)}·"
                operacja_txt = f"{znak_operacji}{_format_liczba(abs_czynnik)}·W{w + 1}"

            zm = []
            original_czynnik = -czynnik if znak_operacji == "+" else czynnik
            for j in range(k, n + 1):
                stara = A[i][j]
                A[i][j] = A[i][j] - original_czynnik * A[w][j]
                if A[i][j] != stara:
                    zm.append((i + 1, j + 1))

            kroki.append({
                "typ": "eliminacja",
                "komentarz": f"Zerujemy element: do W{i + 1} {czasownik} {czynn_txt}W{w + 1}.",
                "pivot": [w, k],
                "operacje": [{"op": "row_add", "docelowy": i + 1, "zrodlo": w + 1, "czynnik": operacja_txt}],
                "zmienione": zm if zm else [(i + 1, k + 1)],
                "macierz": _format_macierz(A)
            })

        w += 1
        if w == m:
            break

    kroki.append({
        "typ": "trojkatna",
        "komentarz": "Otrzymaliśmy postać trójkątną.",
        "macierz": _format_macierz(A)
    })

    return kroki, pivoty, A

def sprawdz_sprzecznosc(M: List[List[Fraction]], n: int) -> bool:
    for w in M:
        if all(x == 0 for x in w[:n]) and w[-1] != 0:
            return True
    return False

def podstawianie_wsteczne_parametryczne(M: List[List[Fraction]], m: int, n: int, pivoty: List[int],
                                        kroki: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
    kolumny = list(range(n))
    wolne = [c for c in kolumny if c not in pivoty]
    parametry = [f"x{c + 1}" for c in wolne]

    if wolne:
        nazwy_wolnych = ", ".join([f"x{c + 1}" for c in wolne])
        kroki.append({
            "typ": "plan",
            "komentarz": f"Zmienne wolne: {nazwy_wolnych}.",
            "macierz": _format_macierz(M)
        })

    X: List[Wyrazenie] = [expr_zero() for _ in range(n)]
    for idx, kol in enumerate(wolne):
        X[kol] = expr_param(f"x{kol + 1}")

    r = 0
    for i in range(m):
        if any(M[i][j] != 0 for j in range(n)) or M[i][-1] != 0:
            r = i + 1

    for i in range(r - 1, -1, -1):
        pcol: Optional[int] = None
        for j in range(n):
            if M[i][j] != 0:
                pcol = j
                break

        if pcol is None:
            continue

        suma: Wyrazenie = expr_zero()
        skladniki_txt = []
        for j in range(pcol + 1, n):
            if M[i][j] != 0:
                suma = expr_add(suma, expr_mul_skal(X[j], M[i][j]))
                skladniki_txt.append(f"{_format_liczba(M[i][j])}·x{j + 1}")

        rhs = expr_sub(expr_const(M[i][-1]), suma)
        X[pcol] = expr_div_skal(rhs, M[i][pcol])

        wynik_str = expr_to_str(X[pcol])
        dzialanie_dymek = f"x{pcol + 1} = {wynik_str}"

        if skladniki_txt:
            suma_txt = " + ".join(skladniki_txt)
            if M[i][pcol] == 1:
                obliczenia = f"→ x{pcol + 1} = {_format_liczba(M[i][-1], True)} - ({suma_txt}) = {wynik_str}"
            else:
                obliczenia = f"→ x{pcol + 1} = [{_format_liczba(M[i][-1], True)} - ({suma_txt})] / {_format_liczba(M[i][pcol])} = {wynik_str}"
        else:
            if M[i][pcol] == 1:
                obliczenia = f"→ x{pcol + 1} = {_format_liczba(M[i][-1], True)}"
            else:
                obliczenia = f"→ x{pcol + 1} = {_format_liczba(M[i][-1], True)} / {_format_liczba(M[i][pcol])} = {wynik_str}"

        kroki.append({
            "typ": "wstecz",
            "komentarz": f"Wyznaczamy x{pcol + 1} z równania w W{i + 1}.\n{obliczenia}",
            "pivot": [i, pcol],
            "macierz": _format_macierz(M),
            "dzialanie": dzialanie_dymek
        })

    wyrazenia = [expr_to_str(x) for x in X]
    return wyrazenia, parametry

@gauss_rozwiaz_bp.post("/api/gauss/kroki")
def api_kroki_gauss():
    try:
        dane = request.get_json(force=True, silent=False) or {}
        MR, m, n = _parsuj_wejscie(dane)
    except Exception as exc:
        return jsonify({"blad": f"Niepoprawne dane wejściowe: {exc}"}), 400

    kroki, pivoty, A_REF = wyznacz_kroki_gaussa(MR, m, n)

    if sprawdz_sprzecznosc(A_REF, n):
        kroki.append({
            "typ": "wynik",
            "komentarz": "Układ jest sprzeczny — wiersz zerowy po lewej stronie ma niezerową wartość po prawej.",
            "macierz": _format_macierz(A_REF),
            "rozwiazanie": {"typ": "sprzeczny"}
        })
        return jsonify({"kroki": kroki})

    ranga = 0
    for i in range(m):
        if any(A_REF[i][j] != 0 for j in range(n)) or A_REF[i][-1] != 0:
            ranga += 1

    if ranga == n:
        X: List[Fraction] = [Fraction(0) for _ in range(n)]
        ostatni = -1
        for i in range(m - 1, -1, -1):
            if any(A_REF[i][j] != 0 for j in range(n)) or A_REF[i][-1] != 0:
                ostatni = i
                break

        for i in range(ostatni, -1, -1):
            pcol = None
            for j in range(n):
                if A_REF[i][j] != 0:
                    pcol = j
                    break

            if pcol is None:
                continue

            skladniki_wzor = []
            skladniki_wartosci = []
            suma_num = Fraction(0)
            ma_ujemne_wspolczynniki = False
            ma_ujemne_wartosci = False

            for j in range(pcol + 1, n):
                if A_REF[i][j] != 0:
                    coeff = A_REF[i][j]

                    if coeff < 0:
                        ma_ujemne_wspolczynniki = True

                    skladniki_wzor.append(f"{_format_liczba(coeff)}·x{j + 1}")

                    wartosc_x = X[j]
                    if wartosc_x < 0:
                        ma_ujemne_wartosci = True
                        skladniki_wartosci.append(f"{_format_liczba(coeff)}·({_format_liczba(wartosc_x)})")
                    else:
                        skladniki_wartosci.append(f"{_format_liczba(coeff)}·{_format_liczba(wartosc_x)}")
                    suma_num += coeff * wartosc_x

            wartosc = (A_REF[i][-1] - suma_num) / A_REF[i][pcol]
            X[pcol] = wartosc

            dzialanie_dymek = f"x{pcol + 1} = {_format_liczba(wartosc)}"

            if skladniki_wzor:
                wzor = " + ".join(skladniki_wzor)
                podstawienie = " + ".join(skladniki_wartosci)

                wzor_z_nawiasem = f"[{wzor}]" if ma_ujemne_wspolczynniki else f"({wzor})"
                podstawienie_z_nawiasem = f"[{podstawienie}]" if ma_ujemne_wartosci else f"({podstawienie})"

                if A_REF[i][pcol] == 1:
                    obliczenia = f"→ x{pcol + 1} = {_format_liczba(A_REF[i][-1])} - {wzor_z_nawiasem} = {_format_liczba(A_REF[i][-1])} - {podstawienie_z_nawiasem} = {_format_liczba(wartosc)}"
                else:
                    obliczenia = f"→ x{pcol + 1} = [{_format_liczba(A_REF[i][-1])} - {wzor_z_nawiasem}] / {_format_liczba(A_REF[i][pcol])} = [{_format_liczba(A_REF[i][-1])} - {podstawienie_z_nawiasem}] / {_format_liczba(A_REF[i][pcol])} = {_format_liczba(wartosc)}"
            else:
                if A_REF[i][pcol] == 1:
                    obliczenia = f"→ x{pcol + 1} = {_format_liczba(A_REF[i][-1])}"
                else:
                    obliczenia = f"→ x{pcol + 1} = {_format_liczba(A_REF[i][-1])} / {_format_liczba(A_REF[i][pcol])} = {_format_liczba(wartosc)}"

            kroki.append({
                "typ": "wstecz",
                "komentarz": f"Wyznaczamy x{pcol + 1} z równania w W{i + 1}.\n{obliczenia}",
                "pivot": [i, pcol],
                "macierz": _format_macierz(A_REF),
                "dzialanie": dzialanie_dymek
            })

        rozwiazania_tekst = ", ".join([f"x{i + 1} = {_format_liczba(X[i])}" for i in range(n)])
        kroki.append({
            "typ": "wynik",
            "komentarz": f"Rozwiązanie: {rozwiazania_tekst}",
            "macierz": _format_macierz(A_REF),
            "rozwiazanie": {"typ": "jednoznaczny", "x": [_format_liczba(v) for v in X]}
        })

    else:
        wyrazy, paramy = podstawianie_wsteczne_parametryczne(A_REF, m, n, pivoty, kroki)

        rozwiazania_tekst = ", ".join([f"x{i + 1} = {wyrazy[i]}" for i in range(n)])
        kroki.append({
            "typ": "wynik",
            "komentarz": f"Rozwiązanie parametryczne: {rozwiazania_tekst}",
            "macierz": _format_macierz(A_REF),
            "rozwiazanie": {"typ": "parametryczny", "x": wyrazy, "parametry": paramy}
        })

        wolne_kolumny = [i for i in range(n) if i not in pivoty]
        if wolne_kolumny:
            podstawienia_txt = ", ".join([f"x{kol + 1} = 0" for kol in wolne_kolumny])

            kroki.append({
                "typ": "plan",
                "komentarz": f"Przykład: Podstawiamy {podstawienia_txt}.",
                "macierz": _format_macierz(A_REF)
            })

            X_przyklad = [Fraction(0) for _ in range(n)]
            r = len([i for i in range(len(A_REF)) if any(A_REF[i][j] != 0 for j in range(n)) or A_REF[i][-1] != 0])

            for i in range(r - 1, -1, -1):
                pcol = None
                for j in range(n):
                    if A_REF[i][j] != 0:
                        pcol = j
                        break
                if pcol is None:
                    continue

                suma = Fraction(0)
                for j in range(pcol + 1, n):
                    if A_REF[i][j] != 0:
                        suma += A_REF[i][j] * X_przyklad[j]

                X_przyklad[pcol] = (A_REF[i][-1] - suma) / A_REF[i][pcol]

            wyniki_przyklad = ", ".join([f"x{i + 1} = {_format_liczba(X_przyklad[i])}" for i in range(n)])

            kroki.append({
                "typ": "wynik",
                "komentarz": f"Otrzymujemy: {wyniki_przyklad}",
                "macierz": _format_macierz(A_REF),
                "rozwiazanie": {"typ": "przyklad", "x": [_format_liczba(v) for v in X_przyklad]}
            })

    return jsonify({"kroki": kroki})

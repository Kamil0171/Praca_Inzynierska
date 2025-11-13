from typing import List, Dict, Any
from fractions import Fraction

try:
    from flask import Blueprint, request, jsonify
    from .macierzschodkowaprzyklady import przyklady_bp
except Exception:
    przyklady_bp = None


def _na_ulamki(macierz: List[List[Any]]) -> List[List[Fraction]]:
    return [[Fraction(str(x)) for x in wiersz] for wiersz in macierz]


def _napis_ulamek(x: Fraction) -> str:
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def _macierz_na_napisy(A: List[List[Fraction]]) -> List[List[str]]:
    return [[_napis_ulamek(x) for x in wiersz] for wiersz in A]


_SUB = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'}

def _sub(n: int) -> str:
    return ''.join(_SUB.get(ch, ch) for ch in str(n))

def _K(i: int) -> str:
    return f"K{_sub(i)}"

def _W(j: int) -> str:
    return f"W{_sub(j)}"


def _napis_wspolczynnika(fr: Fraction) -> str:
    f = float(fr)
    s = f"{f:.6f}"
    s = s.rstrip('0').rstrip('.') if '.' in s else s
    if s in ("-0", "-0."):
        s = "0"
    return s


def kroki_gauss_ref(macierz: List[List[Any]]) -> List[Dict[str, Any]]:
    A = _na_ulamki(macierz)
    m = len(A)
    n = len(A[0]) if A else 0
    kroki: List[Dict[str, Any]] = []

    def wszystkie_zera_od(idx: int) -> bool:
        for i in range(idx, m):
            if any(A[i][j] != 0 for j in range(n)):
                return False
        return True

    kroki.append({
        "typ": "start",
        "macierz": _macierz_na_napisy(A),
        "opis": "Macierz wejściowa.",
        "pivot": None,
        "kolumna": 1,
        "wiersz": 1,
        "operacje": [],
        "zmienione": []
    })

    r = 0
    for c in range(n):
        if r >= m:
            break

        if wszystkie_zera_od(r):
            kroki.append({
                "typ": "finish",
                "macierz": _macierz_na_napisy(A),
                "opis": "Otrzymaliśmy postać schodkową.",
                "pivot": None,
                "kolumna": 0,
                "wiersz": 0,
                "operacje": [],
                "zmienione": []
            })
            return kroki

        p = r
        while p < m and A[p][c] == 0:
            p += 1

        if p >= m:
            if wszystkie_zera_od(r):
                kroki.append({
                    "typ": "finish",
                    "macierz": _macierz_na_napisy(A),
                    "opis": "Otrzymaliśmy postać schodkową.",
                    "pivot": None,
                    "kolumna": 0,
                    "wiersz": 0,
                    "operacje": [],
                    "zmienione": []
                })
                return kroki
            kroki.append({
                "typ": "skipcol",
                "macierz": _macierz_na_napisy(A),
                "opis": f"W {_K(c+1)} brak niezerowego elementu – przechodzimy dalej.",
                "pivot": None,
                "kolumna": c+1,
                "wiersz": r+1,
                "operacje": [],
                "zmienione": []
            })
            continue

        if p != r:
            A[r], A[p] = A[p], A[r]
            kroki.append({
                "typ": "swap",
                "macierz": _macierz_na_napisy(A),
                "opis": f"Zamieniamy miejscami {_W(r+1)} i {_W(p+1)}, aby w {_K(c+1)} na górze był niezerowy element (element wiodący).",
                "pivot": {"row": r+1, "col": c+1, "value": _napis_ulamek(A[r][c])},
                "kolumna": c+1,
                "wiersz": r+1,
                "operacje": [{"op": "swap", "r1": r+1, "r2": p+1}],
                "zmienione": []
            })

        kroki.append({
            "typ": "pivot",
            "macierz": _macierz_na_napisy(A),
            "opis": f"Wybieramy element wiodący w {_K(c+1)}: znajduje się w {_W(r+1)}.",
            "pivot": {"row": r+1, "col": c+1, "value": _napis_ulamek(A[r][c])},
            "kolumna": c+1,
            "wiersz": r+1,
            "operacje": [],
            "zmienione": []
        })

        wykonano = False
        for i in range(r+1, m):
            if A[i][c] == 0:
                continue

            wsp = -A[i][c] / A[r][c]
            zmienione: List[List[int]] = []
            for j in range(c, n):
                przed = A[i][j]
                A[i][j] = A[i][j] + wsp * A[r][j]
                if A[i][j] != przed:
                    zmienione.append([i+1, j+1])

            wykonano = True

            abs_w = abs(wsp)
            czasownik = "odejmujemy" if wsp < 0 else "dodajemy"
            czynn_txt = "" if abs_w == 1 else f"{_napis_ulamek(abs_w)}·"

            krok = {
                "typ": "elim",
                "macierz": _macierz_na_napisy(A),
                "opis": f"W {_K(c+1)} zerujemy element w {_W(i+1)}: do {_W(i+1)} {czasownik} {czynn_txt}{_W(r+1)}.",
                "pivot": {"row": r+1, "col": c+1, "value": _napis_ulamek(A[r][c])},
                "kolumna": c+1,
                "wiersz": r+1,
                "operacje": [{
                    "op": "add",
                    "target": i+1,
                    "src": r+1,
                    "factor": _napis_wspolczynnika(wsp)
                }],
                "zmienione": zmienione
            }
            kroki.append(krok)

        if not wykonano and (r + 1 < m):
            kroki.append({
                "typ": "skipcol",
                "macierz": _macierz_na_napisy(A),
                "opis": f"W {_K(c+1)} poniżej {_W(r+1)} są już zera — przechodzimy dalej.",
                "pivot": {"row": r+1, "col": c+1, "value": _napis_ulamek(A[r][c])},
                "kolumna": c+1,
                "wiersz": r+1,
                "operacje": [],
                "zmienione": []
            })

        r += 1

        if r >= m or wszystkie_zera_od(r):
            kroki.append({
                "typ": "finish",
                "macierz": _macierz_na_napisy(A),
                "opis": "Otrzymaliśmy postać schodkową.",
                "pivot": None,
                "kolumna": 0,
                "wiersz": 0,
                "operacje": [],
                "zmienione": []
            })
            return kroki

    kroki.append({
        "typ": "finish",
        "macierz": _macierz_na_napisy(A),
        "opis": "Otrzymaliśmy postać schodkową.",
        "pivot": None,
        "kolumna": 0,
        "wiersz": 0,
        "operacje": [],
        "zmienione": []
    })

    return kroki


if przyklady_bp:
    @przyklady_bp.post("/api/msch/kroki")
    def api_kroki_msch() -> Any:
        dane = request.get_json(force=True, silent=True) or {}
        macierz = dane.get("macierz")
        if not isinstance(macierz, list):
            return jsonify({"blad": "Brak poprawnej macierzy."}), 400
        try:
            return jsonify(kroki_gauss_ref(macierz))
        except Exception as e:
            return jsonify({"blad": str(e)}), 400

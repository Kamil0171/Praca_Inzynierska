from fractions import Fraction
from typing import List, Dict, Any, Tuple


def _to_frac(s: str) -> Fraction:
    s = (s or "0").strip().replace(",", ".")
    if "/" in s:
        a, b = s.split("/", 1)
        return Fraction(int(a), int(b))
    return Fraction(s)


def _fstr(x: Fraction) -> str:
    if x.denominator == 1:
        return str(x.numerator)
    return f"{x.numerator}/{x.denominator}"


def _latex_frac(x: Fraction) -> str:
    if x.denominator == 1:
        return str(x.numerator)
    sgn = "-" if x < 0 else ""
    a = abs(x.numerator)
    b = x.denominator
    return f"{sgn}\\tfrac{{{a}}}{{{b}}}"


def _inline(tex: str) -> str:
    if tex is None:
        return None
    t = tex.strip()
    if t.startswith("\\(") and t.endswith("\\)"):
        return t
    return f"\\({t}\\)"


def _serialize_aug(m):
    return [[_fstr(v) for v in row] for row in m]


def _rankA_rankAb(m) -> Tuple[int, int]:
    rankA = 0
    rankAb = 0
    for r in m:
        a_nz = any(c != 0 for c in r[:-1])
        ab_nz = a_nz or (r[-1] != 0)
        if a_nz:
            rankA += 1
        if ab_nz:
            rankAb += 1
    return rankA, rankAb


def _krok(steps: List[Dict], **kwargs):
    steps.append({
        "aug": kwargs.pop("aug"),
        "desc_tex": kwargs.pop("desc_tex", None),
        "op_chip_tex": kwargs.pop("op_chip_tex", None),
        "side_eq_tex": kwargs.pop("side_eq_tex", None),
        "highlight": kwargs.pop("highlight", None),
        "shade_rows": kwargs.pop("shade_rows", []),
        "shade_cols": kwargs.pop("shade_cols", []),
        "type": kwargs.pop("type", "step"),
        **kwargs
    })


def _latex_iloczyn(a: Fraction, b_tekst: str) -> str:
    return f"{_latex_frac(a)} \\cdot {b_tekst}"


def _polacz_wyrazenia(wyrazenia: List[str]) -> str:
    if not wyrazenia:
        return ""
    s = " + ".join(wyrazenia)
    return s.replace("+ -", "- ")


def gauss_steps(aug_matrix: List[List[str]]) -> Dict[str, any]:
    try:
        M = [[_to_frac(x) for x in row] for row in aug_matrix]
    except Exception as e:
        return {"error": {"code": "PARSE_ERROR", "message": f"Nie udało się sparsować liczb: {e}"}}

    n = len(M)
    if n == 0 or any(len(r) != n + 1 for r in M):
        return {"error": {"code": "BAD_SHAPE", "message": "Macierz rozszerzona musi mieć rozmiar n×(n+1)."}}

    steps: List[Dict] = []

    _krok(steps,
          type="init",
          desc_tex="Macierz rozszerzona \\([A|b]\\) na wejściu.",
          aug=_serialize_aug(M))

    row = 0
    pivots = []

    for col in range(n):
        pivot = None
        best_abs = Fraction(0)
        for r in range(row, n):
            v = M[r][col]
            if v != 0 and abs(v) > best_abs:
                best_abs = abs(v)
                pivot = r
        if pivot is None:
            continue

        if pivot != row:
            M[row], M[pivot] = M[pivot], M[row]

        _krok(steps,
              type="pivot",
              desc_tex=f"Wybieramy element wiodący \\(K_{{{col + 1}}}\\), znajduje się w \\(W_{{{row + 1}}}\\).",
              aug=_serialize_aug(M),
              highlight={"row": row, "col": col})

        piv_before = M[row][col]
        if piv_before != 1:
            mul = Fraction(1, 1) / piv_before
            for c in range(col, n + 1):
                M[row][c] *= mul

            _krok(steps,
                  type="normalize",
                  desc_tex=f"Normalizujemy \\(W_{{{row + 1}}}\\), aby element wiodący był równy \\(1\\).",
                  op_chip_tex=_inline(
                      f"K_{{{col + 1}}}:\\; W_{{{row + 1}}} \\leftarrow W_{{{row + 1}}} \\cdot {_latex_frac(mul)}"),
                  aug=_serialize_aug(M),
                  highlight={"row": row, "col": col},
                  shade_rows=[row])

        ops_tex = []
        changed_rows = []
        for r in range(row + 1, n):
            if M[r][col] == 0:
                continue
            factor = M[r][col]
            for c in range(col, n + 1):
                M[r][c] -= factor * M[row][c]
            ops_tex.append(f"W_{{{r + 1}}} \\leftarrow W_{{{r + 1}}} - ({_latex_frac(factor)})\\, W_{{{row + 1}}}")
            changed_rows.append(r)

        if changed_rows:
            sh = [row, changed_rows[-1]] if changed_rows else [row]
            _krok(steps,
                  type="eliminate_block",
                  desc_tex=f"Zerujemy elementy w kolumnie \\(K_{{{col + 1}}}\\) poniżej elementu wiodącego.",
                  op_chip_tex=_inline(f"K_{{{col + 1}}}:\\; " + "\\;,\\; ".join(ops_tex)),
                  aug=_serialize_aug(M),
                  highlight={"row": row, "col": col},
                  shade_rows=sh)

        pivots.append((row, col))
        row += 1
        if row == n:
            break

    for r in range(n):
        if all(M[r][c] == 0 for c in range(n)) and M[r][n] != 0:
            _krok(steps, type="result",
                  desc_tex="Układ sprzeczny – brak rozwiązań.",
                  aug=_serialize_aug(M))
            return {"steps": steps}

    macierz_trojkatna = [wiersz[:] for wiersz in M]

    for r, c in reversed(pivots):
        for rr in range(r - 1, -1, -1):
            if M[rr][c] != 0:
                factor = M[rr][c]
                for k in range(c, n + 1):
                    M[rr][k] -= factor * M[r][k]

    rozwiazania = {}

    for i in range(n - 1, -1, -1):
        wiersz = macierz_trojkatna[i]
        b = wiersz[n]

        skladniki = []
        skladniki_tex = []
        suma = Fraction(0)

        skladniki_zmiennych_tex: List[str] = []
        skladniki_wartosci_tex: List[str] = []

        for j in range(i + 1, n):
            wspolczynnik = wiersz[j]
            if wspolczynnik != 0:
                wartosc_xj = rozwiazania[j]
                suma += wspolczynnik * wartosc_xj

                skladniki.append((wspolczynnik, j, wartosc_xj))
                skladniki_tex.append(f"{_latex_frac(wspolczynnik)} \\cdot {_latex_frac(wartosc_xj)}")
                skladniki_zmiennych_tex.append(_latex_iloczyn(wspolczynnik, f"x_{{{j + 1}}}"))
                skladniki_wartosci_tex.append(_latex_iloczyn(wspolczynnik, _latex_frac(wartosc_xj)))

        xi = b - suma
        rozwiazania[i] = xi

        if skladniki:
            zmienne_tex = _polacz_wyrazenia(skladniki_zmiennych_tex)
            wartosci_tex = _polacz_wyrazenia(skladniki_wartosci_tex)
            obliczenia = (
                "\\["
                f"x_{{{i + 1}}} = {_latex_frac(b)} - \\left({zmienne_tex}\\right)"
                f" = {_latex_frac(b)} - \\left({wartosci_tex}\\right)"
                f" = {_latex_frac(b)} - {_latex_frac(suma)}"
                f" = {_latex_frac(xi)}"
                "\\]"
            )
            desc = f"Wyznaczamy \\(x_{{{i + 1}}}\\) z równania w \\(W_{{{i + 1}}}\\).<br/>{obliczenia}"
        else:
            obliczenia = f"\\[x_{{{i + 1}}} = {_latex_frac(b)}\\]"
            desc = f"Wyznaczamy \\(x_{{{i + 1}}}\\) z równania w \\(W_{{{i + 1}}}\\).<br/>{obliczenia}"

        _krok(steps,
              type="back_substitute",
              desc_tex=desc,
              side_eq_tex=_inline(f"x_{{{i + 1}}} = {_latex_frac(xi)}"),
              aug=_serialize_aug(M),
              highlight={"row": i, "col": i},
              shade_rows=[i],
              target_row=i)

    rankA, rankAb = _rankA_rankAb(M)
    if rankA < rankAb:
        _krok(steps, type="result",
              desc_tex="Układ sprzeczny – brak rozwiązań.",
              aug=_serialize_aug(M))
    elif rankA < n:
        _krok(steps, type="result",
              desc_tex="Nieskończenie wiele rozwiązań.",
              aug=_serialize_aug(M))
    else:
        sol = ",\\;".join([f"x_{{{i + 1}}}={_latex_frac(rozwiazania[i])}" for i in range(n)])
        _krok(steps, type="result",
              desc_tex="Rozwiązanie układu równań:",
              aug=_serialize_aug(M),
              solution_tex=f"\\({sol}\\)")

    return {"steps": steps}

import re
from fractions import Fraction
import pytest

from main import aplikacja
from core.gauss import gauss_steps


@pytest.fixture(scope="session")
def app():
    aplikacja.testing = True
    return aplikacja


@pytest.fixture()
def klient(app):
    return app.test_client()


@pytest.fixture(scope="session")
def macierze_poprawne():
    return {
        "prosty_2x2": [["2", "1", "5"], ["4", "4", "12"]],
        "zamiana_wierszy": [["0", "1", "2"], ["3", "4", "10"]],
        "normalizacja_pivota": [["2", "0", "6"], ["0", "3", "9"]],
        "ulamki_stringi": [["1/2", "1", "2"], ["1", "3/2", "3"]],
        "sprzeczny": [["1", "1", "2"], ["2", "2", "5"]],
        "nieskonczenie_wiele": [["1", "2", "3"], ["2", "4", "6"]],
    }


@pytest.fixture(scope="session")
def macierze_bledne():
    return {
        "zly_ksztalt": [["1", "2"], ["3", "4", "5"]],
        "nieparsowalne": [["a", "1", "2"], ["1", "2", "3"]],
        "pusta": [],
    }


def _to_frac(s):
    s = (str(s) if s is not None else "0").strip()
    if s.startswith(r"\tfrac"):
        m = re.match(r"\\tfrac\{\s*(-?\d+)\s*\}\{\s*(-?\d+)\s*\}", s)
        if m:
            return Fraction(int(m.group(1)), int(m.group(2)))
    s = s.replace(",", ".")
    if "/" in s:
        a, b = s.split("/", 1)
        return Fraction(int(a), int(b))
    return Fraction(s)


def policz_Ax(A, x):
    n = len(A)
    wynik = [Fraction(0) for _ in range(n)]
    for i in range(n):
        for j in range(n):
            wynik[i] += _to_frac(A[i][j]) * x[j]
    return wynik


def parsuj_rozwiazanie_tex(solution_tex):
    if not solution_tex:
        return None

    tekst = solution_tex.strip()

    if tekst.startswith(r"\(") and tekst.endswith(r"\)"):
        tekst = tekst[2:-2]

    wzorzec = r"x_\{(\d+)\}\s*=\s*([\\tfrac\{\}\-\d/\s\.]+)"
    wartosci = {}
    for numer, val in re.findall(wzorzec, tekst):
        wartosci[int(numer)] = _to_frac(val.strip())

    if not wartosci:
        return None

    n = max(wartosci.keys())
    return [wartosci[i] for i in range(1, n + 1)]


def assert_kroki_spojne(kroki, n):
    assert isinstance(kroki, list) and len(kroki) > 0
    for k in kroki:
        assert "type" in k
        assert "aug" in k
        aug = k["aug"]
        assert len(aug) == n
        for w in aug:
            assert len(w) == n + 1
            assert all(isinstance(x, str) for x in w)

        if k.get("highlight"):
            rr = k["highlight"].get("row")
            cc = k["highlight"].get("col")
            if rr is not None:
                assert 0 <= rr < n
            if cc is not None:
                assert 0 <= cc < n + 1
        if k.get("shade_rows"):
            for rr in k["shade_rows"]:
                assert 0 <= rr < n
        if k.get("shade_cols"):
            for cc in k["shade_cols"]:
                assert 0 <= cc < n + 1


def uruchom_gauss(matrix):
    wynik = gauss_steps(matrix)
    if "error" in wynik:
        return None, None, wynik["error"]["code"]
    kroki = wynik["steps"]
    rozw_tex = next((k.get("solution_tex") for k in kroki if k.get("type") == "result"), None)
    x = parsuj_rozwiazanie_tex(rozw_tex)
    return kroki, x, None


def macierz_jako_stringi(M):
    return [[str(x) for x in w] for w in M]

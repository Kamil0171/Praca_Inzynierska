from fractions import Fraction
import pytest

from core.gauss import gauss_steps
from .conftest import (
    policz_Ax,
    assert_kroki_spojne,
    parsuj_rozwiazanie_tex,
    _to_frac,
)

@pytest.mark.parametrize("klucz, oczekiwane", [
    ("prosty_2x2", [Fraction(2), Fraction(1)]),
    ("zamiana_wierszy", [Fraction(2, 3), Fraction(2)]),
    ("normalizacja_pivota", [Fraction(3), Fraction(3)]),
    ("ulamki_stringi", [Fraction(0), Fraction(2)]),
])
def test_jedno_rozwiazanie_poprawne_x(macierze_poprawne, klucz, oczekiwane):
    M = macierze_poprawne[klucz]
    wynik = gauss_steps(M)
    assert "error" not in wynik

    kroki = wynik["steps"]
    n = len(M)
    assert_kroki_spojne(kroki, n)

    result = [k for k in kroki if k.get("type") == "result"]
    assert result, "Brak kroku 'result'"
    x = parsuj_rozwiazanie_tex(result[-1].get("solution_tex"))
    assert x == oczekiwane

    A = [wiersz[:-1] for wiersz in M]
    b = [wiersz[-1] for wiersz in M]
    assert policz_Ax(A, x) == [Fraction(bb.replace(",", ".")) for bb in b]


def test_brak_rozwiazan(macierze_poprawne):
    M = macierze_poprawne["sprzeczny"]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    kroki = wynik["steps"]
    assert any("sprzeczny" in (k.get("desc_tex") or "").lower() for k in kroki if k.get("type") == "result")


def test_nieskonczenie_wiele_rozwiazan(macierze_poprawne):
    M = macierze_poprawne["nieskonczenie_wiele"]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    kroki = wynik["steps"]
    assert any("nieskończenie wiele" in (k.get("desc_tex") or "").lower()
               for k in kroki if k.get("type") == "result")


@pytest.mark.parametrize("klucz, kod_bledu", [
    ("zly_ksztalt", "BAD_SHAPE"),
    ("pusta", "BAD_SHAPE"),
    ("nieparsowalne", "PARSE_ERROR"),
])
def test_bledy_wejscia(macierze_bledne, klucz, kod_bledu):
    M = macierze_bledne[klucz]
    wynik = gauss_steps(M)
    assert "error" in wynik
    assert wynik["error"]["code"] == kod_bledu


def test_minimalny_uklad_1x2():
    # x1 = 7
    M = [["1", "7"]]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    kroki = wynik["steps"]
    assert_kroki_spojne(kroki, 1)
    res = [k for k in kroki if k.get("type") == "result"][-1]
    x = parsuj_rozwiazanie_tex(res.get("solution_tex"))
    assert x == [Fraction(7)]


def test_wielokrotne_zamiany_wierszy():
    M = [
        ["0", "0", "1", "1"],
        ["0", "1", "0", "2"],
        ["1", "0", "0", "3"],
    ]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    kroki = wynik["steps"]
    assert_kroki_spojne(kroki, 3)
    res = [k for k in kroki if k.get("type") == "result"][-1]
    x = parsuj_rozwiazanie_tex(res.get("solution_tex"))
    assert x == [Fraction(3), Fraction(2), Fraction(1)]


def test_formaty_nietypowe_jednoelementowe():
    M = [["1", "2"]]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    res = [k for k in wynik["steps"] if k.get("type") == "result"][-1]
    x = parsuj_rozwiazanie_tex(res.get("solution_tex"))
    assert x == [Fraction(2)]


def test_unicode_minus_i_duze_ulamki():
    M = [["3", "\u22121"]]
    wynik = gauss_steps(M)
    if "error" in wynik:
        assert wynik["error"]["code"] in ("PARSE_ERROR",)
    else:
        res = [k for k in wynik["steps"] if k.get("type") == "result"][-1]
        x = parsuj_rozwiazanie_tex(res.get("solution_tex"))
        assert x == [Fraction(-1, 3)]


def test_wiersz_zerowy_wiele_rozwiazan():
    M = [
        ["1", "0", "1"],
        ["0", "0", "0"],
    ]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    res = [k for k in wynik["steps"] if k.get("type") == "result"][-1]
    assert "nieskończenie wiele" in (res.get("desc_tex") or "").lower()


def test_puste_stringi_traktowane_jako_zero():
    M = [
        ["", "1", "2"],
        ["1", "1", "3"],
    ]
    wynik = gauss_steps(M)
    assert "error" not in wynik
    kroki = wynik["steps"]
    assert kroki and kroki[0]["aug"][0][0] in ("0", "0/1")

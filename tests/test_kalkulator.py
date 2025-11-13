import re

def test_widok_kalkulator_laduje(klient):
    r = klient.get("/kalkulator/")
    assert r.status_code == 200

    html = r.data.decode("utf-8")
    assert 'id="gauss-kroki-root"' in html
    assert 'id="przycisk-wyczysc"' in html
    assert 'id="przycisk-rozwiaz"' in html
    assert '<select id="rozmiar-ukladu"' in html or "Rozmiar układu" in html
    assert 'shared/gauss-kroki.js' in html
    assert 'kalkulator/static/js/kalkulator.js' in html
    assert 'shared/gauss-kroki.css' in html
    assert 'kalkulator/static/css/kalkulator.css' in html


def test_widok_ma_script_i_linki(klient):
    r = klient.get("/kalkulator/")
    html = r.data.decode("utf-8").lower()
    assert html.count("<script") >= 2
    assert html.count("<link") >= 2


def test_widok_teksty_przyciskow(klient):
    r = klient.get("/kalkulator/")
    html = r.data.decode("utf-8")
    assert "Rozwiąż" in html
    assert "Wyczyść" in html


def test_widok_select_ma_podstawowe_opcje(klient):
    r = klient.get("/kalkulator/")
    html = r.data.decode("utf-8")
    low = html.lower()
    assert ("<select" in low) or ("rozmiar" in low)


def test_widok_gauss_kroki_root_unikalny(klient):
    r = klient.get("/kalkulator/")
    html = r.data.decode("utf-8")
    wystapienia = len(re.findall(r'id="gauss-kroki-root"', html))
    assert wystapienia >= 1
    assert wystapienia == 1


def test_widok_wzmianka_o_api(klient):
    r = klient.get("/kalkulator/")
    html = r.data.decode("utf-8")
    assert 'shared/gauss-kroki.js' in html and 'kalkulator/static/js/kalkulator.js' in html


def test_widok_post_nieobslugiwany(klient):
    r = klient.post("/kalkulator/")
    assert r.status_code in (400, 405)

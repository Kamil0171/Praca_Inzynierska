import json
import pytest


def postuj(klient, dane, content_type="application/json"):
    return klient.post("/api/gauss/kroki", data=json.dumps(dane), content_type=content_type)


def test_api_poprawne_200(klient, macierze_poprawne):
    r = postuj(klient, {"matrix": macierze_poprawne["prosty_2x2"]})
    assert r.status_code == 200
    body = r.get_json()
    assert "steps" in body and isinstance(body["steps"], list) and body["steps"]


@pytest.mark.parametrize("payload, oczekiwany_kod, oczekiwany_error", [
    ("{zly json", 400, "BAD_JSON"),
    ({}, 400, "NO_MATRIX"),
    ({"matrix": [["1", "2"], ["3", "4", "5"]]}, 400, "BAD_SHAPE"),
    ({"matrix": [["a", "1", "2"], ["1", "2", "3"]]}, 400, "PARSE_ERROR"),
])
def test_api_bledy_wejscia(klient, payload, oczekiwany_kod, oczekiwany_error):
    if isinstance(payload, str):
        r = klient.post("/api/gauss/kroki", data=payload, content_type="application/json")
    else:
        r = postuj(klient, payload)
    assert r.status_code == oczekiwany_kod
    body = r.get_json()
    assert body and "error" in body and body["error"]["code"] == oczekiwany_error


def test_api_server_error_symulacja(monkeypatch, klient, macierze_poprawne):
    from api import gauss_api

    def _psuje(*a, **k):
        raise RuntimeError("ups")

    monkeypatch.setattr(gauss_api, "gauss_steps", _psuje)
    r = klient.post("/api/gauss/kroki", json={"matrix": macierze_poprawne["prosty_2x2"]})
    assert r.status_code == 500
    body = r.get_json()
    assert body["error"]["code"] == "SERVER_ERROR"


def test_api_zly_content_type(klient, macierze_poprawne):
    dane = json.dumps({"matrix": macierze_poprawne["prosty_2x2"]})
    r = klient.post("/api/gauss/kroki", data=dane, content_type="text/plain")
    assert r.status_code in (200, 400, 415)
    if r.status_code == 200:
        body = r.get_json()
        assert "steps" in body and body["steps"]


@pytest.mark.parametrize("matrix", [
    [["1", None, "2"], ["1", "1", "3"]],
    [[None, "1", "2"], ["1", "1", "3"]],
    [["1", "1", "2"], ["1", 1, "3"]],
])
def test_api_elementy_null_mieszane_typy(klient, matrix):
    r = postuj(klient, {"matrix": matrix})
    assert r.status_code in (200, 400)
    if r.status_code == 200:
        body = r.get_json()
        assert "steps" in body and body["steps"]
    else:
        body = r.get_json()
        assert "error" in body


def test_api_liczby_z_przecinkiem(klient):
    M = [["0,5", "1", "2"], ["1", "1,5", "3"]]
    r = postuj(klient, {"matrix": M})
    assert r.status_code == 200
    body = r.get_json()
    assert "steps" in body and body["steps"]


def test_api_minimalny_1x2(klient):
    M = [["3", "6"]]
    r = postuj(klient, {"matrix": M})
    assert r.status_code == 200
    steps = r.get_json()["steps"]
    assert any(k.get("type") == "result" for k in steps)


def test_api_puste_body(klient):
    r = klient.post("/api/gauss/kroki", data="", content_type="application/json")
    assert r.status_code == 400
    body = r.get_json(silent=True)
    if body:
        assert "error" in body

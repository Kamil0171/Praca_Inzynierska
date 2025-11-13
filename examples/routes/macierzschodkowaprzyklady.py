from flask import Blueprint, render_template

przyklady_bp = Blueprint(
    "przyklady",
    __name__,
    template_folder="../templates",
    static_folder="../static",
    url_prefix="/przyklady"
)

def przykladowe_macierze():
    M1 = [
        [1, 1, 3],
        [2, 2, 6],
        [-5, -5, -15],
    ]

    M2 = [
        [2, 4, -2],
        [4, 9, -1],
        [6, 15, 1],
    ]

    M3 = [
        [1, 1, 1],
        [2, 3, 5],
        [3, 5, 10],
        [4, 4, 12],
    ]

    M4 = [
        [2, 1, 3, -1],
        [4, 3, 7, 1],
        [6, 5, 11, -1],
        [8, 7, 15, 1],
    ]

    M5 = [
        [2, 1, 3, 1],
        [6, 4, 10, 2],
        [4, 5, 7, 5],
        [8, 9, 13, 9],
    ]

    macierze = [M1, M2, M3, M4, M5]
    macierze.sort(key=lambda A: (len(A), len(A[0]) if A else 0))
    return macierze

@przyklady_bp.route("/macierzschodkowa")
@przyklady_bp.route("/macierzschodkowa/")
def widok_macierz_schodkowa_przyklady():
    macierze = przykladowe_macierze()
    return render_template(
        "macierzschodkowaprzyklady.html",
        macierze=macierze
    )

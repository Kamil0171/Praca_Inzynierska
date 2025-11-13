from flask import Blueprint, render_template, redirect, url_for

gauss_przyklady_bp = Blueprint(
    "gauss_przyklady",
    __name__,
    template_folder="../templates",
    static_folder="../static",
    url_prefix="/przyklady"
)

def przykladowe_uklady():
    uklady = [
        r"""\begin{cases}
x_1 + x_2 + 2x_4 = 11\\
2x_2 - x_3 + x_4 = 5\\
3x_3 + 6x_4 = 33\\
4x_4 = 16
\end{cases}""",

        r"""\begin{cases}
x_1 + 2x_2 - x_3 = 3\\
2x_1 - x_2 + 2x_3 = 2\\
- x_1 - 3x_2 + x_3 = 4
\end{cases}""",

        r"""\begin{cases}
x_1 - x_2 + x_3 + x_4 = 7\\
2x_2 + x_3 - 3x_4 = 1\\
5x_3 - 10x_4 = 20\\
6x_4 = 12
\end{cases}""",

        r"""\begin{cases}
2x_1 + x_2 + x_3 - x_4 = 3\\
-3x_2 + 2x_3 + x_4 = -5\\
4x_3 + 8x_4 = 40\\
5x_4 = 25
\end{cases}""",

        r"""\begin{cases}
x_1 + x_2 + x_3 + x_4 + x_5 = 15\\
2x_2 - x_3 + x_4 + 2x_5 = 8\\
3x_3 + 6x_4 - 3x_5 = 18\\
4x_4 - 2x_5 = 12\\
5x_5 = 20
\end{cases}"""
    ]
    return uklady

@gauss_przyklady_bp.route("/gaussprzyklady")
@gauss_przyklady_bp.route("/gaussprzyklady/")
def widok_gauss_przyklady():
    uklady = przykladowe_uklady()
    return render_template("gaussprzyklady.html", uklady=uklady)

@gauss_przyklady_bp.route("/")
def przyklady_redirect():
    return redirect(url_for(".widok_gauss_przyklady"))

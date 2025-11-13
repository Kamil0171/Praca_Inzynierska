from flask import render_template
from . import kalkulator_bp

@kalkulator_bp.get("/")
def indeks():
    return render_template("kalkulator.html")

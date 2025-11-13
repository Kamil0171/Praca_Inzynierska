from flask import Flask, render_template
from routes import macierzschodkowa_bp
from examples.routes import przyklady_bp, gauss_przyklady_bp, gauss_rozwiaz_bp
from calculator.routes import kalkulator_bp
from api import api_bp

import examples.routes.mschprozwiaz

aplikacja = Flask(__name__)

aplikacja.register_blueprint(macierzschodkowa_bp)
aplikacja.register_blueprint(przyklady_bp)
aplikacja.register_blueprint(gauss_przyklady_bp)
aplikacja.register_blueprint(gauss_rozwiaz_bp)
aplikacja.register_blueprint(kalkulator_bp, url_prefix="/kalkulator")
aplikacja.register_blueprint(api_bp, url_prefix="/api")

@aplikacja.route("/")
def glowna():
    return render_template("glowna.html")

@aplikacja.route("/gauss")
def gauss():
    return render_template("gauss.html")

if __name__ == "__main__":
    aplikacja.run(debug=True)

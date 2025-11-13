from flask import Blueprint

kalkulator_bp = Blueprint(
    "kalkulator",
    __name__,
    url_prefix="/kalkulator",
    template_folder="../templates",
    static_folder="../static",
)

from . import kalkulator

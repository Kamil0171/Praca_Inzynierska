from flask import Blueprint, render_template
import numpy as np

macierzschodkowa_bp = Blueprint('macierzschodkowa', __name__)

@macierzschodkowa_bp.route('/macierzschodkowa')
def widok_macierzy_schodkowej():
    macierze_przykladowe = [
        np.array([[1, 2],
                  [0, 1]]),

        np.array([[1, 0, 2],
                  [0, 1, 2],
                  [0, 0, 0],
                  [0, 0, 0],
                  [0, 0, 0]]),

        np.array([[1, 0, 2, 4, 5],
                  [0, 1, 5, 3, 2],
                  [0, 0, 1, 3, 5],
                  [0, 0, 0, 1, 2],
                  [0, 0, 0, 0, 1]]),

        np.array([[5, 4, 1, 0, 6, 5, 6],
                  [0, 0, 4, 1, 5, 4, 3],
                  [0, 0, 0, 3, 6, 5, 4],
                  [0, 0, 0, 0, 1, 0, 9],
                  [0, 0, 0, 0, 0, 0, 2]]),

        np.array([[5, -1, 0, 11],
                  [0, -5, 7, 0],
                  [0, 0, 0, 3]]),
    ]
    macierze_przykladowe.sort(key=lambda m: (m.shape[0], m.shape[1]))

    macierze_nieschodkowe = [
        np.array([[1, 0, 2],
                  [0, 0, 0],
                  [0, 0, 1],
                  [0, 0, 0],
                  [0, 0, 0]]),

        np.array([[5, 8, -3, -2],
                  [0, 0, 0, 1],
                  [0, 0, 1, 3]]),

        np.array([[1, 0],
                  [2, 1]]),

        np.array([[0, 2, 3],
                  [0, 0, 1],
                  [1, 0, 0]]),

        np.array([[0, 1, 2],
                  [0, 0, 0],
                  [0, 3, 4]])
    ]
    macierze_nieschodkowe.sort(key=lambda m: (m.shape[0], m.shape[1]))

    macierze_zredukowane = [
        np.array([[1, 0, 0],
                  [0, 1, 0],
                  [0, 0, 1]]),

        np.array([[1, 0, 0, 0],
                  [0, 1, 0, 3],
                  [0, 0, 1, 5]]),

        np.array([[1, 0, 0, 2],
                  [0, 1, 0, 1],
                  [0, 0, 1, 0],
                  [0, 0, 0, 0]]),

        np.array([[1, 0, 0, 0, 0],
                  [0, 0, 1, 0, 4],
                  [0, 0, 0, 0, 0]]),

        np.array([[1, 0, 0],
                  [0, 1, 0],
                  [0, 0, 1],
                  [0, 0, 0],
                  [0, 0, 0]])
    ]
    macierze_zredukowane.sort(key=lambda m: (m.shape[0], m.shape[1]))

    return render_template(
        'macierzschodkowa.html',
        macierze=macierze_przykladowe,
        macierze_nieschodkowe=macierze_nieschodkowe,
        macierze_zredukowane=macierze_zredukowane
    )

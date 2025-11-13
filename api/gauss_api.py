from flask import request, jsonify
from . import api_bp
from core.gauss import gauss_steps

@api_bp.post("/gauss/kroki")
def gauss_kroki():
    try:
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        return jsonify({"error": {"code": "BAD_JSON", "message": str(e)}}), 400

    matrix = (data or {}).get("matrix")
    if not matrix:
        return jsonify({"error": {"code": "NO_MATRIX", "message": "Brak pola 'matrix'."}}), 400

    try:
        result = gauss_steps(matrix)
        if "error" in result:
            code = result["error"].get("code", "")
            status = 400 if code in ("PARSE_ERROR", "BAD_SHAPE") else 500
            return jsonify(result), status
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": {"code": "SERVER_ERROR", "message": str(e)}}), 500

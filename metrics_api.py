"""
S4 Ledger — Defense Record Metrics API
Flask API for tracking and categorizing XRPL-anchored defense logistics records.
"""

from flask import Flask, jsonify, request
from datetime import datetime, timezone
import hashlib

app = Flask(__name__)

# ─── Defense Record Categories ────────────────────────────────────────────────
RECORD_CATEGORIES = {
    "SUPPLY_CHAIN":     {"label": "Supply Chain Receipt",   "icon": "📦", "color": "#00aaff"},
    "MAINTENANCE_3M":   {"label": "Maintenance 3-M",        "icon": "🔧", "color": "#ffd700"},
    "CDRL":             {"label": "CDRL Delivery",          "icon": "📄", "color": "#8ea4b8"},
    "ORDNANCE_LOT":     {"label": "Ordnance Lot",          "icon": "💣", "color": "#ff6b6b"},
    "CONFIG_BASELINE":  {"label": "Config Baseline",        "icon": "⚙️", "color": "#c9a84c"},
    "CUSTODY_TRANSFER": {"label": "Custody Transfer",       "icon": "🔄", "color": "#14f195"},
    "TDP":              {"label": "Technical Data Package",  "icon": "📐", "color": "#9945ff"},
    "COC":              {"label": "Certificate of Conformance", "icon": "✅", "color": "#00cc88"},
    "DEPOT_REPAIR":     {"label": "Depot Repair",           "icon": "🏭", "color": "#ff9933"},
    "INSPECTION":       {"label": "Inspection Report",      "icon": "🔍", "color": "#66ccff"},
    "CONDITION":        {"label": "Condition Assessment",    "icon": "📋", "color": "#cc99ff"},
    "FIELDING":         {"label": "Equipment Fielding",     "icon": "🚢", "color": "#00ddaa"},
    "CONTRACT":         {"label": "Contract Deliverable",   "icon": "📝", "color": "#ffcc44"},
    "DISPOSAL":         {"label": "Disposal / DRMO",        "icon": "🗑️", "color": "#999999"},
    "CALIBRATION":      {"label": "TMDE Calibration",       "icon": "📏", "color": "#ff66aa"},
    "PROVISIONING":     {"label": "Provisioning",           "icon": "📊", "color": "#4488ff"},
    "TRAINING":         {"label": "Training Record",        "icon": "🎓", "color": "#33cc99"},
    "MOD_KIT":          {"label": "Mod Kit Install",        "icon": "🔩", "color": "#dd8844"},
    "CASREP":           {"label": "CASREP",                 "icon": "⚠️", "color": "#ff3333"},
    "QDR":              {"label": "Quality Defect Report",  "icon": "🚫", "color": "#cc0000"},
    "READINESS":        {"label": "Readiness Report",       "icon": "📈", "color": "#00ff88"},
    "LOGISTICS":        {"label": "Logistics Transfer",     "icon": "🚛", "color": "#4466cc"},
}


def categorize_record(memo_text: str) -> str:
    """Categorize a defense record based on its memo content."""
    memo_upper = memo_text.upper()
    for key in RECORD_CATEGORIES:
        if key in memo_upper:
            return key

    # Keyword detection fallback
    keyword_map = {
        "SUPPLY_CHAIN": ["nsn", "receipt", "valve", "received", "warehouse", "depot"],
        "MAINTENANCE_3M": ["mrc", "oil sample", "pms", "maintenance", "sked"],
        "CDRL": ["cdrl", "contractor data", "technical manual"],
        "ORDNANCE_LOT": ["dodic", "ordnance", "ammunition", "round", "magazine"],
        "CONFIG_BASELINE": ["baseline", "cdmd-oa", "configuration"],
        "CUSTODY_TRANSFER": ["custody", "transfer", "chain of", "tamper seal"],
        "DEPOT_REPAIR": ["overhaul", "depot repair", "frc"],
        "INSPECTION": ["insurv", "inspection", "material condition"],
        "CALIBRATION": ["calibration", "metcal", "tmde"],
        "CASREP": ["casrep", "casualty report"],
        "QDR": ["qdr", "quality defect", "counterfeit", "non-conforming"],
    }

    memo_lower = memo_text.lower()
    for category, keywords in keyword_map.items():
        if any(kw in memo_lower for kw in keywords):
            return category

    return "GENERAL"


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Return defense record metrics summary."""
    return jsonify({
        "total_records": 0,
        "categories": RECORD_CATEGORIES,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note": "Connect to XRPL node for live transaction data",
    })


@app.route("/api/categorize", methods=["POST"])
def categorize():
    """Categorize a record based on memo content."""
    data = request.json
    memo = data.get("memo", "")
    cat = categorize_record(memo)
    return jsonify({"category": cat, "label": RECORD_CATEGORIES.get(cat, {}).get("label", "General")})


@app.route("/api/hash", methods=["POST"])
def compute_hash():
    """Compute SHA-256 hash of provided record text."""
    data = request.json
    record_text = data.get("record", "")
    h = hashlib.sha256(record_text.encode()).hexdigest()
    return jsonify({"hash": h, "algorithm": "SHA-256"})


if __name__ == "__main__":
    app.run(port=5001, debug=True)

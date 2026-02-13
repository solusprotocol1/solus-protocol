"""S4 Ledger — Partner API Example (Defense Logistics Integration)
Flask REST API for partner systems (GCSS, DPAS, DLA) to anchor and verify defense records.
"""

from flask import Flask, request, jsonify
from s4_sdk import S4SDK

app = Flask(__name__)
sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)


@app.route("/anchor", methods=["POST"])
def anchor_record():
    """Anchor a defense logistics record to XRPL."""
    data = request.json
    result = sdk.anchor_record(
        record_text=data["record"],
        encrypt_first=data.get("encrypt", True),
        record_type=data.get("record_type", "SUPPLY_CHAIN"),
    )
    return jsonify({"hash": result["hash"], "record_type": result.get("record_type"), "status": "anchored"})


@app.route("/verify", methods=["POST"])
def verify_record():
    """Verify a defense record hash."""
    data = request.json
    computed = sdk.create_record_hash(data["record"])
    match = computed.lower() == data.get("expected_hash", "").lower()
    return jsonify({"computed_hash": computed, "match": match})


@app.route("/audit", methods=["GET"])
def get_audit_log():
    """Return a placeholder audit log entry."""
    return jsonify({
        "message": "Audit endpoint — integrate with S4LedgerDLRS.get_audit_trail() for full trail",
        "sdk_version": "3.0",
    })


if __name__ == "__main__":
    app.run(port=5001, debug=True)

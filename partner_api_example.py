from flask import Flask, request, jsonify
from s4_sdk import S4SDK

app = Flask(__name__)
sdk = S4SDK(wallet_seed="sEdYourTestnetSeedHere", testnet=True)

@app.route('/anchor', methods=['POST'])
def anchor_record():
    record = request.json.get('record')
    result = sdk.secure_patient_record(record_text=record, encrypt_first=True, fiat_mode=False)
    return jsonify(result)

@app.route('/verify', methods=['POST'])
def verify_record():
    record = request.json.get('record')
    hash_val = sdk.create_record_hash(record)
    return jsonify({'hash': hash_val})

@app.route('/audit', methods=['GET'])
def get_audit_log():
    # Example: return audit log entries
    return jsonify({'log': 'Audit log entries here'})

if __name__ == '__main__':
    app.run(port=5000)

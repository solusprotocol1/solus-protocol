import xrpl
import xrpl.clients
import xrpl.models.requests
import datetime
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Testnet account to query for SDK anchor transactions
XRPL_TESTNET_ACCOUNT = "rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234/"

@app.route('/')
def home():
    return '''
    <html>
        <head><title>Solus Protocol Metrics API</title></head>
        <body>
            <h1>Solus Protocol Metrics API</h1>
            <p>This is the backend API for real-time metrics from the Solus SDK prototype.</p>
            <p>To view metrics data, visit <a href="/metrics">/metrics</a>.</p>
        </body>
    </html>
    '''

@app.route('/metrics')
def get_metrics():
    # Fetch real transaction data from XRPL testnet
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=200)
        response = client.request(req)
        txs = response.result.get("transactions", [])
    except Exception as e:
        return jsonify({"error": f"Failed to fetch XRPL data: {e}"})

    hashes_by_week = {}
    records_by_type = {"Vitals": 0, "Post-Op": 0, "Lab Results": 0, "Imaging": 0, "Discharge": 0, "Other": 0}
    sls_fees = {}
    tx_volume = {}
    total_hashes = 0
    last_hash = None

    for tx in txs:
        tx_obj = tx.get("tx", {})
        # Parse date
        try:
            date = datetime.datetime.fromtimestamp(tx_obj.get("date", 0) + 946684800)
            week = date.strftime("%Y-W%U")
        except Exception:
            week = "Unknown"

        # Check for memo (anchored hash)
        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            # Decode hex memo if present
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except Exception:
                    pass

        # Count hashes anchored (any tx with memo is an anchor)
        if memo_data:
            total_hashes += 1
            hashes_by_week[week] = hashes_by_week.get(week, 0) + 1
            last_hash = memo_data[:64] if len(memo_data) >= 64 else memo_data

            # Categorize by record type (demo: check for keywords)
            if "Vitals" in memo_data or "BP" in memo_data:
                records_by_type["Vitals"] += 1
            elif "Post-Op" in memo_data:
                records_by_type["Post-Op"] += 1
            elif "Lab" in memo_data:
                records_by_type["Lab Results"] += 1
            elif "Imaging" in memo_data or "MRI" in memo_data:
                records_by_type["Imaging"] += 1
            elif "Discharge" in memo_data:
                records_by_type["Discharge"] += 1
            else:
                records_by_type["Other"] += 1

        # Track tx volume and fees
        tx_volume[week] = tx_volume.get(week, 0) + 1
        sls_fees[week] = sls_fees.get(week, 0) + 0.01  # Estimate fee per tx

    metrics = {
        "hashes_by_week": hashes_by_week,
        "records_by_type": records_by_type,
        "sls_fees": sls_fees,
        "tx_volume": tx_volume,
        "total_hashes": total_hashes,
        "last_hash": last_hash
    }
    return jsonify(metrics)

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

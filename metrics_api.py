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
            <p>Endpoints:</p>
            <ul>
                <li><a href="/metrics">/metrics</a> - Aggregated metrics data</li>
                <li><a href="/transactions">/transactions</a> - Recent XRPL transactions</li>
            </ul>
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
    records_by_type = {
        "Vitals": 0, "Post-Op": 0, "Lab Results": 0, "Imaging": 0, 
        "Discharge": 0, "Mental Health": 0, "Emergency": 0, "Prescription": 0,
        "Surgery": 0, "Telemedicine": 0, "Pediatric": 0, "Other": 0
    }
    sls_fees = {}
    tx_volume = {}
    total_hashes = 0
    last_hash = None

    for tx in txs:
        tx_obj = tx.get("tx", {})
        # Parse date - XRPL uses Ripple Epoch (seconds since Jan 1, 2000)
        tx_date = tx_obj.get("date")
        if tx_date and tx_date > 0:
            try:
                date = datetime.datetime.utcfromtimestamp(tx_date + 946684800)
                week = date.strftime("%b %d")  # e.g., "Feb 06"
            except Exception:
                week = "Recent"
        else:
            week = "Recent"

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

            # Categorize by record type - expanded for all medical scenarios
            memo_lower = memo_data.lower()
            if any(kw in memo_lower for kw in ["vitals", "bp", "blood pressure", "heart rate", "temperature"]):
                records_by_type["Vitals"] += 1
            elif any(kw in memo_lower for kw in ["post-op", "postop", "recovery", "follow-up"]):
                records_by_type["Post-Op"] += 1
            elif any(kw in memo_lower for kw in ["lab", "blood test", "urinalysis", "biopsy", "pathology"]):
                records_by_type["Lab Results"] += 1
            elif any(kw in memo_lower for kw in ["imaging", "mri", "ct scan", "x-ray", "xray", "ultrasound", "radiology"]):
                records_by_type["Imaging"] += 1
            elif any(kw in memo_lower for kw in ["discharge", "released", "checkout"]):
                records_by_type["Discharge"] += 1
            elif any(kw in memo_lower for kw in ["mental", "psychiatric", "therapy", "counseling", "anxiety", "depression"]):
                records_by_type["Mental Health"] += 1
            elif any(kw in memo_lower for kw in ["emergency", "er ", "trauma", "urgent", "critical"]):
                records_by_type["Emergency"] += 1
            elif any(kw in memo_lower for kw in ["prescription", "medication", "rx", "drug", "pharmacy"]):
                records_by_type["Prescription"] += 1
            elif any(kw in memo_lower for kw in ["surgery", "operation", "procedure", "anesthesia"]):
                records_by_type["Surgery"] += 1
            elif any(kw in memo_lower for kw in ["telemedicine", "telehealth", "virtual", "remote consult"]):
                records_by_type["Telemedicine"] += 1
            elif any(kw in memo_lower for kw in ["pediatric", "child", "infant", "newborn", "vaccination"]):
                records_by_type["Pediatric"] += 1
            else:
                records_by_type["Other"] += 1

        # Track tx volume and fees
        tx_volume[week] = tx_volume.get(week, 0) + 1
        sls_fees[week] = sls_fees.get(week, 0) + 0.01  # Estimate fee per tx

    # Remove zero-count record types for cleaner display
    records_by_type = {k: v for k, v in records_by_type.items() if v > 0}

    metrics = {
        "hashes_by_week": hashes_by_week,
        "records_by_type": records_by_type,
        "sls_fees": sls_fees,
        "tx_volume": tx_volume,
        "total_hashes": total_hashes,
        "last_hash": last_hash
    }
    return jsonify(metrics)

@app.route('/transactions')
def get_transactions():
    # Fetch recent transactions from XRPL testnet
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=50)
        response = client.request(req)
        txs = response.result.get("transactions", [])
    except Exception as e:
        return jsonify({"error": f"Failed to fetch XRPL data: {e}"})

    transactions = []
    for tx in txs:
        tx_obj = tx.get("tx", {})
        tx_hash = tx_obj.get("hash", "")
        
        # Parse date
        tx_date = tx_obj.get("date")
        if tx_date and tx_date > 0:
            try:
                date = datetime.datetime.utcfromtimestamp(tx_date + 946684800)
                date_str = date.strftime("%Y-%m-%d %H:%M:%S UTC")
            except Exception:
                date_str = "Unknown"
        else:
            date_str = "Unknown"

        # Get memo data (anchored hash)
        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except Exception:
                    pass

        # Only include transactions with memos (anchored records)
        if memo_data:
            transactions.append({
                "hash": tx_hash,
                "date": date_str,
                "memo": memo_data[:64] + "..." if len(memo_data) > 64 else memo_data,
                "explorer_url": f"https://testnet.xrpl.org/transactions/{tx_hash}",
                "account": tx_obj.get("Account", ""),
                "destination": tx_obj.get("Destination", ""),
                "type": tx_obj.get("TransactionType", "")
            })

    return jsonify({"transactions": transactions, "count": len(transactions)})

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

#!/usr/bin/env python3
"""Script to update metrics_api.py and metrics.html with granular time support"""

metrics_api_content = '''import xrpl
import xrpl.clients
import xrpl.models.requests
import datetime
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

XRPL_TESTNET_ACCOUNT = "rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234/"

@app.route('/')
def home():
    return '<h1>S4 Ledger Metrics API</h1><p><a href="/metrics">/metrics</a> | <a href="/transactions">/transactions</a></p>'

def categorize_record(memo_data):
    memo_lower = memo_data.lower()
    if any(kw in memo_lower for kw in ["vitals", "bp", "blood pressure", "heart rate", "temperature"]):
        return "Vitals"
    elif any(kw in memo_lower for kw in ["post-op", "postop", "recovery", "follow-up"]):
        return "Post-Op"
    elif any(kw in memo_lower for kw in ["lab", "blood test", "urinalysis", "biopsy", "pathology", "cbc", "hemoglobin"]):
        return "Lab Results"
    elif any(kw in memo_lower for kw in ["imaging", "mri", "ct scan", "x-ray", "xray", "ultrasound", "radiology"]):
        return "Imaging"
    elif any(kw in memo_lower for kw in ["discharge", "released", "checkout"]):
        return "Discharge"
    elif any(kw in memo_lower for kw in ["mental", "psychiatric", "therapy", "counseling", "anxiety", "depression"]):
        return "Mental Health"
    elif any(kw in memo_lower for kw in ["emergency", "er ", "trauma", "urgent", "critical"]):
        return "Emergency"
    elif any(kw in memo_lower for kw in ["prescription", "medication", "rx", "drug", "pharmacy"]):
        return "Prescription"
    elif any(kw in memo_lower for kw in ["surgery", "operation", "procedure", "anesthesia"]):
        return "Surgery"
    elif any(kw in memo_lower for kw in ["telemedicine", "telehealth", "virtual", "remote consult"]):
        return "Telemedicine"
    elif any(kw in memo_lower for kw in ["pediatric", "child", "infant", "newborn", "vaccination"]):
        return "Pediatric"
    else:
        return "Other"

@app.route('/metrics')
def get_metrics():
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=200)
        response = client.request(req)
        txs = response.result.get("transactions", [])
    except Exception as e:
        return jsonify({"error": f"Failed to fetch XRPL data: {e}"})

    individual_records = []
    records_by_type = {}
    total_hashes = 0
    last_hash = None

    for tx in txs:
        tx_obj = tx.get("tx", {})
        tx_hash = tx_obj.get("hash", "")
        tx_date = tx_obj.get("date")
        
        if tx_date and tx_date > 0:
            try:
                timestamp = tx_date + 946684800
                date = datetime.datetime.utcfromtimestamp(timestamp)
                date_iso = date.isoformat() + "Z"
                date_display = date.strftime("%b %d, %H:%M:%S")
                date_minute = date.strftime("%H:%M")
                date_hour = date.strftime("%b %d %H:00")
                date_day = date.strftime("%b %d")
                date_week = date.strftime("%Y-W%U")
                date_month = date.strftime("%b %Y")
            except:
                date_iso = date_display = date_minute = date_hour = date_day = date_week = date_month = "Unknown"
        else:
            date_iso = date_display = date_minute = date_hour = date_day = date_week = date_month = "Unknown"

        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except:
                    pass

        if memo_data:
            total_hashes += 1
            last_hash = memo_data[:64] if len(memo_data) >= 64 else memo_data
            record_type = categorize_record(memo_data)
            records_by_type[record_type] = records_by_type.get(record_type, 0) + 1
            
            individual_records.append({
                "timestamp_iso": date_iso,
                "timestamp_display": date_display,
                "minute": date_minute,
                "hour": date_hour,
                "day": date_day,
                "week": date_week,
                "month": date_month,
                "hash": memo_data[:32] + "..." if len(memo_data) > 32 else memo_data,
                "tx_hash": tx_hash,
                "record_type": record_type,
                "fee": 0.01
            })

    individual_records.sort(key=lambda x: x["timestamp_iso"] or "", reverse=False)
    
    def aggregate_by(records, key):
        agg = {}
        for r in records:
            k = r.get(key, "Unknown")
            agg[k] = agg.get(k, 0) + 1
        return agg
    
    def aggregate_fees_by(records, key):
        agg = {}
        for r in records:
            k = r.get(key, "Unknown")
            agg[k] = agg.get(k, 0) + r.get("fee", 0.01)
        return agg

    return jsonify({
        "individual_records": individual_records,
        "hashes_by_minute": aggregate_by(individual_records, "minute"),
        "hashes_by_hour": aggregate_by(individual_records, "hour"),
        "hashes_by_day": aggregate_by(individual_records, "day"),
        "hashes_by_week": aggregate_by(individual_records, "week"),
        "hashes_by_month": aggregate_by(individual_records, "month"),
        "fees_by_minute": aggregate_fees_by(individual_records, "minute"),
        "fees_by_hour": aggregate_fees_by(individual_records, "hour"),
        "fees_by_day": aggregate_fees_by(individual_records, "day"),
        "fees_by_week": aggregate_fees_by(individual_records, "week"),
        "fees_by_month": aggregate_fees_by(individual_records, "month"),
        "records_by_type": records_by_type,
        "total_hashes": total_hashes,
        "last_hash": last_hash,
        "total_fees": round(total_hashes * 0.01, 4)
    })

@app.route('/transactions')
def get_transactions():
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
        tx_date = tx_obj.get("date")
        
        if tx_date and tx_date > 0:
            try:
                date = datetime.datetime.utcfromtimestamp(tx_date + 946684800)
                date_str = date.strftime("%Y-%m-%d %H:%M:%S UTC")
            except:
                date_str = "Unknown"
        else:
            date_str = "Unknown"

        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except:
                    pass

        if memo_data:
            transactions.append({
                "hash": tx_hash,
                "date": date_str,
                "memo": memo_data[:64] + "..." if len(memo_data) > 64 else memo_data,
                "explorer_url": f"https://testnet.xrpl.org/transactions/{tx_hash}",
                "record_type": categorize_record(memo_data)
            })

    return jsonify({"transactions": transactions, "count": len(transactions)})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
'''

metrics_html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S4 Ledger | Metrics & Network Activity</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { background: #050608; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; }
        .container { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
        .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(20,241,149,0.2); border-radius: 12px; padding: 32px; margin-bottom: 32px; }
        h1, h2, h3 { color: #14f195; }
        .nav-link { color: #9945ff; }
        .filter-btn { background: rgba(20,241,149,0.2); color: #14f195; border: 1px solid #14f195; border-radius: 6px; padding: 6px 12px; margin: 4px; cursor: pointer; transition: all 0.2s; }
        .filter-btn:hover { background: rgba(20,241,149,0.4); }
        .filter-btn.active { background: #14f195; color: #050608; font-weight: bold; }
        .stat-box { background: rgba(20,241,149,0.1); border: 1px solid rgba(20,241,149,0.3); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; }
        .stat-value { font-size: 2.5rem; font-weight: bold; color: #14f195; }
        .stat-label { font-size: 0.9rem; color: #aaa; }
        .recent-table { width: 100%; margin-top: 20px; }
        .recent-table th { color: #14f195; padding: 10px; border-bottom: 1px solid rgba(20,241,149,0.3); text-align: left; }
        .recent-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .badge-type { background: #9945ff; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
        .refresh-info { color: #666; font-size: 0.8rem; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">S4 Ledger Metrics & Network Activity</h1>
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="stat-box">
                    <div class="stat-value" id="totalHashes">-</div>
                    <div class="stat-label">Total Hashes Anchored</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-box">
                    <div class="stat-value" id="totalFees">-</div>
                    <div class="stat-label">Total $SLS Fees</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-box">
                    <div class="stat-value" id="recordTypes">-</div>
                    <div class="stat-label">Record Types</div>
                </div>
            </div>
        </div>
        <div class="card">
            <h2>Hash Anchoring Over Time</h2>
            <p style="color:#888;">Each bar represents hashes anchored during that time period</p>
            <div class="mb-3" id="hashBtns">
                <button class="filter-btn active" data-view="minute">Per Minute</button>
                <button class="filter-btn" data-view="hour">Per Hour</button>
                <button class="filter-btn" data-view="day">Daily</button>
                <button class="filter-btn" data-view="week">Weekly</button>
                <button class="filter-btn" data-view="month">Monthly</button>
            </div>
            <canvas id="hashChart" height="100"></canvas>
        </div>
        <div class="card">
            <h2>Records Secured Breakdown</h2>
            <p style="color:#888;">Distribution of record types anchored to XRPL</p>
            <canvas id="recordChart" height="100"></canvas>
        </div>
        <div class="card">
            <h2>$SLS Fee Activity</h2>
            <p style="color:#888;">Fees collected per time period (0.01 $SLS per anchor)</p>
            <div class="mb-3" id="feeBtns">
                <button class="filter-btn active" data-view="minute">Per Minute</button>
                <button class="filter-btn" data-view="hour">Per Hour</button>
                <button class="filter-btn" data-view="day">Daily</button>
                <button class="filter-btn" data-view="week">Weekly</button>
                <button class="filter-btn" data-view="month">Monthly</button>
            </div>
            <canvas id="feeChart" height="100"></canvas>
        </div>
        <div class="card">
            <h2>XRPL Transaction Volume</h2>
            <p style="color:#888;">Number of transactions per time period</p>
            <div class="mb-3" id="txBtns">
                <button class="filter-btn active" data-view="minute">Per Minute</button>
                <button class="filter-btn" data-view="hour">Per Hour</button>
                <button class="filter-btn" data-view="day">Daily</button>
                <button class="filter-btn" data-view="week">Weekly</button>
                <button class="filter-btn" data-view="month">Monthly</button>
            </div>
            <canvas id="txChart" height="100"></canvas>
        </div>
        <div class="card">
            <h2>Recent Anchored Records</h2>
            <p style="color:#888;">Individual records with exact timestamps</p>
            <table class="recent-table">
                <thead><tr><th>Timestamp</th><th>Record Type</th><th>Hash (truncated)</th><th>Fee</th></tr></thead>
                <tbody id="recentBody"><tr><td colspan="4" style="text-align:center;color:#666;">Loading...</td></tr></tbody>
            </table>
            <p class="refresh-info">Auto-refreshes every 30 seconds</p>
        </div>
        <div class="text-center mt-5">
            <a href="transactions.html" class="nav-link">View Full XRPL Transactions</a><br><br>
            <a href="index.html" class="nav-link">Back to S4 Ledger Home</a>
        </div>
    </div>
    <script>
        let metricsData = null;
        let hashChart, recordChart, feeChart, txChart;
        let currentHashView = 'minute', currentFeeView = 'minute', currentTxView = 'minute';

        async function loadMetrics() {
            try {
                const response = await fetch('https://s4ledger.onrender.com/metrics');
                metricsData = await response.json();
                document.getElementById('totalHashes').textContent = metricsData.total_hashes || 0;
                document.getElementById('totalFees').textContent = (metricsData.total_fees || 0).toFixed(2);
                document.getElementById('recordTypes').textContent = Object.keys(metricsData.records_by_type || {}).length;
                renderHashChart(currentHashView);
                renderRecordChart();
                renderFeeChart(currentFeeView);
                renderTxChart(currentTxView);
                renderRecentTable();
            } catch (err) {
                console.error('Failed to load metrics:', err);
            }
        }

        function getDataForView(baseKey, view) {
            return metricsData[baseKey + '_by_' + view] || {};
        }

        function renderHashChart(view) {
            const data = getDataForView('hashes', view);
            const labels = Object.keys(data);
            const values = Object.values(data);
            const ctx = document.getElementById('hashChart').getContext('2d');
            if (hashChart) hashChart.destroy();
            hashChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: labels.length ? labels : ['No data'], datasets: [{ label: 'Hashes', data: values.length ? values : [0], backgroundColor: '#14f195', borderRadius: 4 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#222' }, ticks: { color: '#888' } }, y: { grid: { color: '#222' }, ticks: { color: '#888', stepSize: 1 }, beginAtZero: true } } }
            });
        }

        function renderRecordChart() {
            const data = metricsData.records_by_type || {};
            const labels = Object.keys(data);
            const values = Object.values(data);
            const colors = ['#14f195', '#9945ff', '#ff4757', '#ffa502', '#3742fa', '#2ed573', '#ff6b81', '#70a1ff', '#eccc68', '#a29bfe', '#fd79a8', '#00cec9'];
            const ctx = document.getElementById('recordChart').getContext('2d');
            if (recordChart) recordChart.destroy();
            recordChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: labels.length ? labels : ['No records'], datasets: [{ data: values.length ? values : [1], backgroundColor: labels.length ? colors.slice(0, labels.length) : ['#333'], borderWidth: 0 }] },
                options: { responsive: true, plugins: { legend: { display: true, position: 'right', labels: { color: '#fff' } } } }
            });
        }

        function renderFeeChart(view) {
            const data = getDataForView('fees', view);
            const labels = Object.keys(data);
            const values = Object.values(data);
            const ctx = document.getElementById('feeChart').getContext('2d');
            if (feeChart) feeChart.destroy();
            feeChart = new Chart(ctx, {
                type: 'line',
                data: { labels: labels.length ? labels : ['No data'], datasets: [{ label: '$SLS Fees', data: values.length ? values : [0], borderColor: '#9945ff', backgroundColor: 'rgba(153,69,255,0.2)', fill: true, tension: 0.3, pointRadius: 6, pointBackgroundColor: '#9945ff' }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#222' }, ticks: { color: '#888' } }, y: { grid: { color: '#222' }, ticks: { color: '#888' }, beginAtZero: true } } }
            });
        }

        function renderTxChart(view) {
            const data = getDataForView('hashes', view);
            const labels = Object.keys(data);
            const values = Object.values(data);
            const ctx = document.getElementById('txChart').getContext('2d');
            if (txChart) txChart.destroy();
            txChart = new Chart(ctx, {
                type: 'line',
                data: { labels: labels.length ? labels : ['No data'], datasets: [{ label: 'Transactions', data: values.length ? values : [0], borderColor: '#ff4757', backgroundColor: 'rgba(255,71,87,0.2)', fill: true, tension: 0.3, pointRadius: 6, pointBackgroundColor: '#ff4757' }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#222' }, ticks: { color: '#888' } }, y: { grid: { color: '#222' }, ticks: { color: '#888', stepSize: 1 }, beginAtZero: true } } }
            });
        }

        function renderRecentTable() {
            const records = metricsData.individual_records || [];
            const tbody = document.getElementById('recentBody');
            if (records.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">No records found</td></tr>'; return; }
            const recentRecords = [...records].reverse().slice(0, 20);
            tbody.innerHTML = recentRecords.map(r => '<tr><td style="color:#14f195;">' + r.timestamp_display + '</td><td><span class="badge-type">' + r.record_type + '</span></td><td style="font-family:monospace;font-size:0.85rem;color:#888;">' + r.hash + '</td><td style="color:#9945ff;">$' + r.fee.toFixed(2) + '</td></tr>').join('');
        }

        document.getElementById('hashBtns').addEventListener('click', e => { if (e.target.dataset.view) { currentHashView = e.target.dataset.view; document.querySelectorAll('#hashBtns .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentHashView)); renderHashChart(currentHashView); } });
        document.getElementById('feeBtns').addEventListener('click', e => { if (e.target.dataset.view) { currentFeeView = e.target.dataset.view; document.querySelectorAll('#feeBtns .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentFeeView)); renderFeeChart(currentFeeView); } });
        document.getElementById('txBtns').addEventListener('click', e => { if (e.target.dataset.view) { currentTxView = e.target.dataset.view; document.querySelectorAll('#txBtns .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.view === currentTxView)); renderTxChart(currentTxView); } });

        window.addEventListener('DOMContentLoaded', loadMetrics);
        setInterval(loadMetrics, 30000);
    </script>
</body>
</html>
'''

# Write the files
with open('/Users/nickfrankfort/Desktop/solus-testing/solus-protocol/metrics_api.py', 'w') as f:
    f.write(metrics_api_content)
    
with open('/Users/nickfrankfort/Desktop/solus-testing/solus-protocol/metrics.html', 'w') as f:
    f.write(metrics_html_content)

print("Files updated successfully!")

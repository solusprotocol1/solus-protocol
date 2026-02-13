"""
S4 Ledger — Defense Supply Chain Anomaly Detection Module
Real-time monitoring of logistics metrics with configurable thresholds
and automatic XRPL hash anchoring of anomaly alerts.
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from s4_sdk import S4SDK

# ─── Monitored Metrics ────────────────────────────────────────────────────────
METRIC_TYPES = {
    "lead_time":          {"unit": "days",    "desc": "Order-to-receipt lead time"},
    "cost_variance":      {"unit": "%",       "desc": "Actual vs budgeted cost variance"},
    "quality_defect_rate":{"unit": "%",       "desc": "Defect rate per lot"},
    "inventory_level":    {"unit": "EA",      "desc": "On-hand inventory quantity"},
    "demand_rate":        {"unit": "EA/mo",   "desc": "Monthly demand signal"},
    "mtbf":               {"unit": "hours",   "desc": "Mean Time Between Failures"},
    "repair_turnaround":  {"unit": "days",    "desc": "Depot repair turnaround time"},
    "backorder_age":      {"unit": "days",    "desc": "Age of outstanding backorders"},
    "readiness_rate":     {"unit": "%",       "desc": "Material readiness (Ao)"},
    "counterfeit_score":  {"unit": "0-100",   "desc": "Counterfeit risk score (AI model)"},
}

# ─── Default Thresholds ───────────────────────────────────────────────────────
DEFAULT_THRESHOLDS = {
    "lead_time":           {"warning": 90,  "critical": 180, "direction": "above"},
    "cost_variance":       {"warning": 15,  "critical": 30,  "direction": "above"},
    "quality_defect_rate": {"warning": 2.0, "critical": 5.0, "direction": "above"},
    "inventory_level":     {"warning": 10,  "critical": 5,   "direction": "below"},
    "demand_rate":         {"warning": 50,  "critical": 100, "direction": "above"},
    "mtbf":                {"warning": 500, "critical": 200, "direction": "below"},
    "repair_turnaround":   {"warning": 60,  "critical": 120, "direction": "above"},
    "backorder_age":       {"warning": 90,  "critical": 180, "direction": "above"},
    "readiness_rate":      {"warning": 80,  "critical": 60,  "direction": "below"},
    "counterfeit_score":   {"warning": 50,  "critical": 75,  "direction": "above"},
}

# ─── Data Source Integrations ─────────────────────────────────────────────────
LOGISTICS_SYSTEMS = {
    "gcss_army":  {"name": "GCSS-Army",       "api": "/api/v1/gcss/metrics"},
    "dla":        {"name": "DLA EBS",          "api": "/api/v1/dla/metrics"},
    "navsup":     {"name": "NAVSUP ONE TOUCH", "api": "/api/v1/navsup/metrics"},
    "dpas":       {"name": "DPAS",             "api": "/api/v1/dpas/metrics"},
    "fedmall":    {"name": "FedMall",          "api": "/api/v1/fedmall/metrics"},
    "piee":       {"name": "PIEE/WAWF",        "api": "/api/v1/piee/metrics"},
}


class AnomalyAlert:
    """Represents a detected supply chain anomaly."""
    def __init__(self, metric: str, value: float, threshold: float,
                 severity: str, nsn: str = "", detail: str = ""):
        self.alert_id = f"ALT-{uuid.uuid4().hex[:10].upper()}"
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.metric = metric
        self.value = value
        self.threshold = threshold
        self.severity = severity  # "warning" or "critical"
        self.nsn = nsn
        self.detail = detail
        self.anchored = False
        self.tx_hash = None

    def to_dict(self):
        return {
            "alert_id": self.alert_id,
            "timestamp": self.timestamp,
            "metric": self.metric,
            "metric_desc": METRIC_TYPES.get(self.metric, {}).get("desc", ""),
            "value": self.value,
            "threshold": self.threshold,
            "severity": self.severity,
            "nsn": self.nsn,
            "detail": self.detail,
            "anchored": self.anchored,
            "tx_hash": self.tx_hash,
        }


class S4AnomalyEngine:
    """Supply chain anomaly detection engine with XRPL anchoring."""

    def __init__(self, sdk: S4SDK | None = None, wallet_seed: str | None = None,
                 testnet: bool = True, thresholds: dict | None = None):
        self.sdk = sdk or S4SDK(wallet_seed=wallet_seed, testnet=testnet)
        self.wallet_seed = wallet_seed or getattr(self.sdk, "wallet_seed", None)
        self.thresholds = thresholds or dict(DEFAULT_THRESHOLDS)
        self.alerts: list[AnomalyAlert] = []
        self.readings: list[dict] = []

    def set_threshold(self, metric: str, warning: float, critical: float, direction: str = "above"):
        self.thresholds[metric] = {"warning": warning, "critical": critical, "direction": direction}

    def ingest_reading(self, metric: str, value: float, nsn: str = "",
                       source: str = "", detail: str = "", anchor_alerts: bool = True) -> AnomalyAlert | None:
        """Ingest a metric reading and check for anomalies."""
        if metric not in METRIC_TYPES:
            raise ValueError(f"Unknown metric: {metric}")

        self.readings.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metric": metric, "value": value, "nsn": nsn, "source": source,
        })

        thresh = self.thresholds.get(metric)
        if not thresh:
            return None

        severity = None
        direction = thresh.get("direction", "above")

        if direction == "above":
            if value >= thresh["critical"]:
                severity = "critical"
            elif value >= thresh["warning"]:
                severity = "warning"
        else:  # below
            if value <= thresh["critical"]:
                severity = "critical"
            elif value <= thresh["warning"]:
                severity = "warning"

        if severity:
            threshold_val = thresh["critical"] if severity == "critical" else thresh["warning"]
            alert = AnomalyAlert(metric, value, threshold_val, severity, nsn, detail)

            if anchor_alerts and self.wallet_seed:
                try:
                    tx = self.sdk.anchor_record(
                        record_text=json.dumps(alert.to_dict(), sort_keys=True),
                        wallet_seed=self.wallet_seed,
                        encrypt_first=True,
                        record_type=f"ANOMALY_{severity.upper()}",
                    )
                    alert.anchored = True
                    alert.tx_hash = tx.get("hash")
                except Exception:
                    pass

            self.alerts.append(alert)
            return alert
        return None

    def get_alerts(self, metric: str | None = None, severity: str | None = None, nsn: str | None = None):
        alerts = self.alerts
        if metric:
            alerts = [a for a in alerts if a.metric == metric]
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        if nsn:
            alerts = [a for a in alerts if a.nsn == nsn]
        return [a.to_dict() for a in alerts]

    def get_stats(self):
        return {
            "total_readings": len(self.readings),
            "total_alerts": len(self.alerts),
            "warnings": sum(1 for a in self.alerts if a.severity == "warning"),
            "criticals": sum(1 for a in self.alerts if a.severity == "critical"),
            "anchored": sum(1 for a in self.alerts if a.anchored),
            "by_metric": {
                m: sum(1 for a in self.alerts if a.metric == m)
                for m in METRIC_TYPES if any(a.metric == m for a in self.alerts)
            },
        }


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  S4 LEDGER — ANOMALY DETECTION ENGINE SELF-TEST")
    print("=" * 60)

    sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)
    engine = S4AnomalyEngine(sdk=sdk, wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS")

    # Simulate readings
    scenarios = [
        ("lead_time", 45,  "5340-01-234-5678", "Normal lead time"),
        ("lead_time", 95,  "5340-01-234-5678", "Slow supplier"),
        ("lead_time", 200, "5340-01-234-5678", "Critical delay — potential production stoppage"),
        ("cost_variance", 8, "2815-01-448-8234", "Minor overrun"),
        ("cost_variance", 35, "2815-01-448-8234", "Significant cost overrun — contract review needed"),
        ("quality_defect_rate", 0.5, "5310-01-234-5678", "Within spec"),
        ("quality_defect_rate", 6.0, "5310-01-234-5678", "Critical defect rate — suspect counterfeit"),
        ("readiness_rate", 92, "DDG-118", "Fleet average"),
        ("readiness_rate", 58, "DDG-78", "Below readiness threshold — cascading maintenance issues"),
        ("counterfeit_score", 82, "5310-01-234-5678", "AI model: high counterfeit probability"),
        ("inventory_level", 3, "1305-01-299-5564", "Below safety stock — reorder triggered"),
        ("mtbf", 180, "2815-01-448-8234", "Degraded reliability — schedule overhaul"),
    ]

    for metric, value, nsn, detail in scenarios:
        alert = engine.ingest_reading(metric, value, nsn=nsn, detail=detail, anchor_alerts=True)
        status = f"⚠️  {alert.severity.upper()}" if alert else "✅ Normal"
        unit = METRIC_TYPES[metric]["unit"]
        print(f"  {metric:25s} = {value:>8} {unit:6s} ({nsn}) → {status}")

    stats = engine.get_stats()
    print(f"\n📊 {stats['total_readings']} readings, {stats['total_alerts']} alerts "
          f"({stats['warnings']} warn, {stats['criticals']} crit), {stats['anchored']} anchored")
    print("=" * 60)

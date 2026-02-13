#!/usr/bin/env python3
"""S4 Ledger — 10 quick defense record tests (6-second delays)."""

from s4_sdk import S4SDK
import time

sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)

scenarios = [
    ("Supply Chain",    "SUPPLY_CHAIN",     "NSN 5340-01-234-5678 | Valve, Gate | Qty 50 | Cond A"),
    ("Maintenance",     "MAINTENANCE_3M",   "MRC 2815-1.3.7 | Oil sample | SAT"),
    ("CDRL",            "CDRL",             "A003 | Tech Manual Rev 4.2 | Accepted"),
    ("Ordnance",        "ORDNANCE_LOT",     "DODIC A059 | 250K rds | PASS"),
    ("Config",          "CONFIG_BASELINE",  "CS Baseline Rev 4.2.1 | CDMD-OA"),
    ("Custody",         "CUSTODY_TRANSFER", "SPY module | DDG-78 → NAVSEA IMA"),
    ("Calibration",     "CALIBRATION",      "AN/USM-486 | Cal complete"),
    ("Contract CLIN",   "CONTRACT",         "CLIN 0003 | 50 EA | WAWF accepted"),
    ("Fielding",        "FIELDING",         "SEWIP Block III | IOT&E passed"),
    ("Disposal",        "DISPOSAL",         "500 EA condemned | DRMO turn-in"),
]

print("🔒 S4 LEDGER — QUICK DEFENSE TEST (10 SCENARIOS)")
print("=" * 50)
for i, (name, rtype, record) in enumerate(scenarios):
    print(f"[{i+1:2d}/10] {name}")
    try:
        result = sdk.anchor_record(record, encrypt_first=True, record_type=rtype)
        print(f"  ✅ {result['hash'][:24]}...")
    except Exception as e:
        print(f"  ❌ {e}")
    time.sleep(6)
print("\n✅ All 10 quick defense tests complete.")

#!/usr/bin/env python3
"""S4 Ledger — 12 defense scenarios with 30-second delays (rate-limit safe)."""

from s4_sdk import S4SDK
import time

sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)

scenarios = [
    ("Supply Chain", "SUPPLY_CHAIN", "NSN 5340-01-234-5678 | Qty: 50 | Condition: A | NNSY"),
    ("Maintenance 3-M", "MAINTENANCE_3M", "MRC 2815-1.3.7 | Oil sample | Results: SAT"),
    ("Depot Repair", "DEPOT_REPAIR", "SPY-TM-2019-04472 | Overhaul started | FRC SE"),
    ("CDRL Delivery", "CDRL", "CDRL A003 | Tech Manual Rev 4.2 | Accepted"),
    ("Ordnance Lot", "ORDNANCE_LOT", "DODIC A059 | 250K rds | Lot WCC-2025-1147-A"),
    ("Config Baseline", "CONFIG_BASELINE", "DDG-118 CS Baseline Rev 4.2.1 | CDMD-OA"),
    ("Calibration", "CALIBRATION", "AN/USM-486 | Cal complete | METCAL compliant"),
    ("Custody Transfer", "CUSTODY_TRANSFER", "SPY module | DDG-78 → NAVSEA IMA"),
    ("Certificate of Conformance", "COC", "CoC-NNSY-2026-0451 | MIL-STD-1916"),
    ("Inspection", "INSPECTION", "INSURV DDG-118 | Overall: SAT"),
    ("Equipment Fielding", "FIELDING", "SEWIP Block III | DDG-118 | IOT&E passed"),
    ("Training Record", "TRAINING", "ET1 Cooper | NEC 1420 | SPY-1D Qual"),
]

print("🔒 S4 LEDGER — 12 DEFENSE SCENARIOS (30-SECOND DELAYS)")
print("=" * 55)
for i, (name, rtype, record) in enumerate(scenarios):
    print(f"[{i+1:2d}/12] {name}")
    try:
        result = sdk.anchor_record(record, encrypt_first=True, record_type=rtype)
        print(f"  ✅ {result['hash'][:24]}...")
    except Exception as e:
        print(f"  ❌ {e}")
    if i < len(scenarios) - 1:
        print("  ⏳ Waiting 30 seconds...")
        time.sleep(30)
print("\n✅ All 12 defense scenarios complete.")

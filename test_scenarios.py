#!/usr/bin/env python3
"""S4 Ledger — 12 defense logistics test scenarios."""

from s4_sdk import S4SDK
import time

sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)

scenarios = [
    ("Supply Chain Receipt",   "NSN 5340-01-234-5678 | Valve, Gate | Qty 50 | Cond A | NNSY | QA-237"),
    ("Maintenance 3-M",        "MRC 2815-1.3.7 | Oil sample analysis | SAT | DDG-118 | Next 2026-08"),
    ("CDRL Delivery",          "CDRL A003 | Tech Manual Rev 4.2 | Contract N00024-23-C-5501 | Accepted"),
    ("Ordnance Lot",           "DODIC A059 | 5.56mm Ball M855 | Lot WCC-2025-1147-A | 250K rds | PASS"),
    ("Depot Repair",           "SPY-TM-2019-04472 | Transmitter overhaul | FRC Southeast | 45 day est"),
    ("Config Baseline",        "DDG-118 Combat System Baseline Rev 4.2.1 | CDMD-OA verified"),
    ("Equipment Fielding",     "SEWIP Block III AN/SLQ-32(V)6 | DDG-118 | IOT&E passed 2026-02-08"),
    ("Calibration",            "AN/USM-486 Multimeter | SN 2020-3345 | METCAL compliant | Next 2026-08"),
    ("Custody Transfer",       "SPY-TM-2019-04472 | From DDG-78 | To NAVSEA IMA | Tamper seal applied"),
    ("Contract CLIN",          "CLIN 0003 | 50 EA Valves | N00024-23-C-5501 | WAWF | $7,137.50"),
    ("Disposal",               "NSN 5310-01-111-2222 | 500 EA | Condemned | DRMO turn-in | DD 1348-1A"),
    ("Training Qualification", "ET1 Cooper | NEC 1420 | SPY-1D Maintenance Qual | FLTMPS | Exp 2028-02"),
]

def run_all_scenarios():
    print("=" * 65)
    print("  🔒 S4 LEDGER — DEFENSE RECORD ANCHORING TEST (12 SCENARIOS)")
    print("=" * 65)
    
    passed = 0
    for i, (name, record) in enumerate(scenarios):
        print(f"\n[{i+1:2d}/12] {name}")
        try:
            result = sdk.anchor_record(record, encrypt_first=True)
            print(f"  ✅ Hash: {result['hash'][:24]}...")
            passed += 1
        except Exception as e:
            print(f"  ❌ Error: {e}")
        time.sleep(5)

    print(f"\n{'=' * 65}")
    print(f"  Results: {passed}/12 passed")
    print(f"{'=' * 65}")


if __name__ == "__main__":
    run_all_scenarios()

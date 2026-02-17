#!/usr/bin/env python3
"""S4 Ledger — 20 typed defense record scenarios with explicit record_type."""

from s4_sdk import S4SDK
import time

sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=False)

scenarios = [
    ("SUPPLY_CHAIN",     "NSN 5340-01-234-5678 | Valve, Gate | Qty: 50 | Condition: A | NNSY"),
    ("MAINTENANCE_3M",   "MRC 2815-1.3.7 | Oil sample analysis | Results: SAT | DDG-118"),
    ("CDRL",             "CDRL A003 | Technical Manual Update Rev 4.2 | Contract N00024-23-C-5501"),
    ("ORDNANCE_LOT",     "DODIC A059 | 5.56mm Ball M855 | Lot WCC-2025-1147-A | 250K rds"),
    ("CONFIG_BASELINE",  "DDG-118 Combat System Baseline Rev 4.2.1 | CDMD-OA verified"),
    ("CUSTODY_TRANSFER", "SPY-TM-2019-04472 | DDG-78 CSO → NAVSEA IMA | Depot repair"),
    ("TDP",              "ILS Technical Data Package | JEDMICS vault #2026-118-001"),
    ("COC",              "CoC-NNSY-2026-0451 | MIL-STD-1916 sampling | Zero defects"),
    ("DEPOT_REPAIR",     "SPY-TM overhaul initiated | FRC Southeast | Est 45 days"),
    ("INSPECTION",       "INSURV material inspection DDG-118 | Overall: SAT"),
    ("CONDITION",        "AN/SPY-1D degraded | Port array intermittent | Recommend depot"),
    ("FIELDING",         "SEWIP Block III AN/SLQ-32(V)6 | DDG-118 | IOT&E passed"),
    ("CONTRACT",         "CLIN 0003 delivered | 50 EA Valves | WAWF accepted | $7,137.50"),
    ("DISPOSAL",         "500 EA condemned fasteners | DRMO | DD Form 1348-1A"),
    ("CALIBRATION",      "AN/USM-486 Multimeter | SN 2020-3345 | Next cal: 2026-08-15"),
    ("PROVISIONING",     "APL update DDG-118 | 47 new line items added"),
    ("PHST",             "MIL-STD-2073 Level A packaging | ESD protected | 42 lbs"),
    ("RELIABILITY",      "LM2500 Fleet MTBF: 4,200 hrs | Ao: 94.2% | RAM-C v3.1"),
    ("TRAINING",         "ET1 Cooper | NEC 1420 SPY-1D Qual | FLTMPS verified"),
    ("MOD_KIT",          "ECP-2026-118-003 | CIWS Block 1B upgrade | NAVSEA verified"),
]

print("🔒 S4 LEDGER — 20 TYPED DEFENSE RECORD SCENARIOS")
print("=" * 65)
for i, (rtype, record) in enumerate(scenarios):
    print(f"[{i+1:2d}/20] {rtype:<20s}", end=" ")
    try:
        result = sdk.anchor_record(record, encrypt_first=True, record_type=rtype)
        print(f"✅ {result['hash'][:20]}...")
    except Exception as e:
        print(f"❌ {e}")
    time.sleep(3)
print("\n✅ All 20 typed defense scenarios complete.")

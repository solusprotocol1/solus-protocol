#!/usr/bin/env python3
"""S4 Ledger — Quick smoke test with 5 defense record types."""

from s4_sdk import S4SDK
import time

wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
sdk = S4SDK(wallet_seed=wallet_seed, testnet=True)

scenarios = [
    ("SUPPLY_CHAIN", "NSN 5340-01-234-5678 | Valve, Gate | Qty: 50 | Condition: A | Depot: NNSY"),
    ("MAINTENANCE_3M", "MRC 2815-1.3.7 | Oil sample analysis | Results: Normal | Next due: 2026-08"),
    ("CDRL", "CDRL A003 | Technical Manual Update | Contract N00024-23-C-5501 | Delivered 2026-02-10"),
    ("CUSTODY_TRANSFER", "SPY-TM-2019-04472 | From DDG-78 | To NAVSEA IMA | Reason: Depot repair"),
    ("ORDNANCE_LOT", "DODIC A059 | Lot WCC-2025-1147 | Qty: 250,000 rds | Storage: WSE Mag 14"),
]

print("🔒 S4 LEDGER — QUICK SMOKE TEST (5 defense record types)")
print("=" * 60)

for i, (rtype, record) in enumerate(scenarios):
    print(f"[{i+1}/5] {rtype}")
    try:
        result = sdk.anchor_record(record, encrypt_first=True, record_type=rtype)
        print(f"  ✅ Hash: {result['hash'][:24]}...")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    time.sleep(2)

print("\nDone — all 5 defense record types tested.")

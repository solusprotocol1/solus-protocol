#!/usr/bin/env python3
"""S4 Ledger — Final 4-scenario defense anchoring test."""

from s4_sdk import S4SDK
import time

sdk = S4SDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    ("Supply Chain Receipt", "SUPPLY_CHAIN | NSN 5340-01-234-5678 | Valve, Gate, Carbon Steel | Qty: 50 | Condition: A | Depot: NNSY | Inspector: QA-237"),
    ("Maintenance 3-M", "MAINTENANCE | MRC 2815-1.3.7 | Oil sample analysis | Results: Normal wear metals | Equipment: LM2500 Gas Turbine | Hull: DDG-118"),
    ("CDRL Delivery", "CDRL | CDRL A003 | Technical Manual Update Rev 4.2 | Contract: N00024-23-C-5501 | Deliverable accepted by COR"),
    ("Ordnance Lot", "ORDNANCE | DODIC A059 | Lot: WCC-2025-1147-A | Qty: 250,000 rds | Proof test: PASS | Storage: Weapons Station Earle Mag 14"),
]

print("🔒 S4 LEDGER — FINAL DEFENSE ANCHORING TEST")
print("=" * 55)
for i, (name, record) in enumerate(scenarios):
    print(f"[{i+1}/{len(scenarios)}] {name}")
    try:
        result = sdk.anchor_record(record, test_seed, encrypt_first=True, fiat_mode=False)
        print(f"  ✅ Hash: {result['hash'][:24]}...")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    time.sleep(5)
print("Done!")

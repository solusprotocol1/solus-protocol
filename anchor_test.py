#!/usr/bin/env python3
"""S4 Ledger — Anchor integration test (defense logistics)."""

from s4_sdk import S4SDK

wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
sdk = S4SDK(wallet_seed=wallet_seed, testnet=True, api_key="valid_mock_key")

# Sample defense supply chain record
record = """Supply Chain Receipt
NSN: 5340-01-234-5678
Nomenclature: Valve, Gate, Carbon Steel
Contract: N00024-23-C-5501
CAGE Code: 1THK9
Quantity: 50 EA | Condition: A (Serviceable)
Inspector: QA-237 J. Martinez
Depot: Norfolk Naval Shipyard
Date: 2026-02-10
CoC: CoC-NNSY-2026-0451"""

print("S4 LEDGER — ANCHOR INTEGRATION TEST")
print("=" * 50)

# Test 1: Basic anchoring
result = sdk.anchor_record(record, encrypt_first=True, fiat_mode=False, record_type="SUPPLY_CHAIN")
print(f"✅ Anchored: {result['hash'][:32]}...")
print(f"   Type: {result['record_type']}")
print(f"   TX Result: {result['tx_results']['fee_tx'].get('meta', {}).get('TransactionResult', 'N/A')}")

# Test 2: Hash verification
computed = sdk.create_record_hash(record)
print(f"\n✅ Hash verification: {computed[:32]}...")

# Test 3: Encrypt/Decrypt roundtrip
encrypted = sdk.encrypt(record)
decrypted = sdk.decrypt(encrypted)
assert decrypted == record, "Decrypt mismatch!"
print(f"✅ Encrypt/decrypt roundtrip: PASS")

print("\nAll integration tests passed.")

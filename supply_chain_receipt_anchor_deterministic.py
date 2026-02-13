# supply_chain_receipt_anchor_deterministic.py
# Re-anchor supply chain receipt with deterministic encryption for verification demo

from s4_sdk import S4SDK
import s4_sdk

wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
s4_sdk.test_seed = wallet_seed

supply_record = """Supply Chain Receipt
NSN: 5340-01-234-5678
Nomenclature: Valve, Gate, Carbon Steel
Contract: N00024-23-C-5501
CAGE Code: 1THK9
Quantity Received: 50 EA
Unit Price: $142.75
Condition Code: A (Serviceable)
Inspection: FAT Pass — Zero defects
Receiving Depot: Norfolk Naval Shipyard (NNSY)
Inspector: QA-237 J. Martinez
Date Received: 2026-02-10
Lot/Batch: LOT-2026-0210-A
Certificate of Conformance: CoC-NNSY-2026-0451
Notes: Full lot accepted per MIL-STD-1916. Stored in controlled humidity warehouse Bay 7."""

sdk = S4SDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"
)

# Deterministically encrypt
encrypted = sdk.encrypt(supply_record)
print("Encrypted text (deterministic):\n", encrypted)

# Anchor the encrypted record
result = sdk.anchor_record(
    record_text=encrypted,
    encrypt_first=False,   # Already encrypted
    fiat_mode=False,
    record_type="SUPPLY_CHAIN"
)
print("Anchored Supply Chain Receipt Result:")
print(result)

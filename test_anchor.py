#!/usr/bin/env python3
"""S4 Ledger — Minimal anchor test (defense record)."""

from s4_sdk import S4SDK

sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)
result = sdk.anchor_record(
    "NSN 2815-01-448-8234 | Engine, Marine Diesel | Qty: 2 | Condition: A | Contract: N00024-23-C-5501",
    encrypt_first=True,
    record_type="SUPPLY_CHAIN",
)
print(f"Hash: {result['hash']}")
print(f"TX:   {result['tx_results']}")

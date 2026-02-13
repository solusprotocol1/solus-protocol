#!/usr/bin/env python3
"""S4 Ledger — Verify a defense record against its XRPL anchor."""

import requests
from s4_sdk import S4SDK

wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
sdk = S4SDK(wallet_seed=wallet_seed, testnet=True)

# Replace with actual values from an anchoring run
RECORD_TEXT = "NSN 5340-01-234-5678 | Qty: 50 | Condition: A | Depot: NNSY"
TX_HASH = "REPLACE_WITH_ACTUAL_TX_HASH"

# 1. Compute hash
computed_hash = sdk.create_record_hash(RECORD_TEXT)
print(f"Computed SHA-256: {computed_hash}")

# 2. Fetch memo from XRPL
try:
    url = f"https://testnet.xrpl.org/api/v1/transactions/{TX_HASH}"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    memos = data.get("transaction", {}).get("Memos", [])
    if memos:
        memo_data = memos[0]["Memo"]["MemoData"]
        print(f"XRPL Memo:       {memo_data}")
        if memo_data.upper() == computed_hash.upper():
            print("\n✅ Record verified — hash matches XRPL memo!")
        else:
            print("\n❌ Verification failed — hash does not match.")
    else:
        print("No memos found in transaction.")
except Exception as e:
    print(f"Could not fetch XRPL transaction: {e}")

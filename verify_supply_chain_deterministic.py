import requests
from s4_sdk import S4SDK

# --- Demo: Verify Supply Chain Receipt (deterministic encryption) ---
# Encrypted text from deterministic SDK output
encrypted_text = "REPLACE_WITH_ACTUAL_ENCRYPTED_OUTPUT"
tx_hash = "REPLACE_WITH_ACTUAL_TX_HASH"
wseed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"

sdk = S4SDK(wallet_seed=wseed, testnet=True)

# 1. Decrypt
decrypted = sdk.decrypt(encrypted_text)
print("Decrypted record:\n", decrypted)

# 2. Recompute hash
recomputed_hash = sdk.create_record_hash(decrypted)
print("Recomputed SHA-256 hash:", recomputed_hash.upper())

# 3. Fetch memo from XRPL Testnet
url = f"https://testnet.xrpl.org/api/v1/transactions/{tx_hash}"
resp = requests.get(url)
data = resp.json()

try:
    memos = data['transaction']['Memos']
    memo_hex = memos[0]['Memo']['MemoData']
    print("Memo from XRPL (hex):", memo_hex)
    if memo_hex.upper() == recomputed_hash.upper():
        print("\n✅ Record verified: Hash matches XRPL memo!")
    else:
        print("\n❌ Verification failed: Hash does not match memo.")
except Exception as e:
    print("Could not fetch or parse memo from XRPL transaction:", e)

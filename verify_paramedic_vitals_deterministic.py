import requests
from s4_sdk import S4SDK

# --- Demo: Paramedic Vitals (Robert Lee, deterministic) ---
# Encrypted text from deterministic SDK output
encrypted_text = "gAAAAABphUwJB1aQ5afZb3iF8EyHDsMsKmdMJKJmA9ooZftxBqwV8K40o5Wt0dqr__7S_-i81_RnTETbpM97yixdWzwU-bd3A-UC2MO_CLEZRjUrAgWxzd5IMqwsfgI00OTPePW_omZ5ofqNsKnDDGhUoBWyBN6EBbQn0HzGCKT1blMFdtMuRCuIRIrtPNsIFdS83UXCbfP21IdrFye6LTGjvrORxgiH6cfZ-Hkh-rXI-0NvBwLn7bUfc2rt10zjmZImes9mP_KMqruOTf9xYMKWR_YIQaOdUIecoLxDPMnguVX9LQYuIisk4RgYkR6qD-End6hOD1_X-nRyKZan0fVmksLhFmoLLTZVzKdQoJbgEY4g-DTfir-kLoluWQdYKglFtSXefudBhaG-XWyMqqcIFMOeVCZrno9U_G4tN38UQvA-OcBIpHpdUaWrr6IITa7Inwe3OuEfVsl9idWmVhXu51HqFyDav7kSYqKliJyj-wCkKoT49fsmKOFyfCThll79oKfr5QFhUivMNls5tFCIYvq_W8pudQ0nHtw8zc_P7NEOoDmJo647kgj4GOU-F145VVL5sZTj"
tx_hash = "DF100917D660835CF4E2BD4C05F807A168ED1142D5C781876A6642EA5D3D792F"
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

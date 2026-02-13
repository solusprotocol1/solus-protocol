import requests
from s4_sdk import S4SDK

# --- Demo: Paramedic Vitals (Robert Lee) ---
# Encrypted text from SDK (see previous output)
encrypted_text = "gAAAAABphUtRvSoLVXxC4iociwesOj780j_QMDOUeEprM1X2bqoVQR-VyM6qREWj-Zl-cVqgDmd9gZNWXJpEENZZ2scfTgPboCDenFjav3xWxNln-AZgsInl5jvYqq65IP8yEm3R8O-YpVfjqrs0M9ho7ZyVvDeqGd972wzUuUWYhY7aoeVa3IRFoxcWnD5xb38E2OvJbU6IbDvlsobRZnJCKLT2HM1vxAgIxe8CzYE1FVqGjdjwVuCUMRGa-6ntFE_qPvgiwGaWZJnHOV70H0jvrBhGBH1VOb26GwlIJ9qUM_fDJepL5yiDDD5TVxKGEsDMmH9THXtPjrQHXYAT_sfGML5242Gcir5krsG21UsBnKbExuoyfzlJJkgrlFqRrdEUNVu2BcPQO1BW92up_7UZfnhrmsKRr5oQlIj9fwu02xNt88dNtMXzFhaPQBKG3ZlSqsGaR12hPkNUZDlXFwlCpWNY-20pVOqUN7R1dOr3y06Q6HpZ8ERk3HAjP5J4-sUKtchGy9xDW02OAWAZUMSr55D_s-96stomI-b-79IAflGnpvOeMsEYSMXM4m97CtAE44nUUlbD"
tx_hash = "F8F17236A851043F3E05BF5AC7FE351F715C751E0E1CFFC4C2380CA59FFB8964"
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

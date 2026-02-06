# record_transfer_anchor.py
# Example: Anchor patient records for secure transfer between providers

from solus_sdk import SolusSDK
import solus_sdk

# Use your real testnet seed (already used in anchor_test.py)
wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
solus_sdk.test_seed = wallet_seed  # Safe workaround for SDK import

transfer_record = """Patient: Michael Johnson
Patient ID: MJ-123456
DOB: 1990-11-10
From Provider: Dr. Elena Vasquez (Nephrologist, Provider B)
To Provider: Dr. Sarah Patel (Transplant Surgeon, Provider A)
Records Summary: Kidney function tests and biopsy results
Test Date: 2026-01-15
GFR: 15 mL/min (stage 5 CKD)
Biopsy: Confirmed glomerulonephritis
Imaging: MRI shows compatible donor match
Notes: Urgent transplant recommended; no contraindications. Prior treatments: Dialysis since 2025-06.
Consent for Transfer: Obtained 2026-02-04; patient authorizes release to Dr. Patel for procedure prep."""

sdk = SolusSDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"  # For fiat_mode if needed
)

result = sdk.secure_patient_record(
    record_text=transfer_record,
    encrypt_first=True,   # Encrypt before sending/anchoring
    fiat_mode=True        # Simulate USD fee for non-crypto providers
)

print("Anchored Record Transfer Result:")
print(result)

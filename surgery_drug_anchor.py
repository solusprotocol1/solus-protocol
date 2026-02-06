# surgery_drug_anchor.py
# Example: Anchor a surgery drug administration record to XRPL

from solus_sdk import SolusSDK
import solus_sdk

# Use your real testnet seed (already used in anchor_test.py)
wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
solus_sdk.test_seed = wallet_seed  # Safe workaround for SDK import

surgery_record = """Patient: Jane Smith
Patient ID: JS-456789
DOB: 1978-09-22
Procedure: Emergency Coronary Artery Bypass Grafting (CABG)
Date/Time: 2026-02-05 14:30 PST
Surgeon: Dr. Alex Rivera
Drug Administered: Epinephrine 1mg IV bolus
Indication: Severe arrhythmia during surgery
Dosage: 1mg
Administration Time: 2026-02-05 14:45 PST
Response: Heart rhythm stabilized within 2 minutes
Notes: Lifesaving intervention; no adverse reactions observed. Verified by anesthesiologist Dr. Kim Lee.
Consent: Obtained verbally due to emergency; documented post-procedure."""

sdk = SolusSDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"  # If using fiat_mode
)

result = sdk.secure_patient_record(
    record_text=surgery_record,
    encrypt_first=True,   # Encrypt PHI before hashing
    fiat_mode=False       # Set to True for simulated USD → $SLS fee
)

print("Anchored Surgery Drug Record Result:")
print(result)

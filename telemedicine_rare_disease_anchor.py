# telemedicine_rare_disease_anchor.py
# Example: Anchor telemedicine consultation records to XRPL for global verification

from s4_sdk import S4SDK

# Override hardcoded test_seed if s4_sdk.py has auto-run example
import s4_sdk
s4_sdk.test_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"  # ← Using your real seed from anchor_test.py

# Your real testnet seed
wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"  # ← Using your real seed

# Fake telemedicine record (collaborative PHI across borders)
telemed_record = """Patient: Emily Chen
Patient ID: EC-112233
DOB: 2010-07-14
Condition: Suspected Ehlers-Danlos Syndrome (rare genetic disorder)
Consultation Date: 2026-02-05 10:00 PST (global video call)
Participants: Dr. Maria Gonzalez (Rural Clinic, USA), Dr. Lars Svensson (Genetics Specialist, Sweden), Dr. Aiko Tanaka (Rheumatologist, Japan)
Findings: Genetic panel shows COL5A1 mutation; hypermobility confirmed via imaging shared securely.
Recommendations: Custom brace fitting, physical therapy protocol, follow-up genetic counseling.
Notes: All data verified and anchored for cross-border compliance; consensus achieved in 45 minutes."""

# Initialize SDK
sdk = S4SDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"  # For fiat_mode if international providers use USD
)

# Secure the record: Encrypt, hash, and anchor with $SLS fee
result = sdk.secure_patient_record(
    record_text=telemed_record,
    encrypt_first=True,   # Encrypt for secure international sharing
    fiat_mode=True        # Simulate USD fee for global accessibility
)

print("Anchored Telemedicine Rare Disease Record Result:")
print(result)

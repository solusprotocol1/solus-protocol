# paramedic_vitals_anchor_deterministic.py
# Re-anchor paramedic vitals with deterministic encryption for verification demo

from solus_sdk import SolusSDK
import solus_sdk

wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
solus_sdk.test_seed = wallet_seed

vitals_record = """Patient: Robert Lee
Patient ID: RL-987654
Incident: Multi-vehicle collision
Date/Time: 2026-02-05 17:45 PST
Paramedic: EMT Jordan Hayes
Vital Signs: HR 110 bpm, BP 90/60 mmHg, SpO2 92%, GCS 10 (E3 V3 M4)
Interventions: IV fluids started, oxygen mask applied, cervical collar placed
Notes: Suspected TBI; rapid transport to trauma center. Data anchored en route for ER prep."""

sdk = SolusSDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"
)

# Deterministically encrypt
encrypted = sdk.encrypt(vitals_record)
print("Encrypted text (deterministic):\n", encrypted)

# Anchor the encrypted record
result = sdk.secure_patient_record(
    record_text=encrypted,
    encrypt_first=False,   # Already encrypted
    fiat_mode=True
)
print("Anchored Paramedic Vitals Record Result:")
print(result)

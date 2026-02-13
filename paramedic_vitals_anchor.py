# paramedic_vitals_anchor.py
# Example: Anchor emergency vital signs to XRPL for ER handover

from s4_sdk import S4SDK
import s4_sdk

# Use your real testnet seed (already used in anchor_test.py)
wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
s4_sdk.test_seed = wallet_seed  # Safe workaround for SDK import

vitals_record = """Patient: Robert Lee
Patient ID: RL-987654
Incident: Multi-vehicle collision
Date/Time: 2026-02-05 17:45 PST
Paramedic: EMT Jordan Hayes
Vital Signs: HR 110 bpm, BP 90/60 mmHg, SpO2 92%, GCS 10 (E3 V3 M4)
Interventions: IV fluids started, oxygen mask applied, cervical collar placed
Notes: Suspected TBI; rapid transport to trauma center. Data anchored en route for ER prep."""

sdk = S4SDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"  # For fiat_mode if paramedics use USD billing
)

result = sdk.secure_patient_record(
    record_text=vitals_record,
    encrypt_first=True,   # Encrypt for secure mobile transmission
    fiat_mode=True        # Simulate USD fee for non-crypto emergency services
)

print("Anchored Paramedic Vitals Record Result:")
print(result)

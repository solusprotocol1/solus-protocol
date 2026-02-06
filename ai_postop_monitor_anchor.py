# ai_postop_monitor_anchor.py
# Example: Anchor AI-analyzed wearable data to XRPL for post-op verification

from solus_sdk import SolusSDK

# Override hardcoded test_seed if solus_sdk.py has auto-run example
import solus_sdk
solus_sdk.test_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"  # ← Using your real seed from anchor_test.py

# Your real testnet seed
wallet_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"  # ← Using your real seed

# Fake AI-analyzed wearable record (IoT-integrated PHI)
postop_record = """Patient: David Ramirez
Patient ID: DR-778899
DOB: 1982-04-30
Procedure: Hip Replacement Surgery (completed 2026-02-03)
Monitoring Period: 2026-02-04 to 2026-02-05
Wearable Device: Fitbit Sense 2 (integrated via API)
AI Analysis: Detected atrial fibrillation episodes (3x, avg duration 5 min); HR peaks at 140 bpm.
Raw Data Summary: Steps: 1,200/day; Sleep: 6 hrs (disrupted); ECG anomalies flagged by AI model (accuracy 95%).
Recommendations: Immediate cardiologist review; prescribe beta-blocker if confirmed.
Notes: AI output anchored for liability and audit; patient notified via app."""

# Initialize SDK
sdk = SolusSDK(
    wallet_seed=wallet_seed,
    testnet=True,
    api_key="valid_mock_key"  # For fiat_mode in hospital billing systems
)

# Secure the record: Encrypt, hash, and anchor with $SLS fee
result = sdk.secure_patient_record(
    record_text=postop_record,
    encrypt_first=True,   # Encrypt sensitive wearable data
    fiat_mode=False       # Set to True for simulated USD in pilot programs
)

print("Anchored AI Post-Op Monitoring Record Result:")
print(result)

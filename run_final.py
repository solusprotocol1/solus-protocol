#!/usr/bin/env python3
from s4_sdk import S4SDK
import time

sdk = S4SDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    ("Prescription Rx", "PRESCRIPTION | Patient: Maria Santos | Medication: Lisinopril 10mg | Sig: Take 1 tablet daily | Prescriber: Dr. Johnson | Pharmacy: CVS"),
    ("Annual Physical", "PREVENTIVE CARE | Patient: Chris Anderson | Annual Physical Exam | All vitals normal | Labs ordered | Wellness visit complete"),    
    ("Consent Form", "INFORMED CONSENT | Patient: Patricia Moore | Procedure: Cardiac Catheterization | Risks discussed | Signature obtained | HIPAA consent"),
    ("Chronic Diabetes", "CHRONIC CARE | Patient: Thomas Reed | Diabetes Management | HbA1c: 6.8% | Goals met | Continue Metformin regimen"),
]

print("Running final 4 scenarios...")
for i, (name, record) in enumerate(scenarios):
    print(f"[{i+1}/{len(scenarios)}] {name}")
    try:
        result = sdk.secure_patient_record(record, test_seed, encrypt_first=True, fiat_mode=False)
        print(f"  SUCCESS: {result['hash'][:24]}...")
    except Exception as e:
        print(f"  ERROR: {e}")
    time.sleep(5)
print("Done!")

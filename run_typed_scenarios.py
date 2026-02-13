#!/usr/bin/env python3
"""
S4 Ledger - Comprehensive Test with Record Type Tagging
Demonstrates full use case: Providers, Patients, EHR Systems
Each record is properly categorized using the record_type parameter
"""

from s4_sdk import S4SDK
import time

sdk = S4SDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

# Comprehensive scenarios with explicit record_type for proper categorization
scenarios = [
    # === PROVIDER USE CASES ===
    ("Surgery Record", "SURGERY", "SURGERY REPORT | Patient: Michael Torres | Procedure: Laparoscopic Cholecystectomy | Surgeon: Dr. Chen | Duration: 52 min"),
    
    ("Vitals Check", "VITALS", "VITALS | Patient: Sarah Johnson | BP: 118/76 mmHg | HR: 72 bpm | Temp: 98.4F | SpO2: 99% | Recorded by: RN Martinez"),
    
    ("Lab Results", "LAB", "LAB RESULTS | Patient: David Kim | CBC Complete Blood Count | WBC: 7.2 | RBC: 4.8 | Hemoglobin: 14.5"),
    
    ("Drug Allergy", "ALLERGY", "ALLERGY ALERT | Patient: Emma Wilson | Drug Allergy: Penicillin | Reaction: Anaphylaxis | Severity: CRITICAL"),
    
    ("MRI Study", "IMAGING", "IMAGING REPORT | Patient: Robert Garcia | MRI Brain with Contrast | Findings: No acute intracranial abnormality"),
    
    ("Immunization", "IMMUNIZATION", "IMMUNIZATION | Patient: Baby Olivia | Vaccine: DTaP, IPV, Hep B, PCV13 | No adverse reaction"),
    
    # === PATIENT SECURE MESSAGES ===
    ("Patient Message 1", "PATIENT_MESSAGE", "PATIENT MESSAGE | From: Jennifer Adams | To: Dr. Smith | Subject: Medication Side Effects | Sent via Patient Portal"),
    
    ("Patient Question", "PATIENT_MESSAGE", "SECURE MESSAGE | Patient: Mark Thompson | Subject: New Symptoms Request | Requesting appointment via MyChart"),
    
    ("Patient Follow-up", "MESSAGE", "PATIENT MESSAGE | From: Linda Chen | To: Cardiology Team | Question: Can I resume exercise after stress test?"),
    
    # === EHR SYSTEM INTEGRATIONS ===
    ("Epic Integration", "EPIC", "EPIC MYCHART | System: Epic EHR | Hospital: Memorial Health | Provider: Dr. Williams | HIPAA compliant"),
    
    ("Oracle Health", "ORACLE_HEALTH", "ORACLE HEALTH (Cerner) | Facility: St. Mary's Hospital | Progress Note | Provider: NP Anderson"),
    
    ("Meditech Sync", "MEDITECH", "MEDITECH EHR | Facility: Regional Medical Center | Lab Interface | HL7 FHIR compliant"),
    
    # === CARE COORDINATION ===
    ("Care Plan", "CARE_PLAN", "CARE PLAN | Patient: George Martinez | Diagnosis: Type 2 Diabetes | Goals: HbA1c < 7% | Care Team: Dr. Lee, RN Smith"),
    
    ("Referral", "REFERRAL", "REFERRAL | Patient: Nancy Brown | From: PCP Dr. Miller | To: Cardiology | Reason: Chest pain evaluation"),
    
    ("Discharge", "DISCHARGE", "DISCHARGE SUMMARY | Patient: William Davis | Admitted: Pneumonia | LOS: 4 days | Follow-up: PCP in 1 week"),
    
    # === SPECIALTY CARE ===
    ("Mental Health", "MENTAL_HEALTH", "MENTAL HEALTH | Patient ID: 445566 | Therapy Session #12 | Type: CBT | Progress: Good | Anxiety improving"),
    
    ("Emergency Visit", "EMERGENCY", "EMERGENCY DEPT | Patient: Jason Wright | Chief Complaint: Chest Pain | Diagnosis: Costochondritis | Discharged stable"),
    
    ("Prescription", "PRESCRIPTION", "PRESCRIPTION | Patient: Maria Santos | Medication: Lisinopril 10mg | Qty: 90 | Refills: 3 | Prescriber: Dr. Johnson"),
    
    # === PREVENTIVE & WELLNESS ===
    ("Annual Physical", "PREVENTIVE", "PREVENTIVE CARE | Patient: Chris Anderson | Annual Physical Exam | All vitals normal | Wellness visit complete"),
    
    ("Consent Form", "CONSENT", "INFORMED CONSENT | Patient: Patricia Moore | Procedure: Cardiac Catheterization | Risks discussed | Signature obtained"),
]

print("=" * 70)
print("S4 LEDGER - COMPREHENSIVE RECORD TYPE DEMO")
print("=" * 70)
print(f"Total scenarios: {len(scenarios)}")
print("Demonstrates: Providers, Patients, Epic, Oracle Health, Meditech")
print("Record Types: Surgery, Vitals, Labs, Allergies, Imaging, Immunizations,")
print("              Patient Messages, EHR, Care Plans, Referrals, Discharge,")
print("              Mental Health, Emergency, Prescriptions, Preventive, Consent")
print("Delay: 5 seconds between each anchor")
print("=" * 70)

success_count = 0
for i, (name, record_type, record) in enumerate(scenarios):
    print(f"\n[{i+1}/{len(scenarios)}] {name} ({record_type})")
    try:
        result = sdk.secure_patient_record(
            record, 
            test_seed, 
            encrypt_first=True, 
            fiat_mode=False,
            record_type=record_type  # Pass the record type for proper categorization
        )
        print(f"  ✅ SUCCESS: {result['hash'][:24]}...")
        success_count += 1
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
    
    if i < len(scenarios) - 1:
        print(f"  ⏳ Waiting 5 seconds...")
        time.sleep(5)

print("\n" + "=" * 70)
print(f"COMPLETE! {success_count}/{len(scenarios)} records anchored successfully")
print("=" * 70)
print("\n📊 View metrics: https://s4ledger.com/metrics.html")
print("🔗 View transactions: https://s4ledger.com/transactions.html")
print("\nRecord types demonstrated:")
print("  ✓ Provider records (Surgery, Labs, Imaging, Vitals, Allergies)")
print("  ✓ Patient secure messages to providers (via Patient Portal)")
print("  ✓ EHR integrations (Epic, Oracle Health, Meditech)")
print("  ✓ Care coordination (Care Plans, Referrals, Discharge)")
print("  ✓ Specialty care (Mental Health, Emergency, Prescriptions)")
print("  ✓ Preventive care and Consent documentation")

#!/usr/bin/env python3
"""
Solus Protocol - Comprehensive Medical Record Scenarios
Covers: Providers, Patients, EHR Systems (Epic, Oracle Health, Cerner, etc.)
20 diverse scenarios demonstrating full healthcare use cases
"""

from solus_sdk import SolusSDK
import time

sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

# Comprehensive scenarios covering all use cases
scenarios = [
    # === PROVIDER USE CASES ===
    ("Surgery Record", "SURGERY REPORT | Patient: Michael Torres | Procedure: Laparoscopic Cholecystectomy | Surgeon: Dr. Chen | Duration: 52 min | Anesthesia: General | Outcome: Successful | No complications"),
    
    ("Vitals Check", "VITALS | Patient: Sarah Johnson | BP: 118/76 mmHg | HR: 72 bpm | Temp: 98.4F | SpO2: 99% | Weight: 145 lbs | Recorded by: RN Martinez"),
    
    ("Lab Results CBC", "LAB RESULTS | Patient: David Kim | CBC Complete Blood Count | WBC: 7.2 | RBC: 4.8 | Hemoglobin: 14.5 | Platelets: 245K | Status: Within normal limits"),
    
    ("Drug Allergy Alert", "ALLERGY DOCUMENTATION | Patient: Emma Wilson | Drug Allergy: Penicillin | Reaction: Anaphylaxis | Severity: Severe | Added by: Dr. Patel | CRITICAL - DO NOT PRESCRIBE"),
    
    ("MRI Imaging Study", "IMAGING REPORT | Patient: Robert Garcia | MRI Brain with Contrast | Findings: No acute intracranial abnormality | Impression: Normal study | Radiologist: Dr. Thompson"),
    
    ("Immunization Record", "IMMUNIZATION | Patient: Baby Olivia (6 months) | Vaccine: DTaP, IPV, Hep B, PCV13 | Lot#: VX2026-445 | Site: Right thigh IM | No adverse reaction | Administered by: RN Davis"),
    
    # === PATIENT SECURE MESSAGES ===
    ("Patient Message", "PATIENT MESSAGE to Provider | From: Jennifer Adams | To: Dr. Smith | Subject: Medication Side Effects | Message: I've been experiencing dizziness since starting the new blood pressure medication. Should I be concerned? | Sent via Patient Portal"),
    
    ("Patient Symptom Report", "PATIENT MESSAGE | From: Mark Thompson | Subject: New Symptoms | I've had persistent headaches for 3 days and some nausea. Requesting appointment. | Sent via MyChart Patient Portal"),
    
    ("Patient Follow-up Question", "SECURE MESSAGE | Patient: Linda Chen | To: Cardiology Team | Question: Can I resume exercise after my stress test results came back normal? | Awaiting provider response"),
    
    # === EHR SYSTEM INTEGRATIONS ===
    ("Epic EHR Integration", "EPIC MYCHART | System: Epic EHR | Hospital: Memorial Health | Record Type: Clinical Note | Provider: Dr. Williams | Patient encounter documented | HIPAA compliant transmission"),
    
    ("Oracle Health Record", "ORACLE HEALTH (Cerner) | Facility: St. Mary's Hospital | Clinical Documentation | Progress Note | Provider: NP Anderson | Assessment and Plan documented | Millennium system sync"),
    
    ("Meditech Integration", "MEDITECH EHR | Facility: Regional Medical Center | Lab Interface | Orders transmitted | Results received | HL7 FHIR compliant | Audit trail complete"),
    
    # === CARE COORDINATION ===
    ("Care Plan Update", "CARE PLAN | Patient: George Martinez | Diagnosis: Type 2 Diabetes | Goals: HbA1c < 7%, Weight loss 10 lbs | Interventions: Diet counseling, Metformin 500mg BID | Care Team: Dr. Lee, RN Smith, Dietitian Jones"),
    
    ("Referral to Specialist", "REFERRAL | Patient: Nancy Brown | From: PCP Dr. Miller | To: Cardiology - Dr. Heart | Reason: Chest pain evaluation | Urgency: Routine | Insurance pre-auth obtained"),
    
    ("Discharge Summary", "DISCHARGE SUMMARY | Patient: William Davis | Admitted: Pneumonia | LOS: 4 days | Discharge Medications: Azithromycin, Albuterol | Follow-up: PCP in 1 week | Transition of care complete"),
    
    # === SPECIALTY CARE ===
    ("Mental Health Session", "MENTAL HEALTH | Patient: Anonymous (MRN: 445566) | Therapy Session #12 | Type: CBT | Provider: Licensed Counselor Morgan | Progress: Good | Anxiety symptoms improving | Next session: 2 weeks"),
    
    ("Emergency Room Visit", "EMERGENCY DEPARTMENT | Patient: Jason Wright | Chief Complaint: Chest Pain | Triage: Level 2 | EKG: Normal sinus | Troponin: Negative x2 | Diagnosis: Costochondritis | Discharged stable"),
    
    ("Prescription Medication", "PRESCRIPTION | Patient: Maria Santos | Medication: Lisinopril 10mg | Sig: Take 1 tablet by mouth daily | Qty: 90 | Refills: 3 | Prescriber: Dr. Johnson | Pharmacy: CVS #4521"),
    
    # === PREVENTIVE & WELLNESS ===
    ("Annual Physical Exam", "PREVENTIVE CARE | Patient: Chris Anderson | Annual Physical Exam | Age: 45 | All vitals normal | Labs ordered: Lipid panel, CMP, TSH | Screening: Colonoscopy due | Wellness visit complete"),
    
    ("Consent Documentation", "INFORMED CONSENT | Patient: Patricia Moore | Procedure: Cardiac Catheterization | Risks discussed | Patient questions answered | Signature obtained | Witness: RN Thompson | HIPAA authorization included"),
]

print("=" * 70)
print("SOLUS PROTOCOL - COMPREHENSIVE MEDICAL RECORD ANCHORING")
print("=" * 70)
print(f"Total scenarios: {len(scenarios)}")
print("Record types: Surgery, Vitals, Labs, Allergies, Imaging, Immunizations,")
print("              Patient Messages, EHR Integrations, Care Plans, Referrals,")
print("              Discharge, Mental Health, Emergency, Prescriptions, Preventive, Consent")
print("Use cases: Providers, Patients, Epic, Oracle Health, Meditech, Cerner")
print("Delay between scenarios: 5 seconds")
print("=" * 70)

success_count = 0
for i, (name, record) in enumerate(scenarios):
    print(f"\n[{i+1}/{len(scenarios)}] Anchoring: {name}")
    try:
        result = sdk.secure_patient_record(record, test_seed, encrypt_first=True, fiat_mode=False)
        print(f"  ✅ SUCCESS: {result['hash'][:32]}...")
        success_count += 1
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
    
    if i < len(scenarios) - 1:
        print(f"  ⏳ Waiting 5 seconds...")
        time.sleep(5)

print("\n" + "=" * 70)
print(f"COMPLETE! {success_count}/{len(scenarios)} scenarios anchored successfully")
print("=" * 70)
print("\n📊 View metrics: https://solusprotocol.com/metrics.html")
print("🔗 View transactions: https://solusprotocol.com/transactions.html")
print("\nRecord types demonstrated:")
print("  • Provider records (Surgery, Labs, Imaging, Vitals, etc.)")
print("  • Patient secure messages to providers")
print("  • EHR integrations (Epic, Oracle Health, Meditech)")
print("  • Care coordination (Care Plans, Referrals, Discharge)")
print("  • Specialty care (Mental Health, Emergency, Prescriptions)")
print("  • Preventive care and Consent documentation")

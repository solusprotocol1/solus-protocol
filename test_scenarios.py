"""
S4 Ledger SDK - Test Scenarios
Run these scenarios to populate your metrics dashboard with various medical record types.
Each scenario anchors a different type of medical record to the XRPL.
"""

from s4_sdk import S4SDK

# Initialize SDK with testnet credentials
sdk = S4SDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

# Test scenarios for different medical record types
scenarios = [
    {
        "name": "Vitals Check",
        "record": "Patient: Jane Smith\nVitals: BP 118/76, Heart Rate 72 bpm, Temperature 98.6F\nVisit: 2026-02-06\nNotes: Routine vitals check, all normal"
    },
    {
        "name": "Post-Op Recovery",
        "record": "Patient: Robert Johnson\nPost-Op Day 3\nSurgery: Appendectomy\nRecovery Status: Good, no complications\nPain Level: 3/10\nFollow-up scheduled"
    },
    {
        "name": "Lab Results",
        "record": "Patient: Emily Davis\nLab Test: Complete Blood Count (CBC)\nResults: WBC 7.2, RBC 4.8, Hemoglobin 14.2\nStatus: All values within normal range\nDate: 2026-02-06"
    },
    {
        "name": "Imaging Study",
        "record": "Patient: Michael Brown\nImaging: MRI Brain Scan\nFindings: No abnormalities detected\nRadiology Report: Clear, no lesions or masses\nDate: 2026-02-06"
    },
    {
        "name": "Discharge Summary",
        "record": "Patient: Sarah Wilson\nDischarge Date: 2026-02-06\nAdmission Reason: Pneumonia\nTreatment: IV antibiotics, respiratory therapy\nDischarge Status: Recovered, follow-up in 2 weeks"
    },
    {
        "name": "Mental Health Assessment",
        "record": "Patient: David Lee\nMental Health Evaluation\nDiagnosis: Generalized Anxiety Disorder\nTreatment Plan: CBT therapy, medication review\nCounseling sessions scheduled"
    },
    {
        "name": "Emergency Room Visit",
        "record": "Patient: Amanda Garcia\nEmergency Room Visit\nChief Complaint: Chest pain, shortness of breath\nDiagnosis: Panic attack, cardiac workup negative\nDisposition: Discharged with follow-up"
    },
    {
        "name": "Prescription Record",
        "record": "Patient: James Martinez\nPrescription: Lisinopril 10mg\nMedication for: Hypertension\nInstructions: Take once daily\nPharmacy: CVS, filled 2026-02-06"
    },
    {
        "name": "Surgical Procedure",
        "record": "Patient: Lisa Anderson\nSurgery: Laparoscopic Cholecystectomy\nAnesthesia: General\nProcedure Duration: 45 minutes\nOutcome: Successful, no complications"
    },
    {
        "name": "Telemedicine Consult",
        "record": "Patient: Kevin Thomas\nTelemedicine Visit\nVirtual Consultation for: Skin rash evaluation\nDiagnosis: Contact dermatitis\nTreatment: Topical steroid cream prescribed"
    },
    {
        "name": "Pediatric Vaccination",
        "record": "Patient: Baby Emma (6 months)\nPediatric Visit\nVaccination: DTaP, Hepatitis B, Rotavirus\nReaction: None, tolerated well\nNext appointment: 9 months"
    },
    {
        "name": "X-Ray Report",
        "record": "Patient: Christopher White\nX-Ray: Chest PA and Lateral\nFindings: Clear lung fields, normal cardiac silhouette\nImpression: No acute cardiopulmonary disease\nRadiology sign-off: Dr. Stevens"
    }
]

def run_scenario(scenario):
    """Run a single anchor scenario"""
    print(f"\n🔗 Anchoring: {scenario['name']}")
    print("-" * 40)
    try:
        result = sdk.secure_patient_record(
            scenario["record"], 
            test_seed, 
            encrypt_first=True, 
            fiat_mode=False
        )
        print(f"✅ Success! Hash: {result['hash'][:32]}...")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_all_scenarios():
    """Run all test scenarios"""
    print("=" * 50)
    print("🏥 S4 LEDGER - DEFENSE RECORD ANCHORING TEST")
    print("=" * 50)
    
    success_count = 0
    for scenario in scenarios:
        if run_scenario(scenario):
            success_count += 1
    
    print("\n" + "=" * 50)
    print(f"📊 RESULTS: {success_count}/{len(scenarios)} scenarios completed successfully")
    print("=" * 50)
    print("\n🌐 View your metrics at: https://s4ledger.com/metrics.html")
    print("🔍 View transactions at: https://s4ledger.com/transactions.html")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Run specific number of scenarios
        count = int(sys.argv[1])
        print(f"Running {count} scenarios...")
        for scenario in scenarios[:count]:
            run_scenario(scenario)
    else:
        # Run all scenarios
        run_all_scenarios()

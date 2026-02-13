import argparse
from s4_sdk import S4SDK

parser = argparse.ArgumentParser(description="S4 Ledger CLI Tool")
parser.add_argument("--anchor", help="Anchor a record", type=str)
parser.add_argument("--verify", help="Verify a record hash", type=str)
parser.add_argument("--seed", help="XRPL wallet seed", type=str, required=True)
parser.add_argument("--testnet", help="Use XRPL testnet", action="store_true")
args = parser.parse_args()

sdk = S4SDK(wallet_seed=args.seed, testnet=args.testnet)

if args.anchor:
    result = sdk.secure_patient_record(record_text=args.anchor, encrypt_first=True, fiat_mode=False)
    print("Anchor result:", result)
if args.verify:
    hash_val = sdk.create_record_hash(args.verify)
    print("Record hash:", hash_val)

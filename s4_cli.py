#!/usr/bin/env python3
"""S4 Ledger CLI — Command-line tool for defense record anchoring and verification."""

import argparse
import sys
from s4_sdk import S4SDK


def main():
    parser = argparse.ArgumentParser(
        prog="s4-cli",
        description="S4 Ledger — Anchor and verify defense logistics records on XRPL",
    )
    sub = parser.add_subparsers(dest="command")

    # anchor sub-command
    p_anchor = sub.add_parser("anchor", help="Anchor a defense record to XRPL")
    p_anchor.add_argument("record", help="Record text to anchor (or - for stdin)")
    p_anchor.add_argument("--seed", required=True, help="XRPL wallet seed")
    p_anchor.add_argument("--encrypt", action="store_true", help="Encrypt before hashing")
    p_anchor.add_argument("--type", dest="record_type", default=None,
                          help="Record type (e.g., SUPPLY_CHAIN, CDRL, MAINTENANCE_3M)")
    p_anchor.add_argument("--testnet", action="store_true", default=False, help="Use XRPL testnet")

    # verify sub-command
    p_verify = sub.add_parser("verify", help="Verify a record's SHA-256 hash")
    p_verify.add_argument("record", help="Record text to hash")
    p_verify.add_argument("--expected", help="Expected hash to compare against")

    # hash sub-command
    p_hash = sub.add_parser("hash", help="Compute SHA-256 hash of a record")
    p_hash.add_argument("record", help="Record text to hash (or - for stdin)")

    args = parser.parse_args()

    if args.command == "anchor":
        record_text = sys.stdin.read() if args.record == "-" else args.record
        sdk = S4SDK(wallet_seed=args.seed, testnet=args.testnet)
        result = sdk.anchor_record(
            record_text=record_text,
            encrypt_first=args.encrypt,
            record_type=args.record_type,
        )
        print(f"Hash:    {result['hash']}")
        print(f"Type:    {result.get('record_type', 'N/A')}")
        print(f"TX:      {result['tx_results']}")

    elif args.command == "verify":
        sdk = S4SDK(testnet=False)
        computed = sdk.create_record_hash(args.record)
        print(f"Computed: {computed}")
        if args.expected:
            match = computed.lower() == args.expected.lower()
            print(f"Expected: {args.expected}")
            print(f"Match:    {'✅ YES' if match else '❌ NO'}")

    elif args.command == "hash":
        record_text = sys.stdin.read() if args.record == "-" else args.record
        sdk = S4SDK(testnet=False)
        print(sdk.create_record_hash(record_text))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()

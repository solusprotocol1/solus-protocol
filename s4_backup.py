"""
S4 Ledger — Defense Record Backup & Recovery Module
Encrypted backup/restore for defense logistics records with XRPL verification.
"""

import hashlib
import json
import time
import base64
import os
from datetime import datetime, timezone

from s4_sdk import S4SDK

BACKUP_VERSION = "2.0"


class S4LedgerBackup:
    """Encrypted backup/restore system for defense logistics record wallets."""

    def __init__(self, sdk: S4SDK | None = None, wallet_seed: str | None = None, testnet: bool = True):
        self.sdk = sdk or S4SDK(wallet_seed=wallet_seed, testnet=testnet)
        self.wallet_seed = wallet_seed or getattr(self.sdk, "wallet_seed", None)

    def export_backup(self, records: list[dict], metadata: dict | None = None,
                      encrypt: bool = True, output_path: str | None = None) -> dict:
        """Export defense records to an encrypted .s4backup file."""
        payload = {
            "version": BACKUP_VERSION,
            "created": datetime.now(timezone.utc).isoformat(),
            "record_count": len(records),
            "metadata": metadata or {},
            "records": records,
        }
        raw_json = json.dumps(payload, sort_keys=True, default=str)
        content_hash = hashlib.sha256(raw_json.encode()).hexdigest()

        if encrypt and self.sdk.cipher:
            encrypted = self.sdk.encrypt(raw_json)
        else:
            encrypted = raw_json

        backup = {
            "s4_backup_version": BACKUP_VERSION,
            "encrypted": encrypt,
            "content_hash": content_hash,
            "data": encrypted,
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }

        if output_path:
            with open(output_path, "w") as f:
                json.dump(backup, f, indent=2)

        return {"path": output_path, "hash": content_hash, "record_count": len(records), "encrypted": encrypt}

    def import_backup(self, backup_path: str | None = None, backup_data: dict | None = None) -> dict:
        """Import and verify a .s4backup file."""
        if backup_path:
            with open(backup_path, "r") as f:
                backup = json.load(f)
        elif backup_data:
            backup = backup_data
        else:
            raise ValueError("Provide backup_path or backup_data")

        data = backup["data"]
        if backup.get("encrypted") and self.sdk.cipher:
            raw_json = self.sdk.decrypt(data)
        else:
            raw_json = data

        payload = json.loads(raw_json)
        verify_hash = hashlib.sha256(raw_json.encode()).hexdigest()

        return {
            "verified": verify_hash == backup["content_hash"],
            "stored_hash": backup["content_hash"],
            "computed_hash": verify_hash,
            "record_count": payload["record_count"],
            "records": payload["records"],
            "metadata": payload.get("metadata", {}),
            "version": payload.get("version"),
        }

    def verify_against_xrpl(self, record: dict, tx_hash: str) -> dict:
        """Verify a record's hash matches what was anchored on XRPL."""
        import requests
        content_hash = hashlib.sha256(json.dumps(record, sort_keys=True, default=str).encode()).hexdigest()
        try:
            url = f"https://{'s.altnet.rippletest.net' if True else 'xrplcluster.com'}/api/v1/transactions/{tx_hash}"
            resp = requests.get(url, timeout=10)
            data = resp.json()
            memos = data.get("transaction", {}).get("Memos", [])
            memo_data = memos[0]["Memo"]["MemoData"] if memos else ""
            return {
                "record_hash": content_hash,
                "xrpl_memo": memo_data,
                "match": memo_data.lower() == content_hash.lower(),
                "tx_hash": tx_hash,
            }
        except Exception as e:
            return {"error": str(e), "record_hash": content_hash, "tx_hash": tx_hash}

    def generate_recovery_key(self, output_path: str | None = None) -> dict:
        """Generate and optionally save an encryption recovery key."""
        if not self.sdk.encryption_key:
            raise RuntimeError("No encryption key configured in SDK")
        key_b64 = base64.urlsafe_b64encode(
            self.sdk.encryption_key if isinstance(self.sdk.encryption_key, bytes)
            else self.sdk.encryption_key.encode()
        ).decode()
        recovery = {
            "type": "s4_recovery_key",
            "created": datetime.now(timezone.utc).isoformat(),
            "key": key_b64,
            "warning": "STORE SECURELY — This key can decrypt all your S4 Ledger backups.",
        }
        if output_path:
            with open(output_path, "w") as f:
                json.dump(recovery, f, indent=2)
        return {"path": output_path, "key_length": len(key_b64)}


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  S4 LEDGER — BACKUP MODULE SELF-TEST")
    print("=" * 60)

    sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)
    backup = S4LedgerBackup(sdk=sdk, wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS")

    # Sample defense records
    test_records = [
        {"type": "supply_chain_receipt", "nsn": "5340-01-234-5678", "qty": 50, "condition": "A"},
        {"type": "maintenance_3m", "mrc": "2815-1.3.7", "result": "SAT", "next_due": "2026-08"},
        {"type": "custody_transfer", "serial": "SPY-TM-2019-04472", "from": "DDG-78", "to": "NAVSEA IMA"},
    ]

    # Export
    result = backup.export_backup(test_records, metadata={"command": "SURFLANT", "classification": "CUI"})
    print(f"✅ Exported {result['record_count']} records, hash: {result['hash'][:16]}...")

    # Export to file
    export = backup.export_backup(test_records, output_path="/tmp/s4_test_backup.s4backup")
    print(f"✅ Saved to {export['path']}")

    # Import and verify
    imported = backup.import_backup(backup_path="/tmp/s4_test_backup.s4backup")
    print(f"✅ Imported {imported['record_count']} records, verified: {imported['verified']}")

    # Recovery key
    rk = backup.generate_recovery_key()
    print(f"✅ Recovery key generated ({rk['key_length']} chars)")

    print("=" * 60)

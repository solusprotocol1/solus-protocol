#!/usr/bin/env python3
"""S4 Ledger — Standalone SHA-256 hash test (defense record)."""

import hashlib

record = """NSN: 5340-01-234-5678 | Nomenclature: Valve, Gate, Carbon Steel
Condition Code: A (Serviceable) | Inspector: QA-237 J. Martinez
Contract: N00024-23-C-5501 | Depot: Norfolk Naval Shipyard
Date: 2026-02-10 | CoC: CoC-NNSY-2026-0451"""

record_hash = hashlib.sha256(record.encode()).hexdigest()
print(f"Record:\n{record}\n")
print(f"SHA-256: {record_hash}")

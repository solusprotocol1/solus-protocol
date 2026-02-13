# S4 Ledger API Examples

## Anchor a Defense Record (Python)

```python
from s4_sdk import S4Ledger

ledger = S4Ledger(wallet_seed="sYourXRPLSecret")

# Anchor a supply chain receipt
result = ledger.anchor_hash(
    data="LOT-2026-02-FASTENERS-500ea-NSN5306-NORFOLK",
    record_type="supply_chain_receipt",
    metadata={"nsn": "5306-01-234-5678", "qty": 500}
)
print(result)
```

## Verify a Record Hash (Python)

```python
result = ledger.verify_hash(
    data="LOT-2026-02-FASTENERS-500ea-NSN5306-NORFOLK",
    tx_hash="8A3F2D1B9C7E4A6D0F2B4E6A8C1D3F5B7E9A2C4D6F8B1E3A5C7D9F2B4A6E8C"
)
print(f"Verified: {result['verified']}")
print(f"Timestamp: {result['timestamp']}")
```

## Audit Log Retrieval (Python)

```python
import requests
response = requests.get('http://localhost:5050/audit')
print(response.json())
```

## Anchor a CDRL Delivery (cURL)

```bash
curl -X POST http://localhost:5050/anchor \
  -H "Content-Type: application/json" \
  -d '{
    "data": "CDRL-A003-DI-MGMT-81466-Rev3-2026-02-12.pdf",
    "record_type": "cdrl_delivery",
    "metadata": {"contract": "N00024-26-C-5500", "cdrl": "A003"}
  }'
```

## Verify a Record (cURL)

```bash
curl -X POST http://localhost:5050/verify \
  -H "Content-Type: application/json" \
  -d '{
    "data": "CDRL-A003-DI-MGMT-81466-Rev3-2026-02-12.pdf",
    "tx_hash": "F1A3B5C7D9E2F4A6B8C1D3E5F7A9B2C4D6E8F1A3B5C7D9E2F4A6B8C1D3E5F7"
  }'
```

## Batch Anchor (Python — Planned)

```python
records = [
    {"data": "MRC-4790-GTE-001-completion.json", "record_type": "maintenance_3m"},
    {"data": "LOT-2026-02-HT24-COC.pdf", "record_type": "batch_coc"},
    {"data": "CB-2026-Q1-R3-baseline.zip", "record_type": "configuration_baseline"},
]

results = ledger.anchor_batch(records)
for r in results:
    print(f"{r['record_type']}: {r['tx_hash']}")
```

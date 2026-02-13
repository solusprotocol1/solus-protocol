"""S4 Ledger — pytest unit tests for the S4 SDK (defense logistics)."""

import pytest
from s4_sdk import S4SDK

TEST_SEED = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"

@pytest.fixture
def sdk():
    return S4SDK(wallet_seed=TEST_SEED, testnet=True)

def test_create_record_hash(sdk):
    h = sdk.create_record_hash("test-record-data")
    assert isinstance(h, str) and len(h) == 64

def test_hash_empty(sdk):
    assert sdk.create_record_hash("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def test_encryption_round_trip(sdk):
    text = "CUI: NSN 5340-01-234-5678 supply chain receipt"
    encrypted = sdk.encrypt(text)
    decrypted = sdk.decrypt(encrypted)
    assert decrypted == text

def test_invalid_decrypt(sdk):
    with pytest.raises(Exception):
        sdk.decrypt("not_a_valid_encrypted_string")

def test_anchor_record(sdk):
    record = "NSN 2815-01-448-8234 | Qty: 2 | Condition: A"
    result = sdk.anchor_record(record_text=record, encrypt_first=True, fiat_mode=False)
    assert "hash" in result
    assert "tx_results" in result
    assert result["tx_results"]["fee_tx"]["meta"]["TransactionResult"] == "tesSUCCESS"

def test_anchor_with_type(sdk):
    result = sdk.anchor_record("MRC 2815-1.3.7 Oil sample SAT", encrypt_first=False, record_type="MAINTENANCE_3M")
    assert result["record_type"] == "MAINTENANCE_3M"

def test_anchor_failure():
    bad_sdk = S4SDK(wallet_seed="invalid_seed", testnet=True)
    with pytest.raises(Exception):
        bad_sdk.anchor_record(record_text="fail", encrypt_first=True, fiat_mode=False)

"""S4 Ledger — Extended pytest coverage for the S4 SDK (defense logistics)."""

import pytest
from s4_sdk import S4SDK

TEST_SEED = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"

@pytest.fixture
def sdk():
    return S4SDK(wallet_seed=TEST_SEED, testnet=True)


def test_hash_empty(sdk):
    assert sdk.create_record_hash("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def test_encrypt_decrypt_roundtrip(sdk):
    text = "CUI: CDRL A003 delivery record — Contract N00024-23-C-5501"
    encrypted = sdk.encrypt(text)
    decrypted = sdk.decrypt(encrypted)
    assert decrypted == text

def test_invalid_decrypt(sdk):
    with pytest.raises(Exception):
        sdk.decrypt("not_a_valid_encrypted_string")

def test_anchor_success(sdk):
    record = "NSN 5340-01-234-5678 | Qty: 50 | Condition: A | Depot: NNSY"
    result = sdk.anchor_record(record_text=record, encrypt_first=True, fiat_mode=False)
    assert "hash" in result
    assert "tx_results" in result
    assert result["tx_results"]["fee_tx"]["meta"]["TransactionResult"] == "tesSUCCESS"

def test_anchor_failure():
    bad_sdk = S4SDK(wallet_seed="invalid_seed", testnet=True)
    with pytest.raises(Exception):
        bad_sdk.anchor_record(record_text="fail", encrypt_first=True, fiat_mode=False)



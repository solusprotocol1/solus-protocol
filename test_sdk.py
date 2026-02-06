import pytest
from solus_sdk import SolusSDK
import hashlib

# Test data
TEST_RECORD = "Test patient record for hash integrity."
TEST_SEED = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"  # Use a valid testnet seed for integration

@pytest.fixture
def sdk():
    return SolusSDK(wallet_seed=TEST_SEED, testnet=True)

def test_create_record_hash(sdk):
    # Should match SHA-256
    expected = hashlib.sha256(TEST_RECORD.encode()).hexdigest()
    actual = sdk.create_record_hash(TEST_RECORD)
    assert actual == expected

def test_encryption_round_trip(sdk):
    encrypted = sdk.encrypt(TEST_RECORD)
    decrypted = sdk.decrypt(encrypted)
    assert decrypted == TEST_RECORD

def test_secure_patient_record(sdk):
    result = sdk.secure_patient_record(record_text=TEST_RECORD, encrypt_first=True, fiat_mode=False)
    assert 'hash' in result
    assert len(result['hash']) == 64
    assert result['tx_results']['fee_tx']['meta']['TransactionResult'] == 'tesSUCCESS'

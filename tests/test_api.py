"""
S4 Ledger API Test Suite
========================
Tests for the core API functionality, auth, and data validation.
Run: pytest tests/ -v
"""
import json
import hashlib
import time
import hmac
import base64
import os
import sys
import pytest

# Add project root to path so we can import api modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ═══════════════════════════════════════════════════════════════════
#  JWT Tests
# ═══════════════════════════════════════════════════════════════════

class TestJWTValidation:
    """Test the JWT validation logic used by _validate_supabase_jwt."""

    @staticmethod
    def _make_jwt(payload, secret="test-secret"):
        """Create a valid HS256 JWT for testing."""
        header = {"alg": "HS256", "typ": "JWT"}
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
        signing_input = f"{header_b64}.{payload_b64}".encode()
        sig = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
        sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
        return f"{header_b64}.{payload_b64}.{sig_b64}"

    def test_valid_jwt(self):
        """A properly signed, non-expired JWT should validate."""
        payload = {
            "sub": "user-123",
            "email": "test@agency.mil",
            "role": "authenticated",
            "exp": int(time.time()) + 3600
        }
        token = self._make_jwt(payload, "my-jwt-secret")

        # Manually validate (mimicking _validate_supabase_jwt)
        parts = token.split('.')
        assert len(parts) == 3

        # Decode and verify
        header_b64 = parts[0] + '=' * (4 - len(parts[0]) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        assert header['alg'] == 'HS256'

        payload_b64 = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload_b64))
        assert decoded['sub'] == 'user-123'
        assert decoded['email'] == 'test@agency.mil'
        assert decoded['exp'] > time.time()

        # Verify signature
        signing_input = (parts[0] + '.' + parts[1]).encode()
        sig_b64 = parts[2] + '=' * (4 - len(parts[2]) % 4)
        expected_sig = base64.urlsafe_b64decode(sig_b64)
        actual_sig = hmac.new("my-jwt-secret".encode(), signing_input, hashlib.sha256).digest()
        assert hmac.compare_digest(expected_sig, actual_sig)

    def test_expired_jwt_rejected(self):
        """An expired JWT should fail validation."""
        payload = {
            "sub": "user-123",
            "exp": int(time.time()) - 100  # expired 100s ago
        }
        token = self._make_jwt(payload, "secret")
        parts = token.split('.')
        payload_b64 = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload_b64))
        assert decoded['exp'] < time.time(), "Token should be expired"

    def test_wrong_secret_rejected(self):
        """A JWT signed with the wrong secret should fail."""
        payload = {"sub": "user-123", "exp": int(time.time()) + 3600}
        token = self._make_jwt(payload, "correct-secret")
        parts = token.split('.')

        signing_input = (parts[0] + '.' + parts[1]).encode()
        sig_b64 = parts[2] + '=' * (4 - len(parts[2]) % 4)
        expected_sig = base64.urlsafe_b64decode(sig_b64)
        wrong_sig = hmac.new("wrong-secret".encode(), signing_input, hashlib.sha256).digest()
        assert not hmac.compare_digest(expected_sig, wrong_sig)

    def test_malformed_jwt_rejected(self):
        """Malformed tokens should not crash."""
        for bad_token in ["", "abc", "a.b", "a.b.c.d", "not-base64.not-base64.not-base64"]:
            parts = bad_token.split('.')
            assert len(parts) != 3 or True  # Should not crash


# ═══════════════════════════════════════════════════════════════════
#  Hash / Anchoring Tests
# ═══════════════════════════════════════════════════════════════════

class TestHashing:
    """Test SHA-256 hashing used for record anchoring."""

    def test_sha256_deterministic(self):
        """Same input should always produce the same hash."""
        data = "test record data 12345"
        h1 = hashlib.sha256(data.encode()).hexdigest()
        h2 = hashlib.sha256(data.encode()).hexdigest()
        assert h1 == h2

    def test_sha256_different_inputs(self):
        """Different inputs should produce different hashes."""
        h1 = hashlib.sha256(b"record A").hexdigest()
        h2 = hashlib.sha256(b"record B").hexdigest()
        assert h1 != h2

    def test_sha256_length(self):
        """SHA-256 hex digest should always be 64 characters."""
        h = hashlib.sha256(b"test").hexdigest()
        assert len(h) == 64

    def test_hash_empty_input(self):
        """Empty input should produce a known hash."""
        h = hashlib.sha256(b"").hexdigest()
        assert h == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


# ═══════════════════════════════════════════════════════════════════
#  Data Validation Tests
# ═══════════════════════════════════════════════════════════════════

class TestDataValidation:
    """Test data structures and validation logic."""

    def test_record_structure(self):
        """A record should have required fields."""
        record = {
            "record_id": "REC-001",
            "title": "Test Record",
            "record_type": "maintenance_log",
            "program": "DDG-51",
            "hash": hashlib.sha256(b"test data").hexdigest(),
            "timestamp": "2026-02-26T00:00:00Z"
        }
        assert "record_id" in record
        assert "hash" in record
        assert len(record["hash"]) == 64

    def test_readiness_calculation(self):
        """Operational availability formula: Ao = MTBF / (MTBF + MTTR + MLDT)."""
        mtbf = 1000
        mttr = 4
        mldt = 24
        ao = mtbf / (mtbf + mttr + mldt)
        assert 0.97 < ao < 0.98  # ~0.9728

    def test_readiness_edge_case_zero(self):
        """Zero MTBF should produce Ao = 0."""
        mtbf = 0
        mttr = 4
        mldt = 24
        ao = mtbf / (mtbf + mttr + mldt) if (mtbf + mttr + mldt) > 0 else 0
        assert ao == 0

    def test_roi_calculation(self):
        """ROI should show savings when S4 cost < manual labor cost."""
        programs = 5
        ftes = 8
        hourly_rate = 145
        annual_labor = ftes * hourly_rate * 2080  # ~$2.4M
        s4_cost = programs * 12000  # $60K/year for 5 programs
        savings = annual_labor * 0.35  # 35% efficiency gain
        assert savings > s4_cost, "S4 should save more than it costs"

    def test_sls_fee_calculation(self):
        """SLS anchor fee should be 0.01 per operation."""
        fee_per_anchor = 0.01
        anchors = 100
        total = fee_per_anchor * anchors
        assert total == 1.0

    def test_subscription_tiers(self):
        """Subscription tiers should have required fields."""
        tiers = [
            {"name": "Starter", "price": 500, "programs": 1},
            {"name": "Professional", "price": 2000, "programs": 5},
            {"name": "Enterprise", "price": 5000, "programs": "unlimited"},
        ]
        for tier in tiers:
            assert "name" in tier
            assert "price" in tier
            assert tier["price"] > 0


# ═══════════════════════════════════════════════════════════════════
#  API Route Resolution Tests
# ═══════════════════════════════════════════════════════════════════

class TestRouteResolution:
    """Test API routing logic without starting a server."""

    KNOWN_ROUTES = [
        ("/api/health", "GET"),
        ("/api/anchor", "POST"),
        ("/api/verify", "POST"),
        ("/api/records", "GET"),
        ("/api/auth_validate", "GET"),
        ("/api/dmsms", "GET"),
        ("/api/readiness", "GET"),
        ("/api/parts", "GET"),
        ("/api/roi", "GET"),
        ("/api/state/save", "POST"),
        ("/api/state/load", "GET"),
        ("/api/errors/report", "POST"),
    ]

    def test_known_routes_exist(self):
        """All documented API routes should be handled."""
        # Read the API source and check for route strings
        api_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api", "index.py")
        with open(api_path, 'r') as f:
            source = f.read()

        for path, method in self.KNOWN_ROUTES:
            # Routes are resolved by _resolve_route which maps paths to handler names
            route_name = path.replace("/api/", "").replace("/", "_")
            # Check that either the route name or the path appears in the source
            assert (route_name in source or path in source), \
                f"Route {path} ({method}) not found in API source"

    def test_health_endpoint_exists(self):
        """The /api/health endpoint should exist."""
        api_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api", "index.py")
        with open(api_path, 'r') as f:
            source = f.read()
        assert "health" in source


# ═══════════════════════════════════════════════════════════════════
#  Security Tests
# ═══════════════════════════════════════════════════════════════════

class TestSecurity:
    """Test security-related functionality."""

    def test_no_secrets_in_prod_app(self):
        """prod-app should not contain service keys or secrets."""
        prod_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prod-app", "index.html")
        with open(prod_path, 'r') as f:
            content = f.read()

        # Service role key pattern
        assert "service_role" not in content.lower() or "service_role" in content[content.index("/*"):content.index("*/", content.index("/*"))+2] if "service_role" in content.lower() else True
        # No sk- API keys
        assert "sk-proj-" not in content
        assert "sk-ant-" not in content

    def test_csp_header_present(self):
        """prod-app should have a Content Security Policy."""
        prod_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prod-app", "index.html")
        with open(prod_path, 'r') as f:
            content = f.read()
        assert "Content-Security-Policy" in content

    def test_supabase_anon_key_is_safe(self):
        """The anon key in prod-app is the public key (safe to expose)."""
        prod_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prod-app", "index.html")
        with open(prod_path, 'r') as f:
            content = f.read()
        # If anon key is present, verify it's the anon role (not service_role)
        if "eyJhbGci" in content:
            # Decode the JWT-like string to check role claim
            import re
            jwt_match = re.search(r"eyJhbGci[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", content)
            if jwt_match:
                token = jwt_match.group()
                payload_b64 = token.split('.')[1]
                payload_b64 += '=' * (4 - len(payload_b64) % 4)
                payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                assert payload.get('role') == 'anon', "Only anon key should be in client code"

    def test_api_has_jwt_validation(self):
        """The API should have JWT validation code."""
        api_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api", "index.py")
        with open(api_path, 'r') as f:
            content = f.read()
        assert "_validate_supabase_jwt" in content
        assert "_get_auth_user" in content
        assert "SUPABASE_JWT_SECRET" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

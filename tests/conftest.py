"""Shared fixtures for S4 Ledger test suite."""
import os
import sys
import pytest

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def project_root():
    """Return the project root directory."""
    return PROJECT_ROOT


@pytest.fixture
def prod_app_path():
    """Return path to prod-app/index.html."""
    return os.path.join(PROJECT_ROOT, "prod-app", "index.html")


@pytest.fixture
def api_path():
    """Return path to api/index.py."""
    return os.path.join(PROJECT_ROOT, "api", "index.py")


@pytest.fixture
def demo_app_path():
    """Return path to demo-app/index.html."""
    return os.path.join(PROJECT_ROOT, "demo-app", "index.html")

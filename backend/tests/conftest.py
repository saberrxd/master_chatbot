import pytest
import requests
import os

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def base_url():
    """Base URL from environment"""
    return os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')

@pytest.fixture
def admin_token(api_client, base_url):
    """Get admin token for authenticated requests"""
    response = api_client.post(f"{base_url}/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin login failed, skipping authenticated tests")

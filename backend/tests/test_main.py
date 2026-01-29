import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200


def test_websocket_endpoint_exists():
    response = client.get("/ws")
    assert response.status_code == 426  # Upgrade Required

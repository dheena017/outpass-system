
from fastapi.testclient import TestClient
import os

# Set dummy env vars for testing if not already set
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")

from main import app

client = TestClient(app)

def test_cors_preflight_allowed():
    origin = "http://localhost:5174"
    # Test allowed method
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert "POST" in response.headers["Access-Control-Allow-Methods"]
    assert "Content-Type" in response.headers["Access-Control-Allow-Headers"]
    assert "Authorization" in response.headers["Access-Control-Allow-Headers"]

def test_cors_preflight_restricted_method():
    origin = "http://localhost:5174"
    # Test restricted method (DELETE should be restricted if we remove *)
    # Wait, in the current state (with *), DELETE should be allowed.
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "DELETE",
        },
    )
    # If currently *, this will be 200. After fix, it should NOT return CORS headers for DELETE
    # CORSMiddleware returns 200 even for disallowed methods, but WITHOUT CORS headers if not allowed.
    # Actually, if the origin is allowed, it might still return 200.
    # Let's check how it behaves.
    pass

def test_cors_headers_present_on_get():
    origin = "http://localhost:5174"
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == origin

if __name__ == "__main__":
    # Just run them manually for a quick check
    print("Testing CORS preflight (allowed)...")
    test_cors_preflight_allowed()
    print("Allowed preflight passed!")

    print("Testing CORS GET...")
    test_cors_headers_present_on_get()
    print("CORS GET passed!")

    # Check current state for DELETE
    origin = "http://localhost:5174"
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "DELETE",
        },
    )
    print(f"Preflight DELETE response headers: {response.headers}")
    if "DELETE" in response.headers.get("Access-Control-Allow-Methods", ""):
        print("DELETE is currently ALLOWED (vulnerable state)")
    else:
        print("DELETE is currently NOT ALLOWED")

    # Check current state for X-Custom-Header
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Custom-Header",
        },
    )
    if "X-Custom-Header" in response.headers.get("Access-Control-Allow-Headers", ""):
        print("X-Custom-Header is currently ALLOWED (vulnerable state)")
    else:
        print("X-Custom-Header is currently NOT ALLOWED")

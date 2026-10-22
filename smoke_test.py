"""Tiny standard-library smoke test for a deployed NETRA backend."""
import json
import sys
from urllib.request import urlopen
from urllib.error import URLError

base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
try:
    with urlopen(base + "/health", timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))
        assert response.status == 200, f"Unexpected status: {response.status}"
        assert data.get("status") == "ok", f"Unexpected response: {data}"
        print("PASS: NETRA health endpoint is reachable.")
        print(data)
except (URLError, AssertionError, ValueError) as exc:
    print(f"FAIL: {exc}")
    raise SystemExit(1)

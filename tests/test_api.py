"""FastAPI /score 端點測試（example 模式，不依賴網路與資料集）。"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from chainlens.api.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_score_example_mode() -> None:
    response = client.post("/score", json={"address": "TDemoAddress", "mode": "example"})
    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["label"] in {"high", "medium", "low"}
    assert body["evidence"]
    assert body["evidence"][0]["narrative_zh"]
    assert body["evidence"][0]["motif_hits"]  # 範例圖中心必命中圖樣


def test_score_known_node_in_example_graph() -> None:
    response = client.post("/score", json={"address": "TShopA", "mode": "example"})
    assert response.status_code == 200
    assert response.json()["target"] == "TShopA"


def test_score_requires_target() -> None:
    response = client.post("/score", json={"mode": "example"})
    assert response.status_code in (400, 422)


def test_elliptic_mode_without_dataset(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from chainlens.api import main as api_main

    monkeypatch.setattr(api_main, "RAW_DIR", tmp_path / "empty")
    response = client.post("/score", json={"tx_id": "123", "mode": "elliptic"})
    assert response.status_code == 404  # 無資料集時應回 404 與說明

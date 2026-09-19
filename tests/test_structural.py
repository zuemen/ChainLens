"""GNN 模型（第二引擎）與八個 Demo 情境的鎖定測試。

招牌數字（0.7307／0.5321／0.2577／0.0962）由 test_api_web 鎖定；這裡鎖的是：
模型在劇本圖上的區間、模型只能升級不能降級、實體標註排除誤報、情境清單與 API 一致。
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from chainlens.api.main import app
from chainlens.data import scenario
from chainlens.explain.screening import MODEL_ESCALATE_THRESHOLD, screen_withdrawal
from chainlens.models.structural import FEATURE_NAMES, default_model, node_features
from chainlens.sna.motifs import detect_all

client = TestClient(app)


def test_weights_exist_and_predict_in_unit_interval() -> None:
    model = default_model()
    assert model is not None, "chainlens/models/weights/structural_sage.json 應已匯出"
    assert list(model.meta["features"]) == list(FEATURE_NAMES)
    g = scenario.load_withdrawal_scenario()
    probs = model.predict(g)
    assert set(probs) == set(g.nodes())
    assert all(0.0 <= p <= 1.0 for p in probs.values())


def test_node_features_shape() -> None:
    g = scenario.load_withdrawal_scenario(with_exchange_batch=True)
    nodes, raw = node_features(g)
    assert raw.shape == (len(nodes), len(FEATURE_NAMES))
    assert raw[nodes.index("THotWallet02"), FEATURE_NAMES.index("known_entity")] == 1.0


@pytest.mark.parametrize(
    ("flags", "node", "low", "high"),
    [
        ({}, "TOtcOut01", 0.7, 1.0),
        ({}, "TAggregator01", 0.7, 1.0),
        ({}, "TMule03", 0.7, 1.0),
        ({}, "TVictim01", 0.0, 0.4),
        ({}, "TNormalUser01", 0.0, 0.4),
        ({}, "TShopA", 0.0, 0.4),
        ({"with_relay": True}, "TRelay03", 0.7, 1.0),
        ({"with_split": True}, "TSplitOut01", 0.7, 1.0),
        ({"with_exchange_batch": True}, "TExchUser07", 0.0, 0.4),
        ({"with_exchange_batch": True}, "THotWallet02", 0.0, 0.4),
    ],
)
def test_model_bands_on_scenario_graph(flags: dict, node: str, low: float, high: float) -> None:
    model = default_model()
    assert model is not None
    p = model.predict(scenario.load_withdrawal_scenario(**flags))[node]
    assert low <= p <= high, f"{node} 模型機率 {p:.3f} 不在 [{low}, {high}]"


def test_signature_numbers_untouched_by_model() -> None:
    """模型只加註、不改分：綜合分數與單引擎完全一致。"""
    g = scenario.load_withdrawal_scenario()
    dual = screen_withdrawal(g, "TOtcOut01", 500_000)
    single = screen_withdrawal(g, "TOtcOut01", 500_000, use_model=False)
    assert dual["risk_score"] == single["risk_score"] == pytest.approx(0.7307, abs=1e-4)
    assert dual["self_score"] == pytest.approx(0.33, abs=0.01)
    assert dual["association_score"] == pytest.approx(0.60, abs=1e-4)
    assert dual["decision"] == single["decision"] == "block"
    assert dual["model"] is not None and single["model"] is None
    assert dual["model_escalated"] is False


def test_relay_escalated_by_model_only_to_review() -> None:
    g = scenario.load_withdrawal_scenario(with_relay=True)
    result = screen_withdrawal(g, scenario.RELAY_TARGET, 200_000)
    assert result["rule_decision"] == "pass"
    assert result["associations"] == [] or result["risk_score"] < 0.4
    assert result["model"]["score"] >= MODEL_ESCALATE_THRESHOLD
    assert result["model_escalated"] is True
    assert result["decision"] == "review"
    assert "GNN 模型加註" in result["decision_zh"]
    assert result["str_draft_zh"] is not None
    assert "GNN 模型意見" in result["str_draft_zh"]
    assert "五、建議處置" in result["str_draft_zh"]


def test_model_never_downgrades() -> None:
    """模型低分不能把規則的暫緩拉下來（被害人／正常用戶靠規則本來就放行，不是靠模型）。"""
    g = scenario.load_withdrawal_scenario()
    assert screen_withdrawal(g, "TMule03", 500_000)["decision"] == "block"
    assert screen_withdrawal(g, "TVictim01", 500_000)["decision"] == "pass"


def test_known_entity_exempts_batch_payout_from_motifs() -> None:
    g = scenario.load_withdrawal_scenario(with_exchange_batch=True)
    assert all(h.center != "THotWallet02" for h in detect_all(g))
    result = screen_withdrawal(g, scenario.EXCHANGE_USER_TARGET, 3_000)
    assert result["decision"] == "pass"
    # 拿掉標註 → 30 名用戶全部連坐
    h = g.copy()
    del h.nodes["THotWallet02"]["known_entity"]
    assert screen_withdrawal(h, scenario.EXCHANGE_USER_TARGET, 3_000)["decision"] != "pass"


def test_split_scenario_blocks_despite_small_amount() -> None:
    g = scenario.load_withdrawal_scenario(with_split=True)
    result = screen_withdrawal(g, scenario.SPLIT_TARGET, 9_000)
    assert result["decision"] == "block"
    assert any(h["motif"] == "fan_in" for h in result["evidence"]["motif_hits"])


def test_scenarios_endpoint_matches_screen_targets() -> None:
    body = client.get("/scenarios").json()
    assert [s["target"] for s in body] == list(scenario.SCREEN_TARGETS)
    assert [s["id"] for s in body] == list(range(1, len(body) + 1))
    for item in body:
        payload = {"target": item["target"], "amount_usdt": item["amount_usdt"]}
        r = client.post("/screen", json=payload)
        assert r.status_code == 200, item["target"]
        assert r.json()["decision"] == item["expect"], item["title_zh"]


def test_screen_returns_counterfactual_only_for_labeled_graph() -> None:
    r = client.post("/screen", json={"target": scenario.EXCHANGE_USER_TARGET, "amount_usdt": 3_000})
    cf = r.json()["counterfactual"]
    assert cf["decision"] == "block" and cf["affected_nodes"] == 30
    r = client.post("/screen", json={"target": "TOtcOut01", "amount_usdt": 500_000})
    assert r.json()["counterfactual"] is None

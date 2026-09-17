"""出金審查引擎與 50 萬 USDT 劇本圖之整合測試。"""

import networkx as nx

from chainlens.data.scenario import (
    NORMAL_TARGET,
    WITHDRAWAL_TARGET,
    load_withdrawal_scenario,
)
from chainlens.explain.screening import (
    association_score,
    find_risky_associations,
    screen_withdrawal,
)
from chainlens.sna.motifs import detect_all


def test_scenario_graph_structure():
    g = load_withdrawal_scenario()
    assert g.graph["withdrawal_target"] == WITHDRAWAL_TARGET
    assert WITHDRAWAL_TARGET in g and NORMAL_TARGET in g
    # 資金守恆概念檢查：出金地址收到的總額應為六位數規模（整合階段）
    inflow = sum(d["amount"] for _, _, d in g.in_edges(WITHDRAWAL_TARGET, data=True))
    assert inflow > 200_000
    # 每個節點都有角色標註
    assert all("role" in d for _, d in g.nodes(data=True))


def test_scenario_hits_all_four_motifs():
    g = load_withdrawal_scenario()
    motifs = {h.motif for h in detect_all(g)}
    assert motifs == {"fan_in", "fan_out", "gather_scatter", "peeling_chain"}
    # 集資主錢包須命中集散圖樣；客服收款地址須命中集資扇入
    centers = {(h.motif, h.center) for h in detect_all(g)}
    assert ("gather_scatter", "TAggregator01") in centers
    assert ("fan_in", "TSupport01") in centers


def test_two_hop_association_to_aggregator():
    """招牌情境核心：出金地址與集資主錢包存在二階資金關聯。"""
    g = load_withdrawal_scenario()
    hits = detect_all(g)
    assocs = find_risky_associations(g, WITHDRAWAL_TARGET, hits)
    by_node = {a.risky_node: a for a in assocs}
    assert "TAggregator01" in by_node
    assert by_node["TAggregator01"].distance == 2
    path = by_node["TAggregator01"].path
    assert path[0] == "TAggregator01" and path[-1] == WITHDRAWAL_TARGET
    # 路徑須為實際存在的有向邊
    assert all(g.has_edge(u, v) for u, v in zip(path, path[1:]))


def test_association_score_decay():
    from chainlens.explain.screening import Association

    assert association_score([]) == 0.0
    one = Association(risky_node="x", distance=1)
    three = Association(risky_node="y", distance=3)
    assert association_score([one, three]) == 1.0
    assert abs(association_score([three], decay=0.6) - 0.36) < 1e-9


def test_screen_blocks_suspicious_and_passes_normal():
    g = load_withdrawal_scenario()
    bad = screen_withdrawal(g, WITHDRAWAL_TARGET, 500_000, request_id="T-001")
    ok = screen_withdrawal(g, NORMAL_TARGET, 500_000)
    assert bad["decision"] == "block"
    assert bad["risk_score"] >= 0.7
    assert "2 階資金關聯" in bad["narrative_zh"]
    assert ok["decision"] == "pass"
    assert ok["str_draft_zh"] is None


def test_str_draft_contains_evidence_chain():
    g = load_withdrawal_scenario()
    result = screen_withdrawal(g, WITHDRAWAL_TARGET, 500_000, request_id="T-002")
    draft = result["str_draft_zh"]
    assert draft is not None
    for section in ["一、交易概要", "二、可疑事由", "三、資金關聯證據鏈", "五、建議處置"]:
        assert section in draft
    assert "T-002" in draft
    assert "500,000 USDT" in draft
    assert "TAggregator01" in draft  # 證據鏈需點名風險節點


def test_screening_target_not_in_graph_returns_insufficient_data():
    """全新地址（鏈上無紀錄）是最常見的正常出金：不得拋錯，應回資料不足並放行。"""
    g = load_withdrawal_scenario()
    result = screen_withdrawal(g, "TBrandNewAddress9999", 10_000)
    assert result["decision"] == "pass"
    assert result["insufficient_data"] is True
    assert result["risk_score"] == 0.0
    assert result["str_draft_zh"] is None
    assert "查無交易紀錄" in result["narrative_zh"]


def test_victims_not_blocked_by_motif_membership():
    """被害人（fan-in 來源）不得因出現在圖樣 nodes 而被連坐攔阻。"""
    g = load_withdrawal_scenario()
    victims = [n for n, d in g.nodes(data=True) if d.get("role") == "victim"]
    assert victims
    for victim in victims[:3]:
        result = screen_withdrawal(g, victim, 5_000)
        assert result["evidence"]["motif_hits"] == []  # 非圖樣中心，不計圖樣分


def test_screening_on_graph_without_motifs_passes():
    """無任何圖樣命中的乾淨圖：應放行且不產生 STR。"""
    g = nx.DiGraph()
    g.add_edge("A", "B", amount=100.0, timestamp=1_000)
    g.add_edge("B", "C", amount=50.0, timestamp=2_000)
    result = screen_withdrawal(g, "C", 1_000)
    assert result["decision"] == "pass"
    assert result["association_score"] == 0.0


def _scenario_labels() -> tuple[nx.DiGraph, dict[str, str], dict[str, list[str]]]:
    from chainlens.explain.evidence import generate_evidence, run_pipeline

    g = load_withdrawal_scenario()
    pipeline = run_pipeline(g)
    labels = {n: generate_evidence(n, g, *pipeline)["label"] for n in g.nodes()}
    roles: dict[str, list[str]] = {}
    for n, d in g.nodes(data=True):
        roles.setdefault(d.get("role"), []).append(n)
    return g, labels, roles


def test_laundering_executors_not_whitewashed():
    """車手與剝洋蔥中繼是洗錢鏈執行層，不得因非圖樣中心而被判低風險。"""
    _, labels, roles = _scenario_labels()
    for node in roles["mule"] + roles["peel"]:
        assert labels[node] != "low", f"{node} 被漂白為低風險"


def test_victims_and_normal_users_stay_low():
    """修正執行層後，被害人與正常用戶仍須維持低風險（不得連坐）。"""
    _, labels, roles = _scenario_labels()
    for node in roles["victim"] + roles["normal"]:
        assert labels[node] == "low", f"{node} 被誤判為 {labels[node]}"
    assert labels["TAggregator01"] == "high"


def test_withdrawal_target_itself_hits_no_motif():
    """招牌情境前提：出金目標本身不命中任何圖樣，只能靠關聯追溯攔下。"""
    g = load_withdrawal_scenario()
    hits = detect_all(g)
    assert all(WITHDRAWAL_TARGET not in (h.risky_nodes or [h.center]) for h in hits)

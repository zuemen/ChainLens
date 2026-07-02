"""可解釋證據產生器測試。"""

import json

import networkx as nx
import pytest

from chainlens.explain.evidence import generate_evidence, run_pipeline


def test_collector_evidence(scam_graph: nx.DiGraph) -> None:
    sna_df, partition, risk_ratios, hits = run_pipeline(scam_graph)
    ev = generate_evidence("collector", scam_graph, sna_df, partition, risk_ratios, hits)
    assert 0.0 <= ev["score"] <= 1.0
    assert ev["motif_hits"]
    assert ev["centrality_percentile"]["pagerank"] >= 50
    assert "collector" in ev["narrative_zh"]
    assert "扇入" in ev["narrative_zh"]
    json.dumps(ev, ensure_ascii=False)  # 必須可 JSON 序列化


def test_normal_node_scores_lower(scam_graph: nx.DiGraph) -> None:
    sna_df, partition, risk_ratios, hits = run_pipeline(scam_graph)
    ev_bad = generate_evidence("collector", scam_graph, sna_df, partition, risk_ratios, hits)
    ev_ok = generate_evidence("n1", scam_graph, sna_df, partition, risk_ratios, hits)
    assert ev_ok["score"] < ev_bad["score"]
    assert not ev_ok["motif_hits"]


def test_model_score_blend(scam_graph: nx.DiGraph) -> None:
    sna_df, partition, risk_ratios, hits = run_pipeline(scam_graph)
    ev = generate_evidence(
        "n1", scam_graph, sna_df, partition, risk_ratios, hits, model_score=1.0
    )
    assert ev["score"] >= 0.5
    assert "GNN" in ev["narrative_zh"]


def test_unknown_node_raises(scam_graph: nx.DiGraph) -> None:
    sna_df, partition, risk_ratios, hits = run_pipeline(scam_graph)
    with pytest.raises(KeyError):
        generate_evidence("ghost", scam_graph, sna_df, partition, risk_ratios, hits)

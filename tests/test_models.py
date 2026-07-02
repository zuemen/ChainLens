"""GNN 訓練管線測試：小型合成圖冒煙，不依賴真實資料集。"""

from pathlib import Path

import pytest

from chainlens.models import train


@pytest.mark.parametrize("model_type", ["gcn", "sage"])
def test_train_and_evaluate(model_type: str, tmp_path: Path) -> None:
    data = train.build_synthetic_data(num_nodes=60, num_features=16, seed=1)
    metrics = train.train_and_evaluate(
        data, model_type=model_type, epochs=5, hidden_dim=8, checkpoint_dir=tmp_path
    )
    assert set(metrics) == set(train.METRIC_KEYS)
    assert all(0.0 <= v <= 1.0 for v in metrics.values())
    assert (tmp_path / f"{model_type}.pt").exists()


def test_synthetic_masks_disjoint() -> None:
    data = train.build_synthetic_data(num_nodes=40, num_features=8, seed=2)
    assert not (data.train_mask & data.test_mask).any()
    assert data.train_mask.sum() > 0
    assert data.test_mask.sum() > 0


def test_unknown_model_type() -> None:
    data = train.build_synthetic_data(num_nodes=20, num_features=4)
    with pytest.raises(ValueError):
        train.train_and_evaluate(data, model_type="mlp")

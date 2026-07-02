"""GNN 訓練與評估 CLI。

- 遵守 Elliptic 官方時間切分（train <= 34 期、test >= 35 期）避免資料洩漏
- 回報 illicit 類別 Precision / Recall / F1 與 PR-AUC
- --use-sna：把 SNA 特徵（z-score）串接到原始特徵做消融比較
- data/raw 缺 Elliptic CSV 時，自動改用合成小圖冒煙驗證管線

用法：
    python -m chainlens.models.train --model sage --use-sna
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import average_precision_score, precision_recall_fscore_support
from torch_geometric.data import Data

from chainlens.data import elliptic
from chainlens.models.gcn import GCN
from chainlens.models.sage import GraphSAGE

METRIC_KEYS = ("precision", "recall", "f1", "pr_auc")


def build_synthetic_data(num_nodes: int = 60, num_features: int = 166, seed: int = 0) -> Data:
    """合成小圖（冒煙測試用）：隨機特徵、隨機邊、時間 1..49、兩類標籤。"""
    rng = np.random.default_rng(seed)
    x = torch.tensor(rng.normal(size=(num_nodes, num_features)), dtype=torch.float32)
    edge_index = torch.tensor(
        rng.integers(0, num_nodes, size=(2, num_nodes * 3)), dtype=torch.long
    )
    y = torch.tensor(rng.integers(0, 2, size=num_nodes), dtype=torch.long)
    time_step = torch.tensor(rng.integers(1, 50, size=num_nodes), dtype=torch.long)
    data = Data(x=x, edge_index=edge_index, y=y)
    data.time_step = time_step
    data.train_mask = time_step <= elliptic.TRAIN_MAX_STEP
    data.test_mask = time_step > elliptic.TRAIN_MAX_STEP
    return data


def _build_model(model_type: str, in_dim: int, hidden_dim: int) -> torch.nn.Module:
    if model_type == "gcn":
        return GCN(in_dim, hidden_dim)
    if model_type == "sage":
        return GraphSAGE(in_dim, hidden_dim)
    raise ValueError(f"未知模型類型：{model_type}")


def train_and_evaluate(
    data: Data,
    model_type: str = "sage",
    epochs: int = 200,
    hidden_dim: int = 64,
    lr: float = 0.01,
    checkpoint_dir: Path = Path("checkpoints"),
    seed: int = 42,
) -> dict[str, float]:
    """訓練並在 test_mask 上評估，回傳 illicit 類別指標並存 checkpoint。"""
    torch.manual_seed(seed)
    model = _build_model(model_type, data.x.shape[1], hidden_dim)

    train_y = data.y[data.train_mask]
    counts = torch.bincount(train_y, minlength=2).clamp(min=1).float()
    class_weight = counts.sum() / (2.0 * counts)  # 逆頻率權重，處理類別不平衡
    criterion = torch.nn.CrossEntropyLoss(weight=class_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)

    model.train()
    for _ in range(epochs):
        optimizer.zero_grad()
        logits = model(data.x, data.edge_index)
        loss = criterion(logits[data.train_mask], train_y)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        logits = model(data.x, data.edge_index)
    test_logits = logits[data.test_mask]
    probs = torch.softmax(test_logits, dim=1)[:, 1].numpy()
    preds = test_logits.argmax(dim=1).numpy()
    truth = data.y[data.test_mask].numpy()

    precision, recall, f1, _ = precision_recall_fscore_support(
        truth, preds, labels=[1], average=None, zero_division=0
    )
    pr_auc = (
        float(average_precision_score(truth, probs)) if len(np.unique(truth)) > 1 else 0.0
    )

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), checkpoint_dir / f"{model_type}.pt")
    return {
        "precision": float(precision[0]),
        "recall": float(recall[0]),
        "f1": float(f1[0]),
        "pr_auc": pr_auc,
    }


def _sna_extra_features(raw_dir: Path) -> np.ndarray:
    """對 Elliptic 圖計算 SNA 特徵並 z-score，列順序與 features CSV 對齊。"""
    from chainlens.sna.metrics import compute_sna_features

    g = elliptic.load_elliptic_graph(raw_dir, include_features=False)
    values = compute_sna_features(g).to_numpy(dtype=np.float32)
    return (values - values.mean(axis=0)) / (values.std(axis=0) + 1e-9)


def main() -> None:
    parser = argparse.ArgumentParser(description="訓練 GCN / GraphSAGE 於 Elliptic 資料集")
    parser.add_argument("--model", choices=["gcn", "sage"], default="sage")
    parser.add_argument("--use-sna", action="store_true", help="串接 SNA 特徵做消融比較")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--hidden-dim", type=int, default=64)
    parser.add_argument("--lr", type=float, default=0.01)
    args = parser.parse_args()

    if elliptic.raw_files_exist(args.raw_dir):
        extra = _sna_extra_features(args.raw_dir) if args.use_sna else None
        data = elliptic.load_elliptic_pyg(args.raw_dir, extra_features=extra)
    else:
        print(
            f"[警告] {args.raw_dir} 缺少 Elliptic CSV（見 README 的 make download-data），"
            "改用合成小圖冒煙驗證管線，指標不具意義。"
        )
        data = build_synthetic_data()

    metrics = train_and_evaluate(
        data,
        model_type=args.model,
        epochs=args.epochs,
        hidden_dim=args.hidden_dim,
        lr=args.lr,
    )
    print(f"模型={args.model} use_sna={args.use_sna} 節點={data.x.shape[0]} 特徵={data.x.shape[1]}")
    for key in METRIC_KEYS:
        print(f"  {key}: {metrics[key]:.4f}")


if __name__ == "__main__":
    main()

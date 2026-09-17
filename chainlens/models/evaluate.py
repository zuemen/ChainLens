"""載入已訓練的檢查點，在 Elliptic 官方測試期重算指標，並輸出逐時間段 F1。

用途：
- 驗證 README／網站上的模型數字可由 checkpoints/ 直接重現（不重新訓練）。
- 產出 research/results/checkpoint_eval.json，研究成果頁據此畫「逐時間段 F1」圖。

用法：uv run python -m chainlens.models.evaluate
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np

from chainlens.data import elliptic
from chainlens.models.train import METRIC_KEYS, _build_model, _evaluate_predictions

MODEL_LABELS = {
    "rf": "Random Forest",
    "sage-rmp": "GraphSAGE + RMP",
    "sage": "GraphSAGE",
    "gcn": "GCN",
}


def _per_step_f1(truth: np.ndarray, preds: np.ndarray, steps: np.ndarray) -> list[dict]:
    from sklearn.metrics import f1_score

    rows = []
    for step in sorted(np.unique(steps).tolist()):
        mask = steps == step
        rows.append(
            {
                "time_step": int(step),
                "f1": float(f1_score(truth[mask], preds[mask], pos_label=1, zero_division=0)),
                "illicit": int((truth[mask] == 1).sum()),
            }
        )
    return rows


def evaluate_checkpoints(raw_dir: Path, checkpoint_dir: Path) -> dict:
    import torch

    data = elliptic.load_elliptic_pyg(raw_dir)
    test_mask = data.test_mask.numpy()
    truth = data.y.numpy()[test_mask]
    steps = data.time_step.numpy()[test_mask]

    results = []
    for key, label in MODEL_LABELS.items():
        if key == "rf":
            path = checkpoint_dir / "rf.joblib"
            if not path.exists():
                continue
            import joblib

            model = joblib.load(path)
            x = data.x.numpy()[test_mask]
            probs = model.predict_proba(x)[:, 1]
            preds = model.predict(x)
        else:
            path = checkpoint_dir / f"{key}.pt"
            if not path.exists():
                continue
            state = torch.load(path, map_location="cpu", weights_only=True)
            in_dim = next(v for k, v in state.items() if k.endswith("weight")).shape[1]
            if in_dim != data.x.shape[1]:
                # 此檢查點是串接 SNA 特徵的消融版本，與原始特徵不相容，略過
                print(f"[略過] {key}.pt 輸入維度 {in_dim} ≠ {data.x.shape[1]}（消融檢查點）")
                continue
            hidden = next(v for k, v in state.items() if k.endswith("weight")).shape[0]
            model = _build_model(key, in_dim, hidden)
            model.load_state_dict(state)
            model.eval()
            with torch.no_grad():
                logits = model(data.x, data.edge_index)[data.test_mask]
            probs = torch.softmax(logits, dim=1)[:, 1].numpy()
            preds = logits.argmax(dim=1).numpy()

        metrics = _evaluate_predictions(truth, preds, probs)
        results.append(
            {
                "key": key,
                "label": label,
                **{name: round(metrics[name], 6) for name in METRIC_KEYS},
                "per_step": _per_step_f1(truth, preds, steps),
            }
        )
        print(label, {name: round(metrics[name], 3) for name in METRIC_KEYS})

    return {
        "generated": date.today().isoformat(),
        "dataset": "Elliptic",
        "split": f"train ≤ {elliptic.TRAIN_MAX_STEP}, test > {elliptic.TRAIN_MAX_STEP}",
        "test_nodes": int(test_mask.sum()),
        "test_illicit": int((truth == 1).sum()),
        "models": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="以既有檢查點重算 Elliptic 測試期指標")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--checkpoint-dir", type=Path, default=Path("checkpoints"))
    parser.add_argument("--out", type=Path, default=Path("research/results/checkpoint_eval.json"))
    args = parser.parse_args()

    if not elliptic.raw_files_exist(args.raw_dir):
        raise SystemExit(f"{args.raw_dir} 缺少 Elliptic CSV（見 README 的 make download-data）")
    report = evaluate_checkpoints(args.raw_dir, args.checkpoint_dir)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已寫入 {args.out}")


if __name__ == "__main__":
    main()

"""GraphSAGE 主模型：兩層 SAGEConv 節點分類器。

輸入可為原始 166 維特徵，或串接 SNA 特徵後的擴充向量（消融比較用）。
"""

from __future__ import annotations

import torch
import torch.nn.functional as functional
from torch import Tensor, nn
from torch_geometric.nn import SAGEConv


class GraphSAGE(nn.Module):
    """兩層 GraphSAGE，輸出各類別 logits。"""

    def __init__(
        self, in_dim: int, hidden_dim: int = 64, num_classes: int = 2, dropout: float = 0.5
    ) -> None:
        super().__init__()
        self.conv1 = SAGEConv(in_dim, hidden_dim)
        self.conv2 = SAGEConv(hidden_dim, num_classes)
        self.dropout = dropout

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        x = torch.relu(self.conv1(x, edge_index))
        x = functional.dropout(x, p=self.dropout, training=self.training)
        return self.conv2(x, edge_index)

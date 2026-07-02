.PHONY: setup download-data train api app test lint

setup:
	uv sync

## 需先設定 Kaggle API 憑證（~/.kaggle/kaggle.json）
download-data:
	uv run --with kaggle kaggle datasets download -d ellipticco/elliptic-data-set -p data/raw --unzip

train:
	uv run python -m chainlens.models.train --model sage --use-sna

api:
	uv run uvicorn chainlens.api.main:app --reload --port 8000

app:
	uv run streamlit run chainlens/app/workbench.py

test:
	uv run pytest -q

lint:
	uv run ruff check .

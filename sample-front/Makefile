.PHONY: help install run run-local build start start-local kill test clean lint format format-fix typecheck check fix

ENV_FILE ?= .env.local

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install     依存パッケージをインストール"
	@echo "  run         ローカル開発サーバーを起動"
	@echo "  run-local   ローカル開発サーバーを起動"
	@echo "  build       本番用バンドルをビルド"
	@echo "  start       本番モードで起動"
	@echo "  start-local ローカル env で本番モード起動"
	@echo "  test        テストを実行"
	@echo "  lint        oxlint で静的解析を実行"
	@echo "  fix         oxlint の問題を自動修正"
	@echo "  format      Prettier でフォーマットをチェック"
	@echo "  format-fix  Prettier でフォーマットを自動修正"
	@echo "  typecheck   TypeScript の型チェックを実行"
	@echo "  check       typecheck + lint + format + test をまとめて実行"
	@echo "  clean       ビルド成果物を削除"
	@echo "  kill        ポート 3000 のプロセスを停止"
	@echo "  help        このヘルプを表示"

install:
	bun install

run: run-local

run-local:
	bun run dev

build:
	bun run build

start: start-local

start-local:
	bun run start

test:
	bun run test

lint:
	bun run lint

format:
	bun run format

format-fix:
	bun run format:fix

typecheck:
	bun run typecheck

fix:
	bun run lint:fix

check: typecheck lint format test

clean:
	rm -rf dist/

kill:
	@set -a; \
	if [ -f "$(ENV_FILE)" ]; then . "$(ENV_FILE)"; fi; \
	set +a; \
	port=$${PORT:-3000}; \
	pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN); \
	if [ -n "$$pids" ]; then \
		for pid in $$pids; do \
			pgid=$$(ps -o pgid= -p $$pid | tr -d ' '); \
			if [ -n "$$pgid" ]; then kill -TERM -$$pgid 2>/dev/null || true; fi; \
			kill -TERM $$pid 2>/dev/null || true; \
		done; \
		sleep 1; \
		stubborn=$$(lsof -tiTCP:$$port -sTCP:LISTEN); \
		if [ -n "$$stubborn" ]; then kill -KILL $$stubborn 2>/dev/null || true; fi; \
	fi
